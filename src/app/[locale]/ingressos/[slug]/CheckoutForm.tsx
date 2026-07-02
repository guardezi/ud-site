"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Minus, Plus } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { createOrder } from "@/lib/ticketing/actions";
import { formatCurrencyCents } from "@/lib/format";
import type { Locale } from "@/i18n/config";

export type CheckoutLot = {
  id: string;
  name: string;
  priceCents: number;
  available: number;
  maxPerOrder: number | null;
};

export type CheckoutType = {
  id: string;
  name: string;
  description: string | null;
  lots: CheckoutLot[];
};

type Props = {
  eventId: string;
  locale: Locale;
  currency: string;
  types: CheckoutType[];
};

/** Teto de unidades vendáveis por lote: menor entre disponibilidade e maxPerOrder. */
function lotCap(lot: CheckoutLot): number {
  const byMax = lot.maxPerOrder != null && lot.maxPerOrder > 0 ? lot.maxPerOrder : Infinity;
  return Math.max(0, Math.min(lot.available, byMax));
}

export function CheckoutForm({ eventId, locale, currency, types }: Props) {
  const t = useTranslations("ingressos");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Chave de idempotência estável por montagem do form — protege double-submit.
  const idempotencyKey = useRef<string>(crypto.randomUUID());
  const [qty, setQty] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  const lotById = useMemo(() => {
    const m = new Map<string, { typeId: string; lot: CheckoutLot }>();
    for (const ty of types) for (const lot of ty.lots) m.set(`${ty.id}:${lot.id}`, { typeId: ty.id, lot });
    return m;
  }, [types]);

  const setLotQty = (key: string, next: number, cap: number) => {
    const clamped = Math.max(0, Math.min(next, cap));
    setQty((prev) => ({ ...prev, [key]: clamped }));
  };

  const totalCents = useMemo(() => {
    let sum = 0;
    for (const [key, q] of Object.entries(qty)) {
      const entry = lotById.get(key);
      if (entry && q > 0) sum += entry.lot.priceCents * q;
    }
    return sum;
  }, [qty, lotById]);

  const totalUnits = useMemo(() => Object.values(qty).reduce((a, b) => a + b, 0), [qty]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const items = Object.entries(qty)
      .filter(([, q]) => q > 0)
      .map(([key, q]) => {
        const entry = lotById.get(key)!;
        return { typeId: entry.typeId, lotId: entry.lot.id, quantity: q };
      });

    if (items.length === 0) return setError(t("event.emptySelection"));
    if (!name.trim()) return setError(t("event.nameRequired"));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError(t("event.emailInvalid"));

    startTransition(async () => {
      const res = await createOrder(
        {
          eventId,
          items,
          buyerName: name.trim(),
          buyerEmail: email.trim(),
          buyerPhone: phone.trim() || undefined,
        },
        idempotencyKey.current,
      );

      if (!res.ok) {
        setError(t(`errors.${res.error}`));
        return;
      }
      if (!res.accessToken) {
        // Só ocorre em replay de idempotência (double-submit exato). Sem o token
        // cru não dá pra montar a URL — tratamos como erro genérico.
        setError(t("errors.INTERNAL"));
        return;
      }
      router.push({
        pathname: "/ingressos/pedido/[orderId]",
        params: { orderId: res.orderId },
        query: { t: res.accessToken },
      });
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <section className="space-y-4">
        <h2 className="eyebrow">{t("event.chooseTickets")}</h2>
        {types.map((ty) => (
          <div key={ty.id} className="card-ud border border-rail p-5">
            <h3 className="display text-lg text-signal">{ty.name}</h3>
            {ty.description && <p className="mt-1 text-sm text-mute">{ty.description}</p>}
            <ul className="mt-4 space-y-3">
              {ty.lots.map((lot) => {
                const key = `${ty.id}:${lot.id}`;
                const cap = lotCap(lot);
                const current = qty[key] ?? 0;
                const soldOut = cap === 0;
                return (
                  <li
                    key={lot.id}
                    className="flex flex-wrap items-center justify-between gap-3 border-t border-rail pt-3 first:border-t-0 first:pt-0"
                  >
                    <div>
                      <p className="text-signal">{lot.name}</p>
                      <p className="data text-sm text-drift">
                        {formatCurrencyCents(lot.priceCents, locale, currency)}{" "}
                        <span className="text-faint">/ {t("event.each")}</span>
                      </p>
                      <p className="text-xs text-faint">
                        {soldOut ? t("event.soldOut") : t("event.available", { count: lot.available })}
                        {lot.maxPerOrder != null && lot.maxPerOrder > 0
                          ? ` · ${t("event.maxPerOrder", { count: lot.maxPerOrder })}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        aria-label="-"
                        disabled={current <= 0}
                        onClick={() => setLotQty(key, current - 1, cap)}
                        className="grid size-9 place-items-center rounded border border-rail text-signal disabled:opacity-30"
                      >
                        <Minus className="size-4" aria-hidden />
                      </button>
                      <span className="data w-6 text-center text-signal" aria-live="polite">
                        {current}
                      </span>
                      <button
                        type="button"
                        aria-label="+"
                        disabled={soldOut || current >= cap}
                        onClick={() => setLotQty(key, current + 1, cap)}
                        className="grid size-9 place-items-center rounded border border-rail text-signal disabled:opacity-30"
                      >
                        <Plus className="size-4" aria-hidden />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>

      <section className="card-ud border border-rail p-5">
        <h2 className="eyebrow mb-4">{t("event.buyerData")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm text-mute">{t("event.name")}</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
              className="w-full rounded border border-rail bg-transparent px-3 py-2 text-signal outline-none focus:border-drift"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-mute">{t("event.email")}</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="w-full rounded border border-rail bg-transparent px-3 py-2 text-signal outline-none focus:border-drift"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm text-mute">{t("event.phone")}</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              className="w-full rounded border border-rail bg-transparent px-3 py-2 text-signal outline-none focus:border-drift"
            />
          </label>
        </div>
      </section>

      {error && (
        <p role="alert" className="rounded border border-signal/30 bg-signal/5 px-4 py-3 text-sm text-signal">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-rail pt-6">
        <div>
          <p className="eyebrow">{t("event.total")}</p>
          <p className="data text-2xl text-signal">{formatCurrencyCents(totalCents, locale, currency)}</p>
        </div>
        <button type="submit" disabled={isPending || totalUnits === 0} className="btn-ud disabled:opacity-40">
          {isPending ? t("event.submitting") : t("event.submit")}
        </button>
      </div>
    </form>
  );
}
