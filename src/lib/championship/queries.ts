import "server-only";
import { unstable_cache } from "next/cache";
import { adminDb } from "@/lib/firebase/admin";
import { asArray, asRecord, num, str, tsToDate } from "@/lib/firestore-utils";
import type { StageScoreEntry } from "@/lib/championship/stage-score";

export type StandingEntry = {
  position: number;
  driverId: number | null;
  driverName: string;
  driverNickname: string | null;
  points: number;
  byStage: Record<string, number>;
};

export type ChampionshipStandings = {
  championshipId: number | null;
  computedAt: Date | null;
  entries: StandingEntry[];
};

function asStanding(raw: unknown, index: number): StandingEntry {
  const r = asRecord(raw) ?? {};
  return {
    position: num(r.position) ?? num(r.pos) ?? index + 1,
    driverId: num(r.driverId) ?? num(r.id) ?? null,
    driverName: str(r.driverName) ?? str(r.nome) ?? str(r.name) ?? "—",
    driverNickname: str(r.apelido) ?? str(r.nickname),
    points: num(r.points) ?? num(r.total) ?? num(r.pontos) ?? 0,
    byStage:
      (asRecord(r.byStage) as Record<string, number> | null) ??
      (asRecord(r.porEtapa) as Record<string, number> | null) ??
      {},
  };
}

/**
 * Lê /publicChampionshipHistory/{id}. Forma do doc é variável (Fase 1 trata
 * vários shapes). `championshipId` pode vir do settings/publicRound.
 */
async function fetchStandings(championshipId: number): Promise<ChampionshipStandings | null> {
  const doc = await adminDb.collection("publicChampionshipHistory").doc(String(championshipId)).get();
  if (!doc.exists) return null;
  const d = doc.data() as Record<string, unknown>;
  const rawEntries = asArray<unknown>(d.entries ?? d.ranking ?? d.standings);
  return {
    championshipId,
    computedAt: tsToDate(d.computedAt) ?? tsToDate(d.updatedAt),
    entries: rawEntries.map(asStanding),
  };
}

export async function getCurrentChampionshipId(): Promise<number | null> {
  try {
    const doc = await adminDb.collection("settings").doc("publicRound").get();
    if (!doc.exists) {
      const round = await adminDb.collection("settings").doc("round").get();
      if (!round.exists) return null;
      const r = round.data() as Record<string, unknown>;
      return num(r.championshipId);
    }
    const d = doc.data() as Record<string, unknown>;
    return num(d.championshipId);
  } catch {
    return null;
  }
}

/**
 * Fallback quando o ponteiro settings/publicRound|round não expõe um
 * championshipId (ou aponta pra um campeonato sem dados): escolhe o campeonato
 * mais recente diretamente de /publicChampionshipHistory. Sem isso, /classificacao
 * cairia no snapshot do WordPress mesmo com dado vivo no Firestore.
 *
 * Critério: mais recente por computedAt/updatedAt; se nenhum doc tiver timestamp,
 * desempata pelo maior championshipId (doc id numérico = temporada mais nova).
 */
export async function getLatestChampionshipId(): Promise<number | null> {
  try {
    const snap = await adminDb.collection("publicChampionshipHistory").get();
    if (snap.empty) return null;
    let byTs: { id: number; t: number } | null = null;
    let maxId: number | null = null;
    for (const doc of snap.docs) {
      const id = num(doc.id);
      if (id === null) continue;
      maxId = maxId === null ? id : Math.max(maxId, id);
      const d = doc.data() as Record<string, unknown>;
      const ts = tsToDate(d.computedAt) ?? tsToDate(d.updatedAt);
      if (ts) {
        const t = ts.getTime();
        if (!byTs || t > byTs.t) byTs = { id, t };
      }
    }
    return byTs ? byTs.id : maxId;
  } catch {
    return null;
  }
}

function loadStandings(championshipId: number): Promise<ChampionshipStandings | null> {
  return unstable_cache(
    async () => {
      try {
        return await fetchStandings(championshipId);
      } catch {
        return null;
      }
    },
    [`standings-${championshipId}`],
    { revalidate: 300, tags: ["standings", `championship:${championshipId}`] },
  )();
}

