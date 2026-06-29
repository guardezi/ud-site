import "server-only";
import { unstable_cache } from "next/cache";
import { adminDb } from "@/lib/firebase/admin";
import { asArray, asRecord, num, str, tsToDate } from "@/lib/firestore-utils";

export type FantasyEntry = {
  position: number;
  userId: string;
  displayName: string;
  total: number;
};

export type FantasyRanking = {
  championshipId: number;
  computedAt: Date | null;
  entries: FantasyEntry[];
};

export async function getFantasyRanking(championshipId: number): Promise<FantasyRanking | null> {
  if (!Number.isFinite(championshipId) || championshipId <= 0) return null;
  const fn = unstable_cache(
    async () => {
      const doc = await adminDb.collection("publicFantasyRanking").doc(String(championshipId)).get();
      if (!doc.exists) return null;
      const d = doc.data() as Record<string, unknown>;
      const raw = asArray<unknown>(d.entries);
      const entries: FantasyEntry[] = raw.map((entry, index) => {
        const e = asRecord(entry) ?? {};
        return {
          position: num(e.position) ?? index + 1,
          userId: str(e.userId) ?? "",
          displayName: str(e.displayName) ?? str(e.name) ?? "—",
          total: num(e.total) ?? 0,
        };
      });
      return {
        championshipId,
        computedAt: tsToDate(d.computedAt),
        entries,
      } satisfies FantasyRanking;
    },
    [`fantasy-${championshipId}`],
    { revalidate: 300, tags: ["fantasy", `fantasy:${championshipId}`] },
  );
  return fn();
}
