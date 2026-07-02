"use server";

import crypto from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { num, str, tsToDate } from "@/lib/firestore-utils";
import { checkoutInputSchema, type CheckoutInput } from "./schema";

/**
 * Ticketing — server actions de compra (site público, SEM login).
 *
 * ⚠️  CRÍTICO DE SEGURANÇA. Este arquivo reimplementa o algoritmo de estoque
 * das Cloud Functions (ud-app) porque o site NÃO chama `ticketingCreateOrder`
 * — ele escreve direto no Firestore via Admin SDK. Por isso o algoritmo aqui
 * precisa ser IDÊNTICO ao de CONTRACTS.md §5. Toda mutação de estoque roda em
 * transação, com TODAS as leituras antes de qualquer escrita (exigência do
 * Firestore).
 *
 * Fronteiras de confiança (CONTRACTS.md §2 e §5):
 *
 *  • EMISSÃO DE INGRESSO + ASSINATURA DE TOKEN só acontecem em Cloud Functions.
 *    O segredo HMAC (`TICKET_HMAC_SECRET`) vive só no Secret Manager das
 *    Functions e NUNCA é exposto ao site nem ao backoffice. Portanto este
 *    arquivo NÃO assina token, NÃO emite `issuedTickets` e NÃO toca no QR.
 *    Quando o pedido vira `paid`, o trigger `ticketingOnOrderPaid` (server) é
 *    quem confirma o estoque (`reserved -= qty; sold += qty`), emite os
 *    ingressos e assina os tokens.
 *
 *  • IDENTIDADE DO COMPRADOR sem login: `createOrder` gera um `accessToken`
 *    aleatório (32 bytes) e guarda SÓ `accessTokenHash = sha256(accessToken)`
 *    no pedido. O token cru NUNCA é persistido — é devolvido uma única vez e
 *    vira o segredo de URL (`/ingressos/pedido/[orderId]?t=<accessToken>`).
 *    Guardar só o hash significa que um vazamento do Firestore não expõe o
 *    acesso aos pedidos: sem o token cru, ninguém reconstrói a URL. A
 *    verificação recomputa o hash e compara em tempo constante.
 */

// Reserva enquanto `pending` — CONTRACTS.md §5.1 / `RESERVATION_TTL_MS`.
const RESERVATION_TTL_MS = 15 * 60 * 1000;

// Códigos-máquina do catálogo canônico de erros (CONTRACTS.md §4). Nunca texto
// livre pro cliente.
export type TicketErrorCode =
  | "INVALID_INPUT"
  | "QUANTITY_INVALID"
  | "EVENT_NOT_FOUND"
  | "TYPE_NOT_FOUND"
  | "LOT_NOT_FOUND"
  | "LOT_NOT_ACTIVE"
  | "SALES_NOT_STARTED"
  | "SALES_ENDED"
  | "INSUFFICIENT_STOCK"
  | "IDEMPOTENCY_CONFLICT"
  | "FORBIDDEN"
  | "ORDER_NOT_FOUND"
  | "ORDER_NOT_PENDING"
  | "RESERVATION_EXPIRED"
  | "INTERNAL";

export type CreateOrderResult =
  | {
      ok: true;
      orderId: string;
      /** Token cru — devolvido UMA vez. `null` num replay (idempotência), pois só o hash é persistido. */
      accessToken: string | null;
      amountCents: number;
      /** Expiração da reserva, epoch ms. */
      reservationExpiresAt: number;
      /** `true` se foi um replay de idempotência (pedido já existia). */
      replayed: boolean;
    }
  | { ok: false; error: TicketErrorCode };

export type SimulatePaymentResult =
  | { ok: true; orderId: string; status: "paid"; paymentRef: string; replayed: boolean }
  | { ok: false; error: TicketErrorCode };

/** Erro tipado com código-máquina; convertido em `{ ok:false, error }` na borda. */
class TicketError extends Error {
  constructor(public readonly code: TicketErrorCode) {
    super(code);
    this.name = "TicketError";
  }
}

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

/** Comparação de dois hashes hex em tempo constante. Falha segura se tamanho difere ou nulo. */
function safeHexEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
  } catch {
    return false;
  }
}

/** Hash estável de um payload — distingue replay (mesmo payload) de conflito (payload diferente). */
function requestHashOf(payload: unknown): string {
  return sha256Hex(JSON.stringify(payload));
}

