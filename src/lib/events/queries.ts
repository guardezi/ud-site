import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { str, tsToDate } from "@/lib/firestore-utils";

/**
 * `events/{id}` — eventos de ingresso cadastrados no admin do ud-app
 * (CreateTicketService / EventDTO, tela "Ingressos" do app). NÃO confundir com
 * `ticketEvents` (bilheteria própria) nem com `stageHubs` (módulo "Eventos" do
 * backoffice).
 *
 * Shape (ud-app/lib/dto/event_dto.dart):
 * - `startDate` / `endDate`: Timestamp, gravados como meia-noite (BRT) do dia.
 * - `place`: string ("Piracicaba - SP") — não existe campo de nome.
 * - `imageUrl`: path do Storage (`tickets/{id}.jpg`) ou download URL legada.
 * - `linkUrl`: link externo de compra (tycket).
 * - `isSelling`: venda aberta. Não é flag de publicação — o app lista também
 *   os que não estão vendendo (como "próximos").
 */
export type PublicRaceEvent = {
  id: string;
  place: string;
  startDate: Date | null;
  endDate: Date | null;
  imagePath: string | null;
  linkUrl: string | null;
  isSelling: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function docToEvent(id: string, d: Record<string, unknown>): PublicRaceEvent {
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
 * Próxima etapa (banner da home): entre os eventos de `events` cujo último dia
 * (`endDate`, ou `startDate` se não houver fim) ainda não terminou, o de
 * `startDate` mais próximo. Inclui evento em andamento. `null` se não houver.
 *
 * As datas são gravadas como meia-noite do dia, então o evento só "termina"
 * 24h depois da data de referência (o último dia inteiro ainda conta).
 *
 * Lê a collection inteira (poucos docs, só admin escreve) e filtra em memória:
 * sem where/orderBy, não precisa de índice. Sem cache — a home é ISR.
 */
export async function getNextRaceEvent(): Promise<PublicRaceEvent | null> {
  try {
    const snap = await adminDb.collection("events").limit(200).get();
    const now = Date.now();
    const upcoming = snap.docs
      .map((doc) => docToEvent(doc.id, doc.data() as Record<string, unknown>))
      .filter((ev) => {
        const ref = ev.endDate ?? ev.startDate;
        return ref != null && ref.getTime() + DAY_MS > now;
      })
      .sort((a, b) => (a.startDate?.getTime() ?? Infinity) - (b.startDate?.getTime() ?? Infinity));
    return upcoming[0] ?? null;
  } catch (e) {
    console.error("[events] getNextRaceEvent failed:", e);
    return null;
  }
}
