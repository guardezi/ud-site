import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { listPublishedEvents } from "@/lib/ticketing/queries";
import { listUpcomingExternalTicketEvents } from "@/lib/ingressos/external-events";
import { getTicketSystem } from "@/lib/feature-flags/ticket-system";
import { TicketEventsCatalog } from "@/components/ingressos/TicketEventsCatalog";
import { ExternalTicketList } from "@/components/ingressos/ExternalTicketList";
import { buildMetadata } from "@/lib/seo/meta";
import type { Locale } from "@/i18n/config";

// Dinâmico: o catálogo é lido via Admin SDK no request (credencial de runtime).
// Com ISR estático, o Next pré-renderiza no build — onde não há credencial
// Firebase — e cravaria "nenhum evento" no HTML.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ingressos" });
  return buildMetadata({
    href: "/ingressos",
    locale,
    title: t("catalog.title"),
    description: t("catalog.subtitle"),
  });
}

export default async function IngressosCatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  // Consome searchParams (valor de runtime) pra FORÇAR render dinâmico: o
  // build do App Hosting estava pré-renderizando esta rota fixa estaticamente
  // — sem credencial Firebase — cravando "nenhum evento". `force-dynamic`
  // sozinho não bastou nesta rota; a dependência de searchParams garante SSR.
  await searchParams;
  setRequestLocale(locale);

  // Mesma chave do ud-app (Remote Config `ticketsystem`): `external` (default)
  // = etapas de `events` com link de compra externo, como o site legado e a aba
  // Ingressos do app; `internal` = loja própria (`ticketEvents`).
  if ((await getTicketSystem()) === "internal") {
    const events = await listPublishedEvents();
    return <TicketEventsCatalog events={events} locale={locale} />;
  }

  const events = await listUpcomingExternalTicketEvents();
  return <ExternalTicketList events={events} locale={locale} />;
}
