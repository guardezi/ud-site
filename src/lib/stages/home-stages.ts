import "server-only";
import { unstable_cache } from "next/cache";
import { adminDb } from "@/lib/firebase/admin";
import { asArray, str } from "@/lib/firestore-utils";
import { getCircuitById, type PublicCircuit } from "@/lib/circuits/queries";
import { listStageHubs, type PublicStageHubSummary } from "./queries";

/**
 * Etapas da Home ("Próxima etapa" + "Todas as etapas"), nas mesmas fontes que
 * o Event Hub do ud-app usa (lib/services/event_hub_service.dart):
 *
 * - `stageHubs` (módulo Eventos do ud-backoffice): nome, datas, circuitId,
 *   championshipId, stageId → aqui via `listStageHubs` (já usado em /etapas).
 * - `circuits/{circuitId}`: nome do autódromo e cidade.
 * - Cronograma v2: `championships/{championshipId}/stages/{stageId}/schedule`,
 *   só itens com `audience` contendo `publico` (o site é anônimo). É a fonte
 *   que o app usa; `stageHubs.timetable` é legada e o app não lê mais.
 *
 * Regra de "próxima": hubs cujo último dia (`endDate ?? startDate`, data em
 * UTC — o backoffice grava YYYY-MM-DD como meia-noite UTC) ainda não acabou,
 * pelo `startDate` mais próximo. O app, no Event Hub, usa a etapa de
 * `settings/publicRound.roundId` (etapa em julgamento), que não serve pra
 * "próxima etapa" num site público — ver pergunta no PR.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export type UpcomingStage = {
  hub: PublicStageHubSummary;
  circuit: PublicCircuit | null;
  startDate: Date | null;
  endDate: Date | null;
};

export type StageScheduleEntry = {
  /** YYYY-MM-DD */
  day: string;
  /** HH:mm */
  time: string;
  /** HH:mm ou "" */
  endTime: string;
  description: string;
  location: string;
  externalUrl: string;
  category: string;
};

function toDate(v: unknown): Date | null {
  if (v == null) return null;
  const d = v instanceof Date ? v : new Date(v as string);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Etapas (stageHubs) que ainda não terminaram, da mais próxima pra mais distante. */
export async function listUpcomingStages(): Promise<UpcomingStage[]> {
  const hubs = await listStageHubs();
  const now = Date.now();
  const upcoming = hubs
    .map((hub) => ({ hub, startDate: toDate(hub.startDate), endDate: toDate(hub.endDate) }))
    .filter(({ startDate, endDate }) => {
      const ref = endDate ?? startDate;
      return ref != null && ref.getTime() + DAY_MS > now;
    })
    .sort((a, b) => (a.startDate?.getTime() ?? Infinity) - (b.startDate?.getTime() ?? Infinity));

  return Promise.all(
    upcoming.map(async (u) => ({
      ...u,
      circuit: u.hub.circuitId ? await getCircuitById(u.hub.circuitId) : null,
    })),
  );
}

// Erros propagam de dentro do cache de propósito: falha (ex. build sem
// credencial) não fica cacheada como lista vazia.
const loadSchedule = unstable_cache(
  async (championshipId: number, stageId: number): Promise<StageScheduleEntry[]> => {
    const snap = await adminDb
      .collection("championships")
      .doc(String(championshipId))
      .collection("stages")
      .doc(String(stageId))
      .collection("schedule")
      .where("audience", "array-contains", "publico")
      .get();
    return snap.docs
      .map((doc) => {
        const d = doc.data() as Record<string, unknown>;
        return {
          day: str(d.day) ?? "",
          time: str(d.time) ?? "",
          endTime: str(d.endTime) ?? "",
          description: str(d.description) ?? "",
          location: str(d.location) ?? "",
          externalUrl: str(d.externalUrl) ?? "",
          category: str(d.category) ?? "",
          audience: asArray<string>(d.audience),
        };
      })
      .filter((e) => e.day && e.description)
      .sort((a, b) => a.day.localeCompare(b.day) || a.time.localeCompare(b.time))
      .map(({ audience: _audience, ...e }) => e);
  },
  ["stage-schedule-public"],
  { revalidate: 300, tags: ["stages", "schedule"] },
);

/** Cronograma público da etapa (`audience` contém `publico`), ordenado por dia e hora. */
export async function getPublicStageSchedule(
  championshipId: number | null,
  stageId: number | null,
): Promise<StageScheduleEntry[]> {
  if (championshipId == null || stageId == null) return [];
  try {
    return await loadSchedule(championshipId, stageId);
  } catch (e) {
    console.error("[stages] getPublicStageSchedule failed:", e);
    return [];
  }
}
