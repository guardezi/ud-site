import "server-only";
import { unstable_cache } from "next/cache";
import { adminDb } from "@/lib/firebase/admin";
import { asArray, asRecord, num, str, tsToDate } from "@/lib/firestore-utils";

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
