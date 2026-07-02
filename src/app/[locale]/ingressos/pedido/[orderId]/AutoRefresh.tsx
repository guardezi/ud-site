"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Enquanto o pedido está `paid` mas os ingressos ainda não foram emitidos
 * (emissão assíncrona via Cloud Function `ticketingOnOrderPaid`), esta página
 * fica em "processando". Este componente dá `router.refresh()` a cada
 * `intervalMs` pra re-buscar o estado no server até os `issuedTickets`
 * aparecerem — sem client SDK nem listener, só refetch do server component.
 */
export function AutoRefresh({ intervalMs = 4000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}
