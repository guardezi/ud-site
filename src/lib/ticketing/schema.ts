/**
 * Ticketing — tipos serializáveis de catálogo + schema Zod do checkout.
 *
 * Fonte única de verdade dos contratos:
 *   ud-app/docs/ticketing/CONTRACTS.md
 *
 * Convenções (CONTRACTS.md §"Convenções globais"):
 * - camelCase nos campos.
 * - Dinheiro SEMPRE em centavos (int). `currency` sempre "BRL".
 * - Coleções com prefixo `ticket*` — NÃO colidir com `events` (corrida).
 *
 * Os tipos abaixo são o shape *serializável* que `queries.ts` devolve pros
 * server components (datas como `Date | null`; lembrando que `unstable_cache`
 * serializa em JSON, então no consumer viram string ISO — use os helpers de
 * `@/lib/format`).
 */
import { z } from "zod";

export type LotStatus = "active" | "paused" | "soldout";
export type TicketEventStatus = "draft" | "published" | "archived";
export type OrderStatus =
  | "pending"
  | "paid"
  | "issued"
  | "cancelled"
  | "expired"
  | "refunded";
export type TicketStatus = "issued" | "checkedIn" | "cancelled" | "refunded";

/** Lote (onde mora o estoque) — CONTRACTS.md §1 `lots/{lotId}`. */
export type PublicLot = {
  id: string;
  name: string;
  status: LotStatus;
  priceCents: number;
  quota: number;
  reserved: number;
  sold: number;
  /** `quota - reserved - sold`, clamped em 0. Só p/ exibição — a verdade é a transação. */
  available: number;
  /** Limite de unidades por pedido deste lote (`null` = sem limite explícito). */
  maxPerOrder: number | null;
  salesStartAt: Date | null;
  salesEndAt: Date | null;
  sortOrder: number;
};

/** Tipo de ingresso — CONTRACTS.md §1 `ticketTypes/{typeId}`. */
export type PublicTicketType = {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  lots: PublicLot[];
};

/** Evento (catálogo, leitura pública) — CONTRACTS.md §1 `ticketEvents/{eventId}`. */
export type PublicTicketEventSummary = {
  id: string;
  name: string;
  slug: string;
  status: TicketEventStatus;
  venue: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  heroImagePath: string | null;
  heroImageUrl: string | null;
  currency: "BRL";
};

export type PublicTicketEvent = PublicTicketEventSummary & {
  ticketTypes: PublicTicketType[];
};

/** Item denormalizado de pedido — CONTRACTS.md §1 `OrderItem`. */
export type PublicOrderItem = {
  typeId: string;
  lotId: string;
  typeName: string;
  lotName: string;
  unitPriceCents: number;
  quantity: number;
};

/** Ingresso emitido, projeção pública p/ a página de pedido — CONTRACTS.md §1 `issuedTickets`. */
export type PublicIssuedTicket = {
  id: string;
  typeId: string;
  lotId: string;
  typeName: string;
  holderName: string;
  status: TicketStatus;
  checkedIn: boolean;
  /** Token compacto assinado pela Cloud Function; conteúdo bruto do QR. `null` até a emissão. */
  qrToken: string | null;
};

/**
 * Pedido bruto retornado por `getOrderForAccess` (SEM checagem de token — o
 * caller recomputa o hash e compara). Inclui `accessTokenHash` justamente pra
 * o caller poder comparar em tempo constante.
 */
export type OrderForAccess = {
  id: string;
  eventId: string;
  status: OrderStatus;
  channel: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string | null;
  items: PublicOrderItem[];
  amountCents: number;
  currency: string;
  paymentRef: string | null;
  reservationExpiresAt: Date | null;
  paidAt: Date | null;
  createdAt: Date | null;
  /** Hash sha256 do accessToken (o token cru NUNCA é persistido). O caller compara. */
  accessTokenHash: string | null;
  issuedTickets: PublicIssuedTicket[];
};

// ---------------------------------------------------------------------------
// Checkout input (Zod) — validado no server antes da transação de estoque.
// ---------------------------------------------------------------------------

/**
 * Tetos rígidos no endpoint público (sem login): limitam exaustão de
 * reserva/scalping — um request anônimo não pode travar um lote inteiro.
 * O `maxPerOrder` do lote (quando presente) ainda aperta mais no server.
 */
export const MAX_QTY_PER_ITEM = 10;
export const MAX_ITEMS_PER_ORDER = 20;

export const checkoutItemSchema = z.object({
  typeId: z.string().min(1),
  lotId: z.string().min(1),
  quantity: z.number().int().min(1).max(MAX_QTY_PER_ITEM),
});

export const checkoutInputSchema = z.object({
  eventId: z.string().min(1),
  items: z.array(checkoutItemSchema).min(1).max(MAX_ITEMS_PER_ORDER),
  buyerName: z.string().trim().min(1).max(200),
  buyerEmail: z.email(),
  buyerPhone: z.string().trim().min(1).max(40).optional(),
});

export type CheckoutInput = z.infer<typeof checkoutInputSchema>;
export type CheckoutItem = z.infer<typeof checkoutItemSchema>;
