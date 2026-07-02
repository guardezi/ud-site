import "server-only";
import { unstable_cache } from "next/cache";
import { adminDb } from "@/lib/firebase/admin";
import { imageMedium } from "@/lib/firebase/image-variants";
import { num, str, tsToDate } from "@/lib/firestore-utils";
import type {
  LotStatus,
  OrderForAccess,
  OrderStatus,
  PublicIssuedTicket,
  PublicLot,
  PublicOrderItem,
  PublicTicketEvent,
  PublicTicketEventSummary,
  PublicTicketType,
  TicketStatus,
} from "./schema";

/**
 * Ticketing — leitura de catálogo e de pedidos (Admin SDK, server-only).
 *
 * Espelha o padrão de `@/lib/stages/queries.ts`: `unstable_cache` + `adminDb`
 * + helpers de `@/lib/firestore-utils`. Fonte dos contratos:
 * ud-app/docs/ticketing/CONTRACTS.md.
 *
 * Catálogo é leitura pública (CONTRACTS.md §6) — só eventos `published`.
 * Estoque (`reserved`/`sold`/`quota`) é legível, mas NUNCA escrito aqui;
 * escrita de estoque só em transação no server action (`actions.ts`).
 */

const CACHE_TAG = "ticketing";

function docToLot(id: string, d: Record<string, unknown>): PublicLot {
  const quota = num(d.quota) ?? 0;
  const reserved = num(d.reserved) ?? 0;
  const sold = num(d.sold) ?? 0;
  return {
    id,
    name: str(d.name) ?? "",
    status: ((str(d.status) as LotStatus) ?? "paused") || "paused",
    priceCents: num(d.priceCents) ?? 0,
    quota,
    reserved,
    sold,
    available: Math.max(0, quota - reserved - sold),
    maxPerOrder: num(d.maxPerOrder),
    salesStartAt: tsToDate(d.salesStartAt),
    salesEndAt: tsToDate(d.salesEndAt),
    sortOrder: num(d.sortOrder) ?? 0,
  };
}

function docToEventSummary(id: string, d: Record<string, unknown>): PublicTicketEventSummary {
  const heroImagePath = str(d.heroImagePath);
  return {
    id,
    name: str(d.name) ?? "Evento",
    slug: str(d.slug) ?? id,
    status: "published",
    venue: str(d.venue),
    startsAt: tsToDate(d.startsAt),
    endsAt: tsToDate(d.endsAt),
    heroImagePath,
    heroImageUrl: imageMedium(heroImagePath),
    currency: "BRL",
  };
}

/** `true` se o lote está vendável agora: status active + dentro da janela de vendas. */
function lotIsOnSale(lot: PublicLot, now: number): boolean {
  if (lot.status !== "active") return false;
  if (lot.salesStartAt && now < lot.salesStartAt.getTime()) return false;
  if (lot.salesEndAt && now > lot.salesEndAt.getTime()) return false;
  return true;
}

/**
 * Lista eventos publicados, ordenados por início (upcoming primeiro). Cap 100.
 * Só metadados — sem tipos/lotes (use `getPublishedEventBySlug` p/ o detalhe).
 */
export const listPublishedEvents = unstable_cache(
  async (): Promise<PublicTicketEventSummary[]> => {
    try {
      const snap = await adminDb
        .collection("ticketEvents")
        .where("status", "==", "published")
        .orderBy("startsAt", "asc")
        .limit(100)
        .get();
      console.error(
        "[ticketing-debug] docs:", snap.size,
        "| projectId:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        "| appProject:", adminDb.app?.options?.projectId,
      );
      return snap.docs.map((doc) => docToEventSummary(doc.id, doc.data() as Record<string, unknown>));
    } catch (e) {
      console.error("[ticketing] listPublishedEvents failed:", e);
      return [];
    }
  },
  ["ticketing-published-events"],
  { revalidate: 300, tags: [CACHE_TAG, "ticket-events"] },
);

/**
 * Detalhe de um evento publicado por slug, com `ticketTypes` ativos e seus
 * `lots` vendáveis (status active + dentro da janela salesStart/End).
 *
 * A avaliação da janela usa `Date.now()` no momento do cache — como é cacheado
 * (revalidate 60s), pode ficar levemente stale. Tudo bem: esta função é só p/
 * exibição; a transação em `actions.ts` é a autoridade sobre estoque/janela.
 */
