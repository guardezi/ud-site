"use client";

import { useEffect } from "react";

type PurchaseItem = { item_name: string; quantity: number; price: number };

type Props = {
  transactionId: string;
  value: number;
  currency: string;
  items: PurchaseItem[];
};

/**
 * Dispara o evento `purchase` do GA4 quando o pedido está pago/emitido — fecha o
 * loop campanha → venda → receita (amarra os utm_* da sessão ao faturamento).
 *
 * Dedup: o GA4 deduplica por `transaction_id`, então refresh da página de
 * confirmação não conta a venda duas vezes.
 *
 * Só emite se houver um GA carregado (ou o shim padrão do gtag): sem GA
 * configurado (HML/preview), o push no dataLayer é inofensivo e ninguém lê.
 */
export function PurchaseEvent({ transactionId, value, currency, items }: Props) {
  useEffect(() => {
    const w = window as unknown as {
      dataLayer?: unknown[];
      gtag?: (...args: unknown[]) => void;
    };
    if (typeof w.gtag !== "function") {
      w.dataLayer = w.dataLayer || [];
      w.gtag = function gtag() {
        // Formato canônico do gtag: empurra o próprio `arguments` no dataLayer.
        w.dataLayer!.push(arguments);
      };
    }
    w.gtag("event", "purchase", {
      transaction_id: transactionId,
      value,
      currency,
      items,
    });
  }, [transactionId, value, currency, items]);

  return null;
}