export async function getCurrentChampionshipStandings(): Promise<ChampionshipStandings | null> {
  try {
    const pointerId = await getCurrentChampionshipId();
    const id = pointerId ?? (await getLatestChampionshipId());
    if (!id) return null;

    let standings = await loadStandings(id);

    // Ponteiro apontou pra um campeonato inexistente/vazio → tenta o mais recente.
    if ((!standings || standings.entries.length === 0) && pointerId) {
      const latestId = await getLatestChampionshipId();
      if (latestId && latestId !== id) {
        standings = await loadStandings(latestId);
      }
    }
    return standings;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Classificação do campeonato vigente — MESMA lógica da home do ud-app
// (lib/services/championship_service.dart + lib/dto/championship_details_dto.dart):
//
// 1. Campeonato vigente = `settings/publicRound.championshipId` (ou
//    `campeonatoId`), sem fallback (resolveActiveChampionshipId).
// 2. Metadados em `championships/{cid}` (championshipName/Year).
// 3. Classificação em `championships/{cid}/pilots` (1 doc por piloto):
//    pontuados (championshipPosition > 0) por posição; inscritos sem ponto
//    (posição 0) no fim, em ordem alfabética, renumerados (rankedForDisplay).
// 4. Nome = driver.apelido ?? driverName; número = driver.numero; foto =
//    driver.foto (path do Storage); total = totalScore; pontos por etapa =
//    stages[i].finalScore na ordem do array.
//
// A home usa a categoria "Pro" (ranking geral, todos os pilotos).
// ---------------------------------------------------------------------------

export type ChampionshipPilot = {
  driverId: number;
  position: number;
  name: string;
  number: number | null;
  /** Path do Storage (ou URL) da foto do piloto — `driver.foto`. */
  photo: string | null;
  category: string;
  totalScore: number;
  /** `stages[i].finalScore`, na ordem gravada pela Cloud Function. */
  stageScores: number[];
  /**
   * `stages[i]` com `finalScore`/`qualiPosition`/`battlePosition`, na mesma
   * ordem — entrada do `formatStageScore` ("0" = correu e zerou, null = "—").
   */
  stageEntries: StageScoreEntry[];
};

export type ChampionshipClassification = {
  championshipId: number;
  name: string;
  year: number | null;
  pilots: ChampionshipPilot[];
};

/** Espelha `resolveActiveChampionshipId` do app (lib/services/settings_service.dart). */
export async function resolveActiveChampionshipId(): Promise<number | null> {
  const snap = await adminDb.collection("settings").doc("publicRound").get();
  const d = snap.data() as Record<string, unknown> | undefined;
  if (!d) return null;
  return num(d.championshipId) ?? num(d.campeonatoId);
}

function docToPilot(d: Record<string, unknown>): ChampionshipPilot {
  const driver = asRecord(d.driver) ?? {};
  const category = asRecord(d.driverCategory);
  return {
    driverId: num(d.driverId) ?? 0,
    position: num(d.championshipPosition) ?? 0,
    name: str(driver.apelido)?.trim() || str(d.driverName)?.trim() || "",
    number: num(driver.numero),
    photo: str(driver.foto),
    category: category ? (str(category.descricao) ?? "") : (str(d.driverCategory) ?? ""),
    totalScore: num(d.totalScore) ?? 0,
    stageScores: asArray<unknown>(d.stages).map((s) => num(asRecord(s)?.finalScore) ?? 0),
    stageEntries: asArray<unknown>(d.stages).map((s) => {
      const r = asRecord(s) ?? {};
      return { finalScore: r.finalScore, qualiPosition: r.qualiPosition, battlePosition: r.battlePosition };
    }),
  };
}

/** Espelha `rankedForDisplay` do app. */
function rankedForDisplay(pilots: ChampionshipPilot[]): ChampionshipPilot[] {
  const scored = pilots.filter((p) => p.position > 0).sort((a, b) => a.position - b.position);
  const unscored = pilots.filter((p) => p.position <= 0).sort((a, b) => a.name.localeCompare(b.name));
  let next = (scored.at(-1)?.position ?? 0) + 1;
  return [...scored, ...unscored.map((p) => ({ ...p, position: next++ }))];
}

/**
 * Classificação geral do campeonato vigente, como a home do app monta.
 * `null` quando não há campeonato vigente, o doc não existe ou a leitura falha.
 * Sem cache: a home é ISR e a leitura roda no request/revalidate.
 */
export async function getActiveChampionshipClassification(): Promise<ChampionshipClassification | null> {
  try {
    const cid = await resolveActiveChampionshipId();
    if (cid == null) return null;
    const ref = adminDb.collection("championships").doc(String(cid));
    const [metaSnap, pilotsSnap] = await Promise.all([ref.get(), ref.collection("pilots").get()]);
    if (!metaSnap.exists) return null;
    const meta = metaSnap.data() as Record<string, unknown>;
    return {
      championshipId: cid,
      name: str(meta.championshipName) ?? "",
      year: num(meta.championshipYear),
      pilots: rankedForDisplay(
        pilotsSnap.docs.map((doc) => docToPilot(doc.data() as Record<string, unknown>)),
      ),
    };
  } catch (e) {
    console.error("[championship] getActiveChampionshipClassification failed:", e);
    return null;
  }
}