function tsMs(v: unknown): number | null {
  const d = tsToDate(v);
  return d ? d.getTime() : null;
}

/**
 * Cria um pedido `pending` e RESERVA estoque (CONTRACTS.md §5.1).
 *
 * Roda UMA transação Firestore (todas as leituras antes das escritas):
 *  1. Agrega quantidade por lote (typeId+lotId) — evita oversell quando o mesmo
 *     lote aparece em itens duplicados: a checagem de capacidade é feita UMA vez
 *     por lote com a soma agregada.
 *  2. Guard de idempotência em `ticketIdempotency/reserve:{key}`.
 *  3. Valida evento publicado, tipo ativo, lote existente/ativo, janela de
 *     vendas e capacidade (`reserved + sold + soma <= quota`).
 *  4. `reserved += soma` por lote; cria `ticketOrders`; grava o guard.
 *
 * @param idempotencyKey chave estável do cliente (uuid) pra deduplicar
 * double-submit. Se omitida, uma é gerada (sem proteção cross-request).
 */
export async function createOrder(
  input: CheckoutInput,
  idempotencyKey?: string,
): Promise<CreateOrderResult> {
  const parsed = checkoutInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };
  const data = parsed.data;
  const key = (idempotencyKey && idempotencyKey.trim()) || crypto.randomUUID();

  // Agrega quantidade por (typeId, lotId) — dedupe pra checar capacidade uma vez só.
  const aggregated = new Map<string, { typeId: string; lotId: string; quantity: number }>();
  for (const item of data.items) {
    const k = `${item.typeId}::${item.lotId}`;
    const prev = aggregated.get(k);
    if (prev) prev.quantity += item.quantity;
    else aggregated.set(k, { typeId: item.typeId, lotId: item.lotId, quantity: item.quantity });
  }
  const lines = [...aggregated.values()];

  // requestHash = payload canônico (evento + linhas agregadas). Duas chamadas com
  // a mesma key mas payload diferente = IDEMPOTENCY_CONFLICT.
  const requestHash = requestHashOf({
    eventId: data.eventId,
    lines: lines
      .map((l) => ({ t: l.typeId, l: l.lotId, q: l.quantity }))
      .sort((a, b) => (a.t + a.l).localeCompare(b.t + b.l)),
  });

  // accessToken cru: 32 bytes aleatórios. Só o hash vai pro Firestore.
  const accessToken = crypto.randomBytes(32).toString("hex");
  const accessTokenHash = sha256Hex(accessToken);

  const db = adminDb;
  const eventRef = db.collection("ticketEvents").doc(data.eventId);
  const idemRef = db.collection("ticketIdempotency").doc(`reserve:${key}`);
  const orderRef = db.collection("ticketOrders").doc();

  // Refs de leitura ordenadas: idempotência, evento, tipos (únicos), lotes.
  const uniqueTypeIds = [...new Set(lines.map((l) => l.typeId))];
  const typeRefs = uniqueTypeIds.map((tid) => eventRef.collection("ticketTypes").doc(tid));
  const lotRefs = lines.map((l) =>
    eventRef.collection("ticketTypes").doc(l.typeId).collection("lots").doc(l.lotId),
  );

  try {
    const result = await db.runTransaction(async (tx) => {
      // ---- LEITURAS (todas antes de qualquer escrita) ----
      const readRefs = [idemRef, eventRef, ...typeRefs, ...lotRefs];
      const snaps = await tx.getAll(...readRefs);
      const idemSnap = snaps[0]!;
      const eventSnap = snaps[1]!;
      const typeSnaps = snaps.slice(2, 2 + typeRefs.length);
      const lotSnaps = snaps.slice(2 + typeRefs.length);

      // 1. Idempotência
      if (idemSnap.exists) {
        const idem = idemSnap.data() as Record<string, unknown>;
        if (str(idem.requestHash) === requestHash) {
          // Replay: pedido já criado. Só o hash foi guardado, então NÃO dá pra
          // devolver o accessToken cru de novo — o cliente usa o da 1ª resposta.
          const existingId = str(idem.orderId) ?? orderRef.id;
          return { replayed: true as const, orderId: existingId, amountCents: 0, expiresMs: 0 };
        }
        throw new TicketError("IDEMPOTENCY_CONFLICT");
      }

      // Evento publicado
      if (!eventSnap.exists || str((eventSnap.data() as Record<string, unknown>).status) !== "published") {
        throw new TicketError("EVENT_NOT_FOUND");
      }

      const typeById = new Map(uniqueTypeIds.map((tid, i) => [tid, typeSnaps[i]!]));
      const now = Date.now();
      const nowTs = Timestamp.now();

      type Plan = { ref: FirebaseFirestore.DocumentReference; newReserved: boolean; data: Record<string, unknown>; line: (typeof lines)[number]; typeName: string; lotName: string; unitPriceCents: number };
      const plans: Plan[] = [];
      let amountCents = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        const typeSnap = typeById.get(line.typeId)!;
        const lotSnap = lotSnaps[i]!;

        // Tipo existente + ativo
        if (!typeSnap.exists) throw new TicketError("TYPE_NOT_FOUND");
        const typeData = typeSnap.data() as Record<string, unknown>;
        if (typeData.active !== true) throw new TicketError("TYPE_NOT_FOUND");

        // Lote existente
        if (!lotSnap.exists) throw new TicketError("LOT_NOT_FOUND");
        const lot = lotSnap.data() as Record<string, unknown>;

        // Lote ativo
        if (str(lot.status) !== "active") throw new TicketError("LOT_NOT_ACTIVE");

        // Janela de vendas
        const startMs = tsMs(lot.salesStartAt);
        const endMs = tsMs(lot.salesEndAt);
        if (startMs != null && now < startMs) throw new TicketError("SALES_NOT_STARTED");
        if (endMs != null && now > endMs) throw new TicketError("SALES_ENDED");

        // Limite por pedido (opcional; `maxPerOrder` no lote se configurado)
        const maxPerOrder = num(lot.maxPerOrder);
        if (line.quantity <= 0) throw new TicketError("QUANTITY_INVALID");
        if (maxPerOrder != null && maxPerOrder > 0 && line.quantity > maxPerOrder) {
          throw new TicketError("QUANTITY_INVALID");
        }

        // Capacidade: reserved + sold + soma <= quota (checado UMA vez por lote)
        const quota = num(lot.quota) ?? 0;
        const reserved = num(lot.reserved) ?? 0;
        const sold = num(lot.sold) ?? 0;
        if (reserved + sold + line.quantity > quota) throw new TicketError("INSUFFICIENT_STOCK");

        const unitPriceCents = num(lot.priceCents) ?? 0;
        amountCents += unitPriceCents * line.quantity;

        plans.push({
          ref: lotSnap.ref,
          newReserved: reserved + sold + line.quantity >= quota, // atingiu quota → soldout
          data: lot,
          line,
          typeName: str(typeData.name) ?? "",
          lotName: str(lot.name) ?? "",
          unitPriceCents,
        });
      }

      // ---- ESCRITAS ----
      for (const p of plans) {
        const update: Record<string, unknown> = {
          reserved: FieldValue.increment(p.line.quantity),
          updatedAt: nowTs,
        };
        if (p.newReserved) update.status = "soldout";
        tx.update(p.ref, update);
      }

      const reservationExpiresAt = Timestamp.fromMillis(now + RESERVATION_TTL_MS);
      tx.set(orderRef, {
        eventId: data.eventId,
        channel: "site",
        ownerUid: null,
        buyerEmail: data.buyerEmail,
        buyerName: data.buyerName,
        buyerPhone: data.buyerPhone ?? null,
        items: plans.map((p) => ({
          typeId: p.line.typeId,
          lotId: p.line.lotId,
          typeName: p.typeName,
          lotName: p.lotName,
          unitPriceCents: p.unitPriceCents,
          quantity: p.line.quantity,
        })),
        amountCents,
        currency: "BRL",
        status: "pending",
        paymentMethod: "simulated",
        paymentRef: null,
        reservationExpiresAt,
        accessTokenHash, // só o hash — nunca o token cru
        idempotencyKey: key,
        issuedTicketIds: [],
        createdAt: nowTs,
        updatedAt: nowTs,
      });

      tx.set(idemRef, {
        scope: "createOrder",
        orderId: orderRef.id,
        requestHash,
        createdAt: nowTs,
      });

      return {
        replayed: false as const,
        orderId: orderRef.id,
        amountCents,
        expiresMs: now + RESERVATION_TTL_MS,
      };
    });

    if (result.replayed) {
      return {
        ok: true,
        orderId: result.orderId,
        accessToken: null,
        amountCents: result.amountCents,
        reservationExpiresAt: result.expiresMs,
        replayed: true,
      };
    }
    return {
      ok: true,
      orderId: result.orderId,
      accessToken,
      amountCents: result.amountCents,
      reservationExpiresAt: result.expiresMs,
      replayed: false,
    };
  } catch (err) {
    if (err instanceof TicketError) return { ok: false, error: err.code };
    console.error("[ticketing] createOrder failed", err);
    return { ok: false, error: "INTERNAL" };
  }
}

