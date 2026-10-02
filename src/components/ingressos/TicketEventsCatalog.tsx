import { getTranslations } from "next-intl/server";
import { ChevronRight } from "lucide-react";
import { UDImage } from "@/components/ui/UDImage";
import { Link } from "@/i18n/navigation";
import { formatDateRange } from "@/lib/format";
import type { PublicTicketEventSummary } from "@/lib/ticketing/schema";

/**
 * Aba Ingressos no modo `ticketsystem = internal` — catálogo da bilheteria
 * própria (`ticketEvents` publicados), que leva pro checkout em
 * /ingressos/[slug]. Conteúdo idêntico ao que a página tinha antes.
 */
export async function TicketEventsCatalog({
  events,
  locale,
}: {
  events: PublicTicketEventSummary[];
  locale: string;
}) {
  const t = await getTranslations("ingressos");

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
