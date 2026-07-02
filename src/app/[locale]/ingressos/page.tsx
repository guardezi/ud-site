import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { ChevronRight } from "lucide-react";
import { listPublishedEvents } from "@/lib/ticketing/queries";
import { UDImage } from "@/components/ui/UDImage";
import { Link } from "@/i18n/navigation";
import { buildMetadata } from "@/lib/seo/meta";
import { formatDateRange } from "@/lib/format";
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
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ingressos");
  const events = await listPublishedEvents();

  return (
    <div className="mx-auto max-w-wide px-4 py-12 lg:px-8 lg:py-16">
      <header className="mb-10">
        <p className="eyebrow">{t("catalog.title")}</p>
        <h1 className="display mt-2 text-4xl text-signal lg:text-5xl">{t("catalog.title")}</h1>
        <p className="mt-3 max-w-2xl text-mute">{t("catalog.subtitle")}</p>
      </header>

      {events.length === 0 ? (
        <p className="rounded border border-rail px-4 py-8 text-center text-mute">
          {t("catalog.noEvents")}
        </p>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((ev) => (
            <li key={ev.id}>
              <Link
                href={{ pathname: "/ingressos/[slug]", params: { slug: ev.slug } }}
                className="card-ud group block border border-rail"
              >
                <div className="relative aspect-[16/9] overflow-hidden">
                  <UDImage
                    src={ev.heroImagePath}
                    alt={ev.name}
                    className="size-full object-cover"
                    sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
                  />
                </div>
                <div className="p-5">
                  {(ev.startsAt || ev.endsAt) && (
                    <p className="eyebrow">{formatDateRange(ev.startsAt, ev.endsAt, locale)}</p>
                  )}
                  <h2 className="display mt-1 text-xl text-signal">{ev.name}</h2>
                  {ev.venue && <p className="mt-1 text-sm text-mute">{ev.venue}</p>}
                  <span className="mt-4 inline-flex items-center gap-1 text-xs uppercase tracking-[0.18em] text-drift">
                    {t("catalog.viewEvent")}
                    <ChevronRight className="size-3" aria-hidden />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
