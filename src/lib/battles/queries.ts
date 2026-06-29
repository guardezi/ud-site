import "server-only";
import { unstable_cache } from "next/cache";
import { adminDb } from "@/lib/firebase/admin";
import { num, str, tsToDate } from "@/lib/firestore-utils";

export const BATTLE_PHASES = [
  "qualify",
  "roundof32",
  "roundof16",
  "quarterfinals",
  "semifinals",
  "final",
] as const;
export type BattlePhase = (typeof BATTLE_PHASES)[number];

export type PublicBattle = {
  id: string;
  rodada: number | null;
  idPiloto1: number | null;
  piloto1: string | null;
  nomePiloto1: string | null;
  idPiloto2: number | null;
  piloto2: string | null;
  nomePiloto2: string | null;
  vencedor: string | null;
  vencedorId: number | null;
  status: string | null;
  repescagem: boolean;
};

export type StageBracket = {
  stageId: number;
  phases: Partial<Record<BattlePhase, PublicBattle[]>>;
  updatedAt: Date | null;
};

function docToBattle(id: string, d: Record<string, unknown>): PublicBattle {
  return {
    id,
    rodada: num(d.rodada),
    idPiloto1: num(d.idPiloto1),
    piloto1: str(d.piloto1),
    nomePiloto1: str(d.nomePiloto1),
    idPiloto2: num(d.idPiloto2),
    piloto2: str(d.piloto2),
    nomePiloto2: str(d.nomePiloto2),
    vencedor: str(d.vencedor) ?? str(d.vencedorBatalha),
    vencedorId: num(d.idVencedor),
    status: str(d.status),
    repescagem: d.repescagem === true,
  };
}

async function readPhase(stageId: number, phase: BattlePhase): Promise<PublicBattle[]> {
  const snap = await adminDb
    .collection("publicBattles")
    .doc(String(stageId))
    .collection("phases")
    .doc(phase)
    .collection("battle")
    .orderBy("rodada", "asc")
    .get();
  return snap.docs.map((d) => docToBattle(d.id, d.data() as Record<string, unknown>));
}

export async function getStageBracket(stageId: number): Promise<StageBracket | null> {
  if (!Number.isFinite(stageId) || stageId <= 0) return null;
  const fn = unstable_cache(
    async () => {
      try {
        const head = await adminDb.collection("publicBattles").doc(String(stageId)).get();
        if (!head.exists) return null;
        const headData = head.data() as Record<string, unknown>;

        const phases: Partial<Record<BattlePhase, PublicBattle[]>> = {};
        const results = await Promise.all(
          BATTLE_PHASES.map(async (phase) => [phase, await readPhase(stageId, phase)] as const),
        );
        for (const [phase, battles] of results) {
          if (battles.length > 0) phases[phase] = battles;
        }

        return {
          stageId,
          phases,
          updatedAt: tsToDate(headData.updatedAt),
        } satisfies StageBracket;
      } catch {
        return null;
      }
    },
    [`bracket-${stageId}`],
    { revalidate: 300, tags: ["stages", `stage:${stageId}:bracket`] },
  );
  return fn();
}
