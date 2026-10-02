import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { UDImage } from "@/components/ui/UDImage";
import { formatStageDays } from "@/lib/stages/labels";
import type { StageEventSummary } from "@/lib/stages/events";

/**
 * Card de etapa da página /etapas — markup `.steps__card` do tema legado:
 * datas, arte (link pra página da etapa), cidade, autódromo, "+ Informações"
 * e "Comprar ingresso" (próximas, com venda aberta) ou "Ver Detalhes"
 * (realizadas, botão laranja `.carried-out`).
 */
export function StageEventCard({ stage }: { stage: StageEventSummary }) {
  const t = useTranslations("etapas");
  const locale = useLocale();
  const href = { pathname: "/etapas/[slug]" as const, params: { slug: stage.slug } };
  const dates = formatStageDays(stage.days, locale, t.raw("monthTemplate") as string);

  return (
    <div className="col-12 col-md-6 col-lg-4">
      <div className="steps__card">
        <h3 className="steps__date">{dates}</h3>
        {stage.artPath && (
          <Link href={href} className="steps__photo">
            <UDImage
              src={stage.artPath}
              alt={[stage.city, dates].filter(Boolean).join(" · ")}
              baseVariant="medium"
              srcsetPreset="responsive"
              sizes="(min-width: 992px) 33vw, (min-width: 768px) 50vw, 100vw"
            />
          </Link>
        )}
        <div className="steps__local">
          {stage.city && <h3 className="steps__city">{stage.city}</h3>}
          {stage.venue && <span className="steps__local-text">{stage.venue}</span>}
          <Link className="step__link" href={href}>
            {t("moreInfo")}
          </Link>
        </div>
        <div className="steps__date">
          {stage.isUpcoming ? (
            stage.ticketUrl && (
              <a className="steps__ticket button" href={stage.ticketUrl} target="_blank" rel="noopener noreferrer">
                {t("buyTicket")}
              </a>
            )
          ) : (
            <Link className="steps__ticket carried-out button" href={href}>
              {t("viewDetails")}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
