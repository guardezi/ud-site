import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { UDImage } from "@/components/ui/UDImage";
import { formatDateRange } from "@/lib/format";
import type { PublicRaceEvent } from "@/lib/events/queries";

type Props = {
  event: PublicRaceEvent;
  locale: string;
};

/**
 * Banner da próxima etapa no topo da home. Fonte: collection `events` (os
 * mesmos eventos da aba Ingressos do app), via `getNextRaceEvent`.
 *
 * A própria arte do evento é o banner: largura total da página, proporção
 * natural (sem crop) e nada sobreposto — local, datas e chamada de compra já
 * vêm desenhados na arte.
 *
 * Com venda aberta (`isSelling` + `linkUrl`) a imagem abre o link de compra
 * externo; sem venda, leva pra lista de etapas do site (não há vínculo de
 * `events` com `stageHubs` pra linkar a etapa específica).
 */
export function NextStageBanner({ event, locale }: Props) {
  const t = useTranslations("home");
  const tTickets = useTranslations("ingressos");
  if (!event.imagePath) return null;

  const dates = formatDateRange(event.startDate, event.endDate, locale);
  const description = [t("nextStage"), event.place, dates].filter(Boolean).join(" · ");
  const ticketUrl = event.isSelling ? event.linkUrl : null;

  const image = (
    <UDImage
      src={event.imagePath}
      alt={description}
      baseVariant="high"
      srcsetPreset="responsive"
      sizes="100vw"
      loading="eager"
      fetchPriority="high"
      className="block h-auto w-full"
    />
  );

  return (
    <section aria-label={t("nextStage")} className="w-full">
      {ticketUrl ? (
        <a
          href={ticketUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${tTickets("catalog.viewEvent")} — ${description}`}
          className="block"
        >
          {image}
        </a>
      ) : (
        <Link href="/etapas" aria-label={description} className="block">
          {image}
        </Link>
      )}
    </section>
  );
}