/**
 * Confirma pagamento SIMULADO de um pedido (CONTRACTS.md §5.2).
 *
 * Recomputa `sha256(accessToken)` e compara com `accessTokenHash` do pedido em
 * tempo constante — se não bater, erro genérico `FORBIDDEN` (não vaza se o
 * pedido existe).
 *
 * Em transação: exige pedido `pending` e não expirado; grava guard de
 * idempotência `ticketIdempotency/pay:{key}`; move o pedido pra `paid`
 * (+ `paidAt`, `paymentRef = "sim_"+orderId`).
 *
 * ⚠️  NÃO mexe em `reserved`/`sold` e NÃO emite ingressos. Por CONTRACTS.md §5.2,
 * a confirmação de estoque (`reserved -= qty; sold += qty`) e a emissão dos
 * `issuedTickets` (com assinatura do token) rodam no trigger server-side
 * `ticketingOnOrderPaid`, disparado por este update de status. O site não
 * duplica esse passo — duplicar causaria `reserved` negativo e `sold`
 * inflado (oversell). O site também não tem o segredo HMAC pra assinar tokens.
 */
export async function simulatePayment(
  orderId: string,
  accessToken: string,
): Promise<SimulatePaymentResult> {
  const cleanId = (orderId ?? "").trim();
  const token = (accessToken ?? "").trim();
  if (!cleanId || !token) return { ok: false, error: "FORBIDDEN" };

  const computedHash = sha256Hex(token);
  const db = adminDb;
  const orderRef = db.collection("ticketOrders").doc(cleanId);

  try {
    const result = await db.runTransaction(async (tx) => {
      const orderSnap = await tx.get(orderRef);
      // Pedido inexistente e hash divergente devolvem o MESMO erro genérico
      // (FORBIDDEN): sem esse cuidado, um atacante distinguiria "pedido existe"
      // de "não existe" sondando orderIds, sem possuir o accessToken.
      if (!orderSnap.exists) throw new TicketError("FORBIDDEN");
      const order = orderSnap.data() as Record<string, unknown>;

      // Portão de acesso: hash em tempo constante. Falha → genérico FORBIDDEN.
      if (!safeHexEqual(computedHash, str(order.accessTokenHash))) {
        throw new TicketError("FORBIDDEN");
      }

      const key = str(order.idempotencyKey) ?? cleanId;
      const payRef = db.collection("ticketIdempotency").doc(`pay:${key}`);
      const paySnap = await tx.get(payRef);

      const status = str(order.status);
      const paymentRef = `sim_${cleanId}`;

      // Replay: já pago (guard existe ou status já paid/issued) → no-op idempotente.
      if (paySnap.exists || status === "paid" || status === "issued") {
        return {
          replayed: true as const,
          paymentRef: str(order.paymentRef) ?? paymentRef,
        };
      }

      if (status !== "pending") throw new TicketError("ORDER_NOT_PENDING");

      const expiresMs = tsMs(order.reservationExpiresAt);
      if (expiresMs != null && Date.now() > expiresMs) {
        throw new TicketError("RESERVATION_EXPIRED");
      }

      const nowTs = Timestamp.now();
      // Só transiciona status. Estoque + emissão = trigger `ticketingOnOrderPaid`.
      tx.update(orderRef, {
        status: "paid",
        paidAt: nowTs,
        paymentRef,
        updatedAt: nowTs,
      });
      tx.set(payRef, {
        scope: "simulatePayment",
        orderId: cleanId,
        requestHash: sha256Hex(`pay:${cleanId}`),
        createdAt: nowTs,
      });

      return { replayed: false as const, paymentRef };
    });

    return { ok: true, orderId: cleanId, status: "paid", paymentRef: result.paymentRef, replayed: result.replayed };
  } catch (err) {
    if (err instanceof TicketError) return { ok: false, error: err.code };
    console.error("[ticketing] simulatePayment failed", err);
    return { ok: false, error: "INTERNAL" };
  }
}
