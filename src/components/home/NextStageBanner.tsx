import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { UDImage } from "@/components/ui/UDImage";
import { formatDateRange } from "@/lib/format";
import type { PublicTicketEventSummary } from "@/lib/ticketing/schema";

type Props = {
  event: PublicTicketEventSummary;
  locale: string;
};

/**
 * Banner da próxima etapa no topo da home. Fonte: `ticketEvents` (bilheteria),
 * via `getNextPublishedEvent`. Linka pra página de compra do evento.
 *
 * A imagem é exibida na proporção natural (sem crop) porque a arte do banner
 * costuma ter texto/logo nas bordas.
 */
export function NextStageBanner({ event, locale }: Props) {
  const t = useTranslations("home");
  const tTickets = useTranslations("ingressos");
  const dates = formatDateRange(event.startsAt, event.endsAt, locale);

  return (
    <section aria-label={t("nextStage")} className="bg-panel">
      <div className="mx-auto max-w-wide px-4 py-6 lg:px-8 lg:py-8">
        <Link
          href={{ pathname: "/ingressos/[slug]", params: { slug: event.slug } }}
          className="card-ud group block overflow-hidden border border-rail"
        >
          {event.heroImagePath && (
            <UDImage
              src={event.heroImagePath}
              alt={event.name}
              baseVariant="high"
              srcsetPreset="responsive"
              sizes="(min-width: 1280px) 1280px, 100vw"
              loading="eager"
              fetchPriority="high"
              className="block h-auto w-full"
            />
          )}
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between lg:p-6">
            <div>
              <p className="eyebrow">{t("nextStage")}</p>
              <h2 className="display mt-1 text-2xl text-signal lg:text-3xl">{event.name}</h2>
              {(dates || event.venue) && (
                <p className="mt-1 text-sm text-mute">
                  {[dates, event.venue].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
            <span className="btn-ud inline-flex shrink-0 items-center gap-1 self-start sm:self-auto">
              {tTickets("catalog.viewEvent")}
              <ChevronRight className="size-4" aria-hidden />
            </span>
          </div>
        </Link>
      </div>
    </section>
  );
}