export async function getPublishedEventBySlug(slug: string): Promise<PublicTicketEvent | null> {
  const clean = slug.trim();
  if (!clean) return null;
  const fn = unstable_cache(
    async (): Promise<PublicTicketEvent | null> => {
      try {
        const eventSnap = await adminDb
          .collection("ticketEvents")
          .where("slug", "==", clean)
          .where("status", "==", "published")
          .limit(1)
          .get();
        if (eventSnap.empty) return null;
        const eventDoc = eventSnap.docs[0]!;
        const summary = docToEventSummary(eventDoc.id, eventDoc.data() as Record<string, unknown>);

        const now = Date.now();
        const typesSnap = await eventDoc.ref
          .collection("ticketTypes")
          .where("active", "==", true)
          .orderBy("sortOrder", "asc")
          .get();

        const types: PublicTicketType[] = [];
        for (const typeDoc of typesSnap.docs) {
          const td = typeDoc.data() as Record<string, unknown>;
          const lotsSnap = await typeDoc.ref.collection("lots").orderBy("sortOrder", "asc").get();
          const lots = lotsSnap.docs
            .map((l) => docToLot(l.id, l.data() as Record<string, unknown>))
            .filter((lot) => lotIsOnSale(lot, now));
          if (lots.length === 0) continue; // tipo sem lote vendável agora não aparece
          types.push({
            id: typeDoc.id,
            name: str(td.name) ?? "",
            description: str(td.description),
            sortOrder: num(td.sortOrder) ?? 0,
            lots,
          });
        }

        return { ...summary, ticketTypes: types };
      } catch {
        return null;
      }
    },
    [`ticketing-event-${clean}`],
    { revalidate: 60, tags: [CACHE_TAG, `ticket-event:${clean}`] },
  );
  return fn();
}

function docToOrderItem(d: Record<string, unknown>): PublicOrderItem {
  return {
    typeId: str(d.typeId) ?? "",
    lotId: str(d.lotId) ?? "",
    typeName: str(d.typeName) ?? "",
    lotName: str(d.lotName) ?? "",
    unitPriceCents: num(d.unitPriceCents) ?? 0,
    quantity: num(d.quantity) ?? 0,
  };
}

function docToIssuedTicket(id: string, d: Record<string, unknown>): PublicIssuedTicket {
  return {
    id,
    typeId: str(d.typeId) ?? "",
    lotId: str(d.lotId) ?? "",
    typeName: str(d.typeName) ?? "",
    holderName: str(d.holderName) ?? "",
    status: ((str(d.status) as TicketStatus) ?? "issued") || "issued",
    checkedIn: d.checkedIn === true,
    qrToken: str(d.qrToken),
  };
}

/**
 * Lê o pedido bruto + seus `issuedTickets`, SEM checar o token de acesso.
 * O caller (página `/ingressos/pedido/[orderId]`) recomputa
 * `sha256(accessToken)` e compara com `accessTokenHash` em tempo constante
 * (`timingSafeEqual`) ANTES de renderizar.
 *
 * NÃO é cacheado de propósito: o estado do pedido é mutável (pending → paid →
 * issued) e os ingressos são emitidos de forma assíncrona pelo trigger
 * `ticketingOnOrderPaid`. Cachear devolveria estado velho logo após o
 * pagamento. Leitura direta via Admin SDK garante o estado corrente.
 */
export async function getOrderForAccess(orderId: string): Promise<OrderForAccess | null> {
  const clean = orderId.trim();
  if (!clean) return null;
  try {
    const orderRef = adminDb.collection("ticketOrders").doc(clean);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) return null;
    const d = orderSnap.data() as Record<string, unknown>;

    const issuedSnap = await adminDb
      .collection("issuedTickets")
      .where("orderId", "==", clean)
      .get();
    const issuedTickets = issuedSnap.docs.map((t) =>
      docToIssuedTicket(t.id, t.data() as Record<string, unknown>),
    );

    const rawItems = Array.isArray(d.items) ? (d.items as Record<string, unknown>[]) : [];
    return {
      id: orderSnap.id,
      eventId: str(d.eventId) ?? "",
      status: ((str(d.status) as OrderStatus) ?? "pending") || "pending",
      channel: str(d.channel) ?? "site",
      buyerName: str(d.buyerName) ?? "",
      buyerEmail: str(d.buyerEmail) ?? "",
      buyerPhone: str(d.buyerPhone),
      items: rawItems.map(docToOrderItem),
      amountCents: num(d.amountCents) ?? 0,
      currency: str(d.currency) ?? "BRL",
      paymentRef: str(d.paymentRef),
      reservationExpiresAt: tsToDate(d.reservationExpiresAt),
      paidAt: tsToDate(d.paidAt),
      createdAt: tsToDate(d.createdAt),
      accessTokenHash: str(d.accessTokenHash),
      issuedTickets,
    };
  } catch {
    return null;
  }
}
