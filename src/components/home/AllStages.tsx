import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { UpcomingStage } from "@/lib/stages/home-stages";
import { stageDatesLabel } from "@/lib/stages/date-labels";
import type { StageHref } from "./NextStageSchedule";

/**
 * "Todas as etapas": cards em fundo claro com datas, cidade, autódromo,
 * "Comprar ingresso" e "+ Informações". Classes `etapas-futuras`/`etapa-*`
 * do tema legado + grid/card do Bootstrap (carregado no layout).
 *
 * Dados: etapas futuras de `stageHubs` + `circuits/{id}` (`toStageCards`).
 * Sem link de ingresso por etapa nas fontes (pergunta no PR): botão
 * "Comprar ingresso" só aparece quando `ticketUrl` vier preenchido.
 */
export type StageCardData = {
  id: string;
  /** Ex.: "16, 17 e 18 de Outubro" */
  datesLabel: string;
  city: string;
  venue: string | null;
  /** Link externo de compra; sem link, o botão não aparece. */
  ticketUrl: string | null;
  moreInfoHref: StageHref | null;
};

export function toStageCards(stages: UpcomingStage[], locale: string): StageCardData[] {
  return stages.map((s) => ({
    id: s.hub.id,
    datesLabel: stageDatesLabel(s.startDate, s.endDate, locale),
    city: s.circuit?.city ?? s.hub.name,
    venue: s.circuit?.name || null,
    ticketUrl: null,
    moreInfoHref: { pathname: "/etapas/[slug]", params: { slug: s.hub.slug } },
  }));
}

export function AllStages({ stages }: { stages: StageCardData[] }) {
  const t = useTranslations("homeSections");
  const tHome = useTranslations("home");
  if (stages.length === 0) return null;

  return (
    <section className="etapas-futuras py-5">
      <div className="wrapper">
        <h2 className="ui__title black">{t("allStages")}</h2>
        <div className="etapas-box row g-4 mt-4">
          {stages.map((stage) => (
            <div key={stage.id} className="col-12 col-md-6 col-lg-4">
              <div className="card etapa-card h-100 border-0 shadow-sm">
                <div className="card-body d-flex flex-column">
                  <h5 className="fw-bold mb-2">{stage.datesLabel}</h5>
                  <p className="mb-1 text-muted">{stage.city}</p>
                  {stage.venue && <p className="small mb-4">{stage.venue}</p>}
                  <div className="mt-auto">
                    {stage.ticketUrl && (
                      <a href={stage.ticketUrl} target="_blank" rel="noopener noreferrer" className="etapa-btn button">
                        {tHome("buyTicket")}
                      </a>
                    )}
                  </div>
                  {stage.moreInfoHref && (
                    <Link href={stage.moreInfoHref} className="etapa-link">
                      {tHome("moreInfo")}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
