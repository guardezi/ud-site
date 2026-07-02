"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { simulatePayment } from "@/lib/ticketing/actions";

type Props = { orderId: string; accessToken: string };

/**
 * Botão "Simular pagamento" (MVP — pagamento simulado, CONTRACTS.md §"paymentMethod").
 * Chama o server action `simulatePayment`, que só transiciona o pedido pra `paid`.
 * A emissão dos ingressos (com assinatura do token) é assíncrona, no trigger
 * `ticketingOnOrderPaid`. Por isso, ao pagar, damos `router.refresh()` — a página
 * volta em estado "processando" e o `AutoRefresh` cuida do resto.
 */
export function PayButton({ orderId, accessToken }: Props) {
  const t = useTranslations("ingressos");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onClick = () => {
    setError(null);
    startTransition(async () => {
      const res = await simulatePayment(orderId, accessToken);
      if (!res.ok) {
        setError(t(`errors.${res.error}`));
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      <button type="button" onClick={onClick} disabled={isPending} className="btn-ud disabled:opacity-40">
        {isPending ? t("order.paying") : t("order.simulatePayment")}
      </button>
      {error && (
        <p role="alert" className="text-sm text-signal">
          {error}
        </p>
      )}
    </div>
  );
}
