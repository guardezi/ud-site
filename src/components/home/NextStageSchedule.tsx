import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { StaticPathname } from "@/lib/routes";
import type { StageScheduleEntry, UpcomingStage } from "@/lib/stages/home-stages";
import { scheduleDayLabel, stageDatesLabel } from "@/lib/stages/date-labels";

/**
 * Seção "Próxima etapa" da home: datas, cidade, autódromo, cronograma em 3
 * colunas e botões de compra/informações. Reaproveita as classes do tema
 * legado (`index__circuit*`, `ui__title`, grid `row`/`col-*`) carregadas por
 * /theme/css/bundle.min.css — mesmo visual do site WordPress.
 *
 * Dados: próxima etapa de `stageHubs` + `circuits/{id}` + cronograma público
 * (`championships/{cid}/stages/{sid}/schedule`), montados por
 * `toNextStageScheduleData` (ver src/lib/stages/home-stages.ts).
 */
export type ScheduleBroadcaster = {
  name: string;
  url: string;
  /** Logo da emissora; sem logo, mostra o nome em texto. */
  logoSrc?: string;
};

export type ScheduleItem = {
  /** "HH:MM" */
  startTime: string;
  /** "HH:MM" — quando presente, renderiza "início - fim - título". */
  endTime?: string;
  title: string;
  /** Item transmitido ao vivo: link do botão play + emissora opcional. */
  live?: { url: string; broadcaster?: ScheduleBroadcaster };
};

export type ScheduleDay = {
  /** Ex.: "Sexta - 16/10" */
  label: string;
  items: ScheduleItem[];
};

export type NextStageScheduleData = {
  /** Ex.: "16, 17 e 18 de Outubro" */
  datesLabel: string;
  city: string;
  /** Autódromo/local. */
  venue: string | null;
  days: ScheduleDay[];
  /** Link externo de compra; sem link, o botão não aparece. */
  ticketUrl: string | null;
  /** Página interna de mais informações; sem valor, o botão não aparece. */
  moreInfoHref: StageHref | null;
};

/** Destino interno do "+ Informações": página da etapa ou uma rota estática. */
export type StageHref = StaticPathname | { pathname: "/etapas/[slug]"; params: { slug: string } };

/**
 * Próxima etapa + cronograma → props da seção. Sem dado de transmissão ao
 * vivo nem link de ingresso por item/etapa nas fontes (perguntas no PR):
 * `live` e `ticketUrl` ficam vazios.
 */
export function toNextStageScheduleData(
  stage: UpcomingStage,
  schedule: StageScheduleEntry[],
  locale: string,
): NextStageScheduleData {
  const byDay = new Map<string, ScheduleItem[]>();
  for (const e of schedule) {
    const items = byDay.get(e.day) ?? [];
    items.push({ startTime: e.time, endTime: e.endTime || undefined, title: e.description });
    byDay.set(e.day, items);
  }
  return {
    datesLabel: stageDatesLabel(stage.startDate, stage.endDate, locale),
    city: stage.circuit?.city ?? stage.hub.name,
    venue: stage.circuit?.name || null,
    days: [...byDay.entries()].map(([day, items]) => ({ label: scheduleDayLabel(day, locale), items })),
    ticketUrl: null,
    moreInfoHref: { pathname: "/etapas/[slug]", params: { slug: stage.hub.slug } },
  };
}

function PlayIcon() {
  return (
    <svg className="index__circuit-item-icon inline-block align-middle" width="35" height="23" viewBox="0 0 35 23" fill="none" aria-hidden>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M13.9798 15.7486V6.5292C17.4661 8.06927 20.1663 9.557 23.3598 11.161C20.7258 12.5323 17.4661 14.0709 13.9798 15.7486ZM33.4093 1.94397C32.8079 1.20015 31.7829 0.621146 30.6917 0.429457C27.4842 -0.142339 7.47422 -0.143965 4.26852 0.429457C3.39344 0.583459 2.61421 0.955702 1.94483 1.53405C-0.875634 3.9916 0.00816584 17.1707 0.688008 19.3055C0.973888 20.2295 1.34346 20.8959 1.80889 21.3334C2.40854 21.9117 3.22957 22.3099 4.17263 22.4885C6.81354 23.0013 20.4191 23.288 30.6358 22.5655C31.5772 22.4115 32.4104 22.0005 33.0676 21.3975C35.6754 18.9498 35.4976 5.03065 33.4093 1.94397Z"
        fill="white"
      />
    </svg>
  );
}

export function NextStageSchedule({ data }: { data: NextStageScheduleData }) {
  const t = useTranslations("home");

  return (
    <section className="index__circuit" aria-label={t("nextStage")}>
      <div className="wrapper">
        <h2 className="ui__title">{t("nextStage")}</h2>
      </div>
      <div className="index__circuit-container">
        <div className="index__circuit-box">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            width={1440}
            height={410}
            src="/theme/img/index-circuit.jpg"
            alt=""
            aria-hidden
            className="index__circuit-bg"
            loading="lazy"
          />
          <div className="wrapper">
            <article className="index__circuit-content">
              <div className="row justify-content-center justify-content-lg-between">
                <div className="col-12">
                  <h3 className="index__circuit-date">{data.datesLabel}</h3>
                  <h3 className="index__circuit-city">{data.city}</h3>
                  {data.venue && <span className="index__circuit-local">{data.venue}</span>}
                </div>

                {data.days.map((day) => (
                  <div key={day.label} className="col-12 col-md-4">
                    <h3 className="index__circuit-date-secondary">{day.label}</h3>
                    {day.items.map((item, i) => (
                      <span key={i} className="index__circuit-item">
                        {[item.startTime, item.endTime, item.title].filter(Boolean).join(" - ")}
                        {item.live && (
                          <>
                            <br />
                            {t("liveStream")}{" "}
                            <a
                              href={item.live.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={t("liveStream")}
                              title={t("liveStream")}
                            >
                              <PlayIcon />
                            </a>
                            {item.live.broadcaster && (
                              <a
                                href={item.live.broadcaster.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={item.live.broadcaster.name}
                                title={item.live.broadcaster.name}
                              >
                                {item.live.broadcaster.logoSrc ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    className="index__circuit-item-img inline-block align-middle"
                                    src={item.live.broadcaster.logoSrc}
                                    alt={item.live.broadcaster.name}
                                  />
                                ) : (
                                  <span className="ml-2 text-xs uppercase tracking-[0.12em]">
                                    {item.live.broadcaster.name}
                                  </span>
                                )}
                              </a>
                            )}
                          </>
                        )}
                      </span>
                    ))}
                  </div>
                ))}

                {(data.ticketUrl || data.moreInfoHref) && (
                  <div className="col-12">
                    <div className="index__circuit-bottom">
                      {data.ticketUrl && (
                        <a
                          href={data.ticketUrl}
                          className="index__circuit-ticket button"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {t("buyTicket")}
                        </a>
                      )}
                      {data.moreInfoHref && (
                        <Link href={data.moreInfoHref} className="index__circuit-more button">
                          {t("moreInfo")}
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
