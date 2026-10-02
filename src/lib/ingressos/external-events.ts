import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { str, tsToDate } from "@/lib/firestore-utils";

/**
 * `events/{id}` — etapas com link de compra externo (tycket), cadastradas no
 * admin do ud-app (CreateTicketService / EventDTO, tela admin "Ingressos").
 * É a fonte da aba Ingressos do app no modo `ticketsystem = external`.
 * NÃO confundir com `ticketEvents` (bilheteria própria) nem `stageHubs`.
 *
 * Shape (ud-app/lib/dto/event_dto.dart):
 * - `startDate` / `endDate`: Timestamp (meia-noite BRT do dia).
 * - `place`: "Piracicaba - SP" (não existe campo de nome/autódromo).
 * - `imageUrl`: path do Storage (`tickets/{id}.jpg`) ou download URL legada.
 * - `linkUrl`: link externo de compra.
 * - `isSelling`: venda aberta. Os que não estão vendendo também são listados
 *   (no app aparecem como "Em breve").
 *
 * Obs.: o PR da Home (#12) traz `src/lib/events/queries.ts` com o mesmo
 * mapeamento pro banner de próxima etapa; quando os dois entrarem, dá pra
 * unificar.
 */
export type ExternalTicketEvent = {
  id: string;
  place: string;
  startDate: Date | null;
  endDate: Date | null;
  imagePath: string | null;
  linkUrl: string | null;
  isSelling: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function docToEvent(id: string, d: Record<string, unknown>): ExternalTicketEvent {
  return {
    id,
    place: str(d.place) ?? "",
    startDate: tsToDate(d.startDate),
    endDate: tsToDate(d.endDate),
    imagePath: str(d.imageUrl),
    linkUrl: str(d.linkUrl),
    isSelling: d.isSelling === true,
  };
}

/**
 * Mesmo filtro/ordem do app (homepage_public.dart `_fetchEventsFromFirestore`):
 * só eventos que ainda não terminaram (`endDate`, senão `startDate`; sem data
 * = fora), ordenados por `startDate` asc. O app compara com "agora"; aqui o
 * último dia inteiro ainda conta (datas são meia-noite do dia), pra etapa não
 * sumir da lista no próprio domingo.
 *
 * Lê a collection inteira (poucos docs, só admin escreve) e filtra em
 * memória — sem where/orderBy, não precisa de índice.
 */
export async function listUpcomingExternalTicketEvents(): Promise<ExternalTicketEvent[]> {
  try {
    const snap = await adminDb.collection("events").limit(200).get();
    const now = Date.now();
    return snap.docs
      .map((doc) => docToEvent(doc.id, doc.data() as Record<string, unknown>))
      .filter((ev) => {
        const ref = ev.endDate ?? ev.startDate;
        return ref != null && ref.getTime() + DAY_MS > now;
      })
      .sort(
        (a, b) =>
          (a.startDate?.getTime() ?? Number.POSITIVE_INFINITY) -
          (b.startDate?.getTime() ?? Number.POSITIVE_INFINITY),
      );
  } catch (e) {
    console.error("[ingressos] listUpcomingExternalTicketEvents failed:", e);
    return [];
  }
}
