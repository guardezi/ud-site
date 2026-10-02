import "server-only";
import { unstable_cache } from "next/cache";
import { adminDb } from "@/lib/firebase/admin";
import { asArray, asRecord, num, str, tsToDate } from "@/lib/firestore-utils";
import { driverSlug } from "@/lib/utils/slug";
import { resolveActiveChampionshipId } from "@/lib/championship/queries";

// ---------------------------------------------------------------------------
// Classificação por temporada (/classificacao) — MESMA fonte e lógica do app
// (ud-app: lib/services/championship_service.dart, championship_details_dto.dart,
// components/wrappers/home_ranking_section.dart):
//
// - Temporadas = `championships` com championshipYear >= 2025, ano desc
//   (`getAllChampionships`). Mais de um campeonato no mesmo ano → fica o de
//   maior id numérico (`getChampionshipByYear`).
// - Temporada aberta por padrão = `settings/publicRound.championshipId`
//   (`resolveActiveChampionshipId`); sem ele, a mais recente.
// - Classificação = subcoleção `championships/{cid}/pilots`. Geral ("Pro" no
//   app) = `rankedForDisplay` (pontuados por championshipPosition, inscritos
//   sem ponto no fim em ordem alfabética, renumerados). Master/Rookie =
//   filtro por `driverCategory` com posição renumerada 1..N.
// - Colunas de etapa = união de `stages[]` dos pilotos (stageId), ordenada por
//   stageNumber/data; `city`/`stageNumber` vêm denormalizados pela Cloud
//   Function `writeChampionship`.
// ---------------------------------------------------------------------------

/** Primeiro ano listado — mesmo corte do app (`ChampionshipService._minYear`). */
const MIN_YEAR = 2025;

export type SeasonStage = {
  stageId: number;
  /** `stageNumber` (1ª, 2ª…) ou posição na ordem quando ausente. */
  number: number;
  city: string | null;
};

export type SeasonPilot = {
  driverId: number;
  position: number;
  name: string;
  number: number | null;
  photo: string | null;
  /** "Pro" | "Master" | "Rookie" (texto livre vindo do ud-sistema). */
  category: string;
  slug: string | null;
  totalScore: number;
  /** `stages[].finalScore` por stageId; 0/ausente = não pontuou ("—"). */
  scores: Record<number, number>;
};

export type SeasonCategory = "Pro" | "Rookie" | "Master";

export type ClassificationSeason = {
  championshipId: number;
  year: number;
  name: string;
  stages: SeasonStage[];
  /** Ordem dos botões do site legado: GERAL, ROOKIE, MASTER (só os que têm piloto). */
  categories: { key: SeasonCategory; pilots: SeasonPilot[] }[];
};

export type ClassificationSeasons = {
  seasons: ClassificationSeason[];
  activeChampionshipId: number | null;
};

type RawPilot = SeasonPilot & {
  stageMeta: { stageId: number; number: number | null; city: string | null; date: number | null }[];
};

function categoryOf(v: unknown): string {
  if (typeof v === "string") return v;
  const r = asRecord(v);
  return r ? (str(r.descricao) ?? "") : "";
}

function docToPilot(d: Record<string, unknown>): RawPilot {
  const driver = asRecord(d.driver) ?? {};
  const name = str(driver.apelido)?.trim() || str(d.driverName)?.trim() || "";
  const number = num(driver.numero);
  const scores: Record<number, number> = {};
  const stageMeta: RawPilot["stageMeta"] = [];
  for (const raw of asArray<unknown>(d.stages)) {
    const s = asRecord(raw);
    const stageId = num(s?.stageId);
    if (!s || stageId == null) continue;
    scores[stageId] = num(s.finalScore) ?? 0;
    stageMeta.push({
      stageId,
      number: num(s.stageNumber),
      city: str(s.city)?.trim() || null,
      date: tsToDate(s.date)?.getTime() ?? null,
    });
  }
  return {
    driverId: num(d.driverId) ?? 0,
    position: num(d.championshipPosition) ?? 0,
    name,
    number,
    photo: str(driver.foto),
    category: categoryOf(d.driverCategory),
    slug: name ? driverSlug({ apelido: name, numero: number }) : null,
    totalScore: num(d.totalScore) ?? 0,
    scores,
    stageMeta,
  };
}

const byName = (a: SeasonPilot, b: SeasonPilot) => a.name.localeCompare(b.name);

/** Espelha `rankedForDisplay` do app (ranking geral). */
function rankedForDisplay(pilots: SeasonPilot[]): SeasonPilot[] {
  const scored = pilots.filter((p) => p.position > 0).sort((a, b) => a.position - b.position);
  const unscored = pilots.filter((p) => p.position <= 0).sort(byName);
  let next = (scored.at(-1)?.position ?? 0) + 1;
  return [...scored, ...unscored.map((p) => ({ ...p, position: next++ }))];
}

