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

export async function getCurrentChampionshipStandings(): Promise<ChampionshipStandings | null> {
  try {
    const id = await getCurrentChampionshipId();
    if (!id) return null;
    const fn = unstable_cache(
      async () => {
        try {
          return await fetchStandings(id);
        } catch {
          return null;
        }
      },
      [`standings-${id}`],
      { revalidate: 300, tags: ["standings", `championship:${id}`] },
    );
    return fn();
  } catch {
    return null;
  }
}
