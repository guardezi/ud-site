import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BackTitle } from "./BackTitle";
import { formatEventDays } from "@/lib/ingressos/format-days";
import type { ExternalTicketEvent } from "@/lib/ingressos/external-events";

/**
 * Aba Ingressos no modo `ticketsystem = external` — mesma marcação do tema
 * WordPress legado (`section.tickets` → `.etapas-futuras` → `.etapa-card`),
 * com os dados de `events` (mesma fonte da aba Ingressos do ud-app,
 * lib/pages/public/calendar/ticket_page.dart).
 *
 * Por card: datas, cidade (`place`) e "Comprar ingresso" abrindo `linkUrl` em
 * nova aba. Sem `isSelling`/`linkUrl` o botão vira "Venda em breve" (como o
 * app). "+ Informações" vai pra lista de etapas: `events` não tem vínculo com
 * `stageHubs` pra apontar a etapa específica.
 */
export async function ExternalTicketList({
  events,
  locale,
}: {
  events: ExternalTicketEvent[];
  locale: string;
}) {
  const t = await getTranslations("ingressos");

  return (
    <section className="tickets">
      <div className="wrapper">
        <BackTitle title={t("catalog.title")} />
      </div>
      <section className="etapas-futuras">
        <div className="wrapper">
          {events.length === 0 ? (
            <div className="py-5 text-center">
              <p className="fw-bold mb-2">{t("external.emptyTitle")}</p>
              <p className="small mb-0">{t("external.emptyDescription")}</p>
            </div>
          ) : (
            <div className="etapas-box row g-4">
              {events.map((ev) => {
                const buyUrl = ev.isSelling ? ev.linkUrl : null;
                return (
                  <div key={ev.id} className="col-12 col-md-6 col-lg-4">
                    <div className="card etapa-card h-100 border-0 shadow-sm">
                      <div className="card-body d-flex flex-column">
                        <h5 className="fw-bold mb-2">{formatEventDays(ev.startDate, ev.endDate, locale)}</h5>
                        <p className="mb-4">{ev.place}</p>
                        <div className="mt-auto">
                          {buyUrl ? (
                            <a href={buyUrl} target="_blank" rel="noopener noreferrer" className="etapa-btn button">
                              {t("external.buy")}
                            </a>
                          ) : (
                            <span className="etapa-btn button" aria-disabled="true" style={{ opacity: 0.5, cursor: "default" }}>
                              {t("external.comingSoon")}
                            </span>
                          )}
                        </div>
                        <Link href="/etapas" className="etapa-link">
                          {t("external.moreInfo")}
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </section>
  );
}
