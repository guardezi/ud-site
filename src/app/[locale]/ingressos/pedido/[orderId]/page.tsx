import type { Metadata } from "next";
import crypto from "node:crypto";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getOrderForAccess } from "@/lib/ticketing/queries";
import { formatCurrencyCents } from "@/lib/format";
import { QRCode } from "@/components/ticketing/QRCode";
import { PayButton } from "./PayButton";
import { AutoRefresh } from "./AutoRefresh";
import type { Locale } from "@/i18n/config";
import type { OrderStatus } from "@/lib/ticketing/schema";

// Estado do pedido é mutável (pending → paid → issued) e a emissão é assíncrona.
// Nunca cachear — sempre lê o estado corrente via Admin SDK.
export const dynamic = "force-dynamic";

// Página privada (link com token). Fora do índice dos buscadores.
// `referrer: no-referrer`: o accessToken viaja na query (?t=). Sem isso, se a
// página um dia renderizar qualquer subrecurso externo (<img>/<link>), o token
// vazaria no header Referer. Hoje o QR é SVG inline server-side (sem subrecurso),
// mas o guard é defesa em profundidade contra regressão.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type PageParams = Promise<{ locale: Locale; orderId: string }>;
type SearchParams = Promise<{ t?: string | string[] }>;

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

/** Compara dois hashes hex em tempo constante. Falha segura se nulo/tamanho difere. */
function safeHexEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
  } catch {
    return false;
  }
}

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: PageParams;
  searchParams: SearchParams;
}) {
  const { locale, orderId } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations("ingressos");

  const accessToken = (Array.isArray(sp.t) ? sp.t[0] : sp.t) ?? "";
  const order = await getOrderForAccess(orderId);

  // Portão de acesso: recomputa sha256(token) e compara (time-constant) com o
  // hash guardado no pedido. Sem match → 404 (não revela se o pedido existe).
  if (!order || !accessToken || !safeHexEqual(sha256Hex(accessToken), order.accessTokenHash)) {
    notFound();
  }

  const currency = order.currency || "BRL";
  const tickets = order.issuedTickets;
  const now = Date.now();
  const reservationExpired =
    order.reservationExpiresAt != null && now > new Date(order.reservationExpiresAt).getTime();

  const statusLabel = t(`order.statusLabels.${order.status}` as `order.statusLabels.${OrderStatus}`);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 lg:py-16">
      <header className="mb-8">
        <p className="eyebrow">{t("order.title")}</p>
        <h1 className="display mt-2 text-3xl text-signal lg:text-4xl">{t("order.title")}</h1>
        <p className="mt-2 text-sm text-mute">
          <span className="data text-faint">#{order.id}</span> · {t("order.status")}: {statusLabel}
        </p>
      </header>

      {/* Resumo do pedido — sempre visível */}
      <section className="card-ud border border-rail p-5">
        <h2 className="eyebrow mb-4">{t("order.summary")}</h2>
        <ul className="divide-y divide-rail">
          {order.items.map((item, i) => (
            <li key={i} className="flex items-baseline justify-between gap-4 py-2">
              <span className="text-signal">
                {item.typeName} · {item.lotName}
                <span className="text-faint"> × {item.quantity}</span>
              </span>
              <span className="data shrink-0 text-signal">
                {formatCurrencyCents(item.unitPriceCents * item.quantity, locale, currency)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between border-t border-rail pt-4">
          <span className="eyebrow">{t("order.total")}</span>
          <span className="data text-xl text-signal">
            {formatCurrencyCents(order.amountCents, locale, currency)}
          </span>
        </div>
        <p className="mt-4 text-sm text-mute">
          {t("order.buyer")}: {order.buyerName} · {order.buyerEmail}
        </p>
      </section>

      {/* Estado 1 — ingressos emitidos: renderiza cada QR */}
      {tickets.length > 0 ? (
        <section className="mt-8">
          <h2 className="eyebrow mb-4">{t("order.ticketsTitle")}</h2>
          <p className="mb-4 text-sm text-mute">{t("order.showAtGate")}</p>
          <ul className="grid gap-5 sm:grid-cols-2">
            {tickets.map((ticket, i) => (
              <li key={ticket.id} className="card-ud border border-rail p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="eyebrow">
                      {t("order.ticket")} {i + 1}
                    </p>
                    <p className="display mt-1 text-lg text-signal">{ticket.typeName}</p>
                    <p className="text-sm text-mute">
                      {t("order.holder")}: {ticket.holderName}
                    </p>
                  </div>
                  {ticket.checkedIn && (
                    <span className="rounded border border-drift px-2 py-1 text-[0.6rem] uppercase tracking-[0.16em] text-drift">
                      {t("order.checkedIn")}
                    </span>
                  )}
                </div>
                {ticket.qrToken ? (
                  <div className="mt-4 flex justify-center rounded bg-white p-3">
                    <QRCode value={ticket.qrToken} size={200} title={`${ticket.typeName} — ${ticket.holderName}`} />
                  </div>
                ) : (
                  <p className="mt-4 text-center text-sm text-faint">{t("order.processingTitle")}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : order.status === "paid" || order.status === "issued" ? (
        /* Estado 2 — pago, mas emissão ainda assíncrona: processando + auto-refresh */
        <section className="mt-8 rounded border border-rail px-4 py-8 text-center">
          <p className="display text-lg text-signal">{t("order.processingTitle")}</p>
          <p className="mt-2 text-sm text-mute">{t("order.processingHelp")}</p>
          <AutoRefresh />
        </section>
      ) : order.status === "pending" ? (
        /* Estado 3 — pendente: paga (ou avisa que a reserva expirou) */
        <section className="mt-8 rounded border border-rail px-4 py-6">
          {reservationExpired ? (
            <p className="text-signal">{t("errors.RESERVATION_EXPIRED")}</p>
          ) : (
            <>
              <p className="display text-lg text-signal">{t("order.pendingTitle")}</p>
              <p className="mb-4 mt-1 text-sm text-mute">{t("order.pendingHelp")}</p>
              <PayButton orderId={order.id} accessToken={accessToken} />
            </>
          )}
        </section>
      ) : (
        /* Estado 4 — terminal: cancelado / expirado / reembolsado */
        <section className="mt-8 rounded border border-rail px-4 py-6">
          <p className="text-signal">
            {order.status === "expired"
              ? t("order.expired")
              : order.status === "refunded"
                ? t("order.refunded")
                : t("order.cancelled")}
          </p>
        </section>
      )}
    </div>
  );
}
