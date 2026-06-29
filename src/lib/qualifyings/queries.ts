import "server-only";
import { unstable_cache } from "next/cache";
import { adminDb } from "@/lib/firebase/admin";
import { asRecord, num, str, tsToDate } from "@/lib/firestore-utils";

export type QualifyingLap = {
  driverId: number | null;
  driverName: string;
  driverNickname: string | null;
  score: number | null;
  position: number | null;
};

export type StageQualifying = {
  stageId: number;
  firstLap: QualifyingLap[];
  secondLap: QualifyingLap[];
  updatedAt: Date | null;
};

function docToLap(doc: { id: string; data: () => unknown }, fallbackPosition: number): QualifyingLap {
  const d = (doc.data() as Record<string, unknown>) ?? {};
  const driverData = asRecord(d.driver) ?? d;
  return {
    driverId: num(driverData.id) ?? num(d.driverId) ?? num(doc.id),
    driverName: str(driverData.nome) ?? str(d.nome) ?? str(d.driverName) ?? "—",
    driverNickname: str(driverData.apelido) ?? str(d.apelido) ?? null,
    score: num(d.score) ?? num(d.nota) ?? num(d.points) ?? null,
    position: num(d.position) ?? num(d.posicao) ?? fallbackPosition,
  };
}

async function readLapSubcollection(stageId: number, name: "firstLap" | "secondLap"): Promise<QualifyingLap[]> {
  const snap = await adminDb
    .collection("publicQualifyings")
    .doc(String(stageId))
    .collection(name)
    .get();
  const docs = snap.docs;
  const laps = docs.map((d, i) => docToLap(d, i + 1));
  return laps.sort((a, b) => {
    if (a.position && b.position) return a.position - b.position;
    return (b.score ?? 0) - (a.score ?? 0);
  });
}

export async function getStageQualifying(stageId: number): Promise<StageQualifying | null> {
  if (!Number.isFinite(stageId) || stageId <= 0) return null;
  const fn = unstable_cache(
    async () => {
      try {
        const headDoc = await adminDb.collection("publicQualifyings").doc(String(stageId)).get();
        if (!headDoc.exists) return null;
        const head = headDoc.data() as Record<string, unknown>;
        const [firstLap, secondLap] = await Promise.all([
          readLapSubcollection(stageId, "firstLap"),
          readLapSubcollection(stageId, "secondLap"),
        ]);
        return {
          stageId,
          firstLap,
          secondLap,
          updatedAt: tsToDate(head.updatedAt),
        } satisfies StageQualifying;
      } catch {
        return null;
      }
    },
    [`qualifying-${stageId}`],
    { revalidate: 300, tags: ["stages", `stage:${stageId}:qualifying`] },
  );
  return fn();
}