/** Espelha `_classificationFor(category)` do app: filtra e renumera 1..N. */
function rankedInCategory(pilots: SeasonPilot[], category: string): SeasonPilot[] {
  const rank = (p: SeasonPilot) => (p.position <= 0 ? Number.MAX_SAFE_INTEGER : p.position);
  return pilots
    .filter((p) => p.category === category)
    .sort((a, b) => rank(a) - rank(b) || byName(a, b))
    .map((p, i) => ({ ...p, position: i + 1 }));
}

function seasonStages(pilots: RawPilot[]): SeasonStage[] {
  const byId = new Map<number, RawPilot["stageMeta"][number]>();
  for (const p of pilots) {
    for (const s of p.stageMeta) {
      const prev = byId.get(s.stageId);
      byId.set(s.stageId, {
        stageId: s.stageId,
        number: prev?.number ?? s.number,
        city: prev?.city ?? s.city,
        date: prev?.date ?? s.date,
      });
    }
  }
  const order = (s: { number: number | null; date: number | null; stageId: number }) =>
    [s.number ?? Number.MAX_SAFE_INTEGER, s.date ?? Number.MAX_SAFE_INTEGER, s.stageId] as const;
  return [...byId.values()]
    .sort((a, b) => {
      const [a1, a2, a3] = order(a);
      const [b1, b2, b3] = order(b);
      return a1 - b1 || a2 - b2 || a3 - b3;
    })
    .map((s, i) => ({ stageId: s.stageId, number: s.number ?? i + 1, city: s.city }));
}

async function loadSeason(championshipId: number, meta: Record<string, unknown>): Promise<ClassificationSeason> {
  const snap = await adminDb.collection("championships").doc(String(championshipId)).collection("pilots").get();
  const raw = snap.docs.map((d) => docToPilot(d.data() as Record<string, unknown>));
  const pilots: SeasonPilot[] = raw.map(({ stageMeta: _ignored, ...p }) => p);
  const present = new Set(pilots.map((p) => p.category));
  const categories: ClassificationSeason["categories"] = [];
  if (pilots.length > 0) categories.push({ key: "Pro", pilots: rankedForDisplay(pilots) });
  for (const key of ["Rookie", "Master"] as const) {
    if (present.has(key)) categories.push({ key, pilots: rankedInCategory(pilots, key) });
  }
  return {
    championshipId,
    year: num(meta.championshipYear) ?? 0,
    name: str(meta.championshipName) ?? "",
    stages: seasonStages(raw),
    categories,
  };
}

async function fetchSeasons(): Promise<ClassificationSeasons> {
  const [activeChampionshipId, snap] = await Promise.all([
    resolveActiveChampionshipId().catch(() => null),
    adminDb
      .collection("championships")
      .where("championshipYear", ">=", MIN_YEAR)
      .orderBy("championshipYear", "desc")
      .get(),
  ]);

  // Um campeonato por ano: o de maior id numérico (getChampionshipByYear).
  const byYear = new Map<number, { id: number; meta: Record<string, unknown> }>();
  for (const doc of snap.docs) {
    const meta = doc.data() as Record<string, unknown>;
    const id = num(doc.id);
    const year = num(meta.championshipYear);
    if (id == null || year == null) continue;
    const prev = byYear.get(year);
    if (!prev || id > prev.id) byYear.set(year, { id, meta });
  }
  // O vigente sempre entra, mesmo se outro campeonato do mesmo ano tiver id maior.
  if (activeChampionshipId != null) {
    const doc = snap.docs.find((d) => num(d.id) === activeChampionshipId);
    const year = doc ? num(doc.data().championshipYear) : null;
    if (doc && year != null) byYear.set(year, { id: activeChampionshipId, meta: doc.data() });
  }

  const seasons = await Promise.all(
    [...byYear.values()].sort((a, b) => num(a.meta.championshipYear)! - num(b.meta.championshipYear)!).map((c) =>
      loadSeason(c.id, c.meta),
    ),
  );
  return { seasons: seasons.filter((s) => s.categories.length > 0), activeChampionshipId };
}

// Falha de leitura não entra no cache (senão a página ficaria vazia por 5 min).
const loadSeasonsCached = unstable_cache(fetchSeasons, ["classification-seasons"], {
  revalidate: 300,
  tags: ["standings"],
});

/**
 * Temporadas (ano asc, como os botões do site legado) com a classificação de
 * cada uma. Lista vazia quando a leitura falha. Cache de 5 min, tag `standings`.
 */
export async function getClassificationSeasons(): Promise<ClassificationSeasons> {
  try {
    return await loadSeasonsCached();
  } catch (e) {
    console.error("[championship] getClassificationSeasons failed:", e);
    return { seasons: [], activeChampionshipId: null };
  }
}
