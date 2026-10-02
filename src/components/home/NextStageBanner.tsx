import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { UDImage } from "@/components/ui/UDImage";
import { formatDateRange } from "@/lib/format";
import type { PublicRaceEvent } from "@/lib/events/queries";

type Props = {
  event: PublicRaceEvent;
  locale: string;
};

const CARD_CLASS = "card-ud group block overflow-hidden border border-rail";

/**
 * Banner da próxima etapa no topo da home. Fonte: collection `events` (os
 * mesmos eventos da aba Ingressos do app), via `getNextRaceEvent`.
 *
 * Com venda aberta (`isSelling` + `linkUrl`) o banner abre o link de compra
 * externo; sem venda, leva pra lista de etapas do site (não há vínculo de
 * `events` com `stageHubs` pra linkar a etapa específica).
 *
 * A imagem é exibida na proporção natural (sem crop) porque a arte do banner
 * costuma ter texto/logo nas bordas.
 */
export function NextStageBanner({ event, locale }: Props) {
  const t = useTranslations("home");
  const tTickets = useTranslations("ingressos");
  const dates = formatDateRange(event.startDate, event.endDate, locale);
  const ticketUrl = event.isSelling ? event.linkUrl : null;
  const title = event.place || t("nextStage");

  const content = (
    <>
      {event.imagePath && (
        <UDImage
          src={event.imagePath}
          alt={title}
          baseVariant="high"
          srcsetPreset="responsive"
          sizes="(min-width: 1408px) 1408px, 100vw"
          loading="eager"
          fetchPriority="high"
          className="block h-auto w-full"
        />
      )}
      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between lg:p-6">
        <div>
          <p className="eyebrow">{t("nextStage")}</p>
          <h2 className="display mt-1 text-2xl text-signal lg:text-3xl">{title}</h2>
          {dates && <p className="mt-1 text-sm text-mute">{dates}</p>}
        </div>
        {ticketUrl && (
          <span className="btn-ud inline-flex shrink-0 items-center gap-1 self-start sm:self-auto">
            {tTickets("catalog.viewEvent")}
            <ChevronRight className="size-4" aria-hidden />
          </span>
        )}
      </div>
    </>
  );

  return (
    <section aria-label={t("nextStage")} className="bg-panel">
      <div className="mx-auto max-w-wide px-4 py-6 lg:px-8 lg:py-8">
        {ticketUrl ? (
          <a href={ticketUrl} target="_blank" rel="noopener noreferrer" className={CARD_CLASS}>
            {content}
          </a>
        ) : (
          <Link href="/etapas" className={CARD_CLASS}>
            {content}
          </Link>
        )}
      </div>
    </section>
  );
}
