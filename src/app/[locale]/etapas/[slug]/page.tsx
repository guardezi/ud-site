import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import { BackTitle } from "@/components/stages/BackTitle";
import { UDImage } from "@/components/ui/UDImage";
import { JsonLd } from "@/components/seo/JsonLd";
import { getStageEventDetail, listStageEvents, resolveStageEventSlug, type StageEventSummary } from "@/lib/stages/events";
import { listStageEventSponsors } from "@/lib/stages/sponsors";
import { formatScheduleDay, formatStageDays, formatStageNumbers } from "@/lib/stages/labels";
import { imageHigh } from "@/lib/firebase/image-variants";
import { buildMetadata } from "@/lib/seo/meta";
import { sportsEventLd } from "@/lib/seo/jsonld";
import { canonical } from "@/lib/seo/canonical";
import type { Locale } from "@/i18n/config";

export const revalidate = 600;

export async function generateStaticParams() {
  const stages = await listStageEvents().catch(() => []);
  return stages.map((s) => ({ slug: s.slug }));
}

type PageParams = Promise<{ locale: Locale; slug: string }>;
type Translator = Awaited<ReturnType<typeof getTranslations<"etapas">>>;

/** "11ª e 12ª Etapa – ECPA - Piracicaba (Piracicaba - SP)" — mesmo padrão dos posts do WordPress. */
function stageTitle(stage: StageEventSummary, t: Translator, locale: string): string {
  const head = stage.stageNumbers.length
    ? t("stageTitle", { numbers: formatStageNumbers(stage.stageNumbers, locale), count: stage.stageNumbers.length })
    : t("stageTitleNoNumber");
  if (stage.venue) return `${head} – ${stage.venue}${stage.city ? ` (${stage.city})` : ""}`;
  return stage.city ? `${head} – ${stage.city}` : head;
}

function isYouTube(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\.|^m\./, "");
    return host === "youtube.com" || host === "youtu.be";
  } catch {
    return false;
  }
}

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { locale, slug } = await params;
  const resolved = await resolveStageEventSlug(slug).catch(() => null);
  if (!resolved) return {};
  const stage = resolved.summary;
  const t = await getTranslations({ locale, namespace: "etapas" });
  const title = stageTitle(stage, t, locale);
  return buildMetadata({
    href: "/etapas/[slug]",
    locale,
    params: { slug: stage.slug },
    title,
    description: t("metaDescription", { name: title }),
    image: imageHigh(stage.artPath) ?? undefined,
  });
}

/**
 * Página da etapa — layout `.step` do tema legado: título com voltar, arte em
 * largura total (link de compra quando à venda), bloco claro com datas +
 * cronograma público à esquerda e, à direita, "Comprar ingresso",
 * Localização e Mapa (Google Maps pelo endereço do circuito); depois
 * patrocinadores do evento e o conteúdo do circuito (mapa, descrição, FAQ).
 */
export default async function StagePage({ params }: { params: PageParams }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("etapas");

  const resolved = await resolveStageEventSlug(slug);
  if (!resolved) notFound();
  if (!resolved.canonical) {
    permanentRedirect(getPathname({ locale, href: { pathname: "/etapas/[slug]", params: { slug: resolved.summary.slug } } }));
  }

  const [stage, sponsors] = await Promise.all([getStageEventDetail(resolved.summary), listStageEventSponsors()]);
  const circuit = stage.circuit;
  const title = stageTitle(stage, t, locale);
  const dates = formatStageDays(stage.days, locale, t.raw("monthTemplate") as string);
  const address = circuit?.address ? [circuit.address, circuit.city].filter(Boolean).join(" - ") : null;
  const mapsQuery = address ? encodeURIComponent(address) : null;
  const hasRight = Boolean(stage.ticketUrl || address || stage.liveUrl || stage.regulationUrl || stage.wildcardFormUrl);

  const art = stage.artPath ? (
    <UDImage
      src={stage.artPath}
      alt={title}
      baseVariant="high"
      srcsetPreset="responsive"
      sizes="100vw"
      loading="eager"
      fetchPriority="high"
      className="step__img"
    />
  ) : null;

  const ld = sportsEventLd({
    name: title,
    url: canonical("/etapas/[slug]", locale, { slug: stage.slug }),
    startDate: stage.startDay ?? new Date().toISOString().slice(0, 10),
    endDate: stage.endDay ?? undefined,
    locationName: stage.venue ?? stage.city ?? title,
    locationAddress: circuit ? { city: circuit.city, country: circuit.country } : stage.city ? { city: stage.city } : undefined,
    image: imageHigh(stage.artPath),
    description: circuit?.description ?? null,
  });

  return (
    <section className="step">
      <div className="wrapper">
        <BackTitle fallbackHref="/etapas" backLabel={t("back")}>
          {title}
        </BackTitle>
      </div>

      {art && (
        <div className="step__top">
          {stage.ticketUrl ? (
            <a href={stage.ticketUrl} className="step__photo-link" target="_blank" rel="noopener noreferrer" aria-label={t("buyTicket")}>
              {art}
            </a>
          ) : (
            <div className="step__photo-link">{art}</div>
          )}
        </div>
      )}

      <div className="step__bottom">
        <div className="wrapper">
          <div className="step__bottom-content">
            <div className="step__bottom-box">
              <div className="step__bottom-left">
                <div className="step__bottom-left-header">
                  {stage.venue && <span className="step__local">{stage.venue}</span>}
                  {dates && <h3 className="step__date">{dates}</h3>}
                  {stage.city && <h3 className="step__city">{stage.city}</h3>}
                </div>
                {stage.schedule.length > 0 && (
                  <div className="step__bottom-left-body">
                    {stage.schedule.map((day) => (
                      <div key={day.day} className="col-12">
                        <h3 className="step__date-secondary">{formatScheduleDay(day.day, locale)}</h3>
                        {day.items.map((item, i) => (
                          <span key={`${item.time}-${i}`} className="step__item">
                            {item.time}
                            {item.endTime ? ` - ${item.endTime}` : ""} - {item.description}
                            {item.externalUrl && (
                              <>
                                <br />
                                {t("liveStream")}{" "}
                                <a
                                  href={item.externalUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label={isYouTube(item.externalUrl) ? "YouTube" : t("liveStream")}
                                  title={isYouTube(item.externalUrl) ? "YouTube" : t("liveStream")}
                                  style={{ display: "inline-block", verticalAlign: "middle" }}
                                >
                                  <svg className="step__item-icon" width="35" height="23" viewBox="0 0 35 23" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                                    <path
                                      fillRule="evenodd"
                                      clipRule="evenodd"
                                      d="M13.9798 15.7486V6.5292C17.4661 8.06927 20.1663 9.557 23.3598 11.161C20.7258 12.5323 17.4661 14.0709 13.9798 15.7486ZM33.4093 1.94397C32.8079 1.20015 31.7829 0.621146 30.6917 0.429457C27.4842 -0.142339 7.47422 -0.143965 4.26852 0.429457C3.39344 0.583459 2.61421 0.955702 1.94483 1.53405C-0.875634 3.9916 0.00816584 17.1707 0.688008 19.3055C0.973888 20.2295 1.34346 20.8959 1.80889 21.3334C2.40854 21.9117 3.22957 22.3099 4.17263 22.4885C6.81354 23.0013 20.4191 23.288 30.6358 22.5655C31.5772 22.4115 32.4104 22.0005 33.0676 21.3975C35.6754 18.9498 35.4976 5.03065 33.4093 1.94397Z"
                                      fill="white"
                                    />
                                  </svg>
                                </a>
                              </>
                            )}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {hasRight && (
                <div className="step__bottom-right">
                  {stage.ticketUrl && (
                    <a href={stage.ticketUrl} className="step__ticket" target="_blank" rel="noopener noreferrer">
                      {t("buyTicket")}
                    </a>
                  )}
                  {address && mapsQuery && (
                    <>
                      <h2 className="step__bottom-right-title">{t("location")}</h2>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
                        className="step__address"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {address}
                      </a>
                      <h2 className="step__bottom-right-title">{t("map")}</h2>
                      <div className="step__map-box">
                        <div className="step__loading">
                          <span className="step__loading-text">{t("loadingMap")}</span>
                        </div>
                        <iframe
                          className="step__frame"
                          loading="lazy"
                          title={`${t("map")} — ${address}`}
                          src={`https://maps.google.com/maps?q=${mapsQuery}&z=15&output=embed`}
                          width={1080}
                          height={260}
                          style={{ border: 0 }}
                          allowFullScreen
                        />
                      </div>
                    </>
                  )}
                  {(stage.liveUrl || stage.regulationUrl || stage.wildcardFormUrl) && (
                    <div style={{ marginTop: 20 }}>
                      {stage.liveUrl && (
                        <a className="step__link" href={stage.liveUrl} target="_blank" rel="noopener noreferrer">
                          {t("watchLive")}
                        </a>
                      )}
                      {stage.regulationUrl && (
                        <a className="step__link" href={stage.regulationUrl} target="_blank" rel="noopener noreferrer">
                          {t("regulation")}
                        </a>
                      )}
                      {stage.wildcardFormUrl && (
                        <a className="step__link" href={stage.wildcardFormUrl} target="_blank" rel="noopener noreferrer">
                          {t("wildcardForm")}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {sponsors.length > 0 && (
              <div className="step__sponsors-container">
                {sponsors.map((s) => {
                  const logo = s.logoPath ? (
                    <UDImage
                      src={s.logoPath}
                      alt={t("sponsorAlt", { name: s.name })}
                      baseVariant="small"
                      srcsetPreset="compact"
                      sizes="160px"
                      width={200}
                      height={200}
                      className="step__sponsors-img"
                    />
                  ) : (
                    <span className="step__item">{s.name}</span>
                  );
                  return (
                    <div key={s.id} className="step__sponsors-item">
                      {s.site ? (
                        <a href={s.site} title={t("sponsorVisit", { name: s.name })} className="step__sponsors-link" target="_blank" rel="noopener noreferrer">
                          {logo}
                        </a>
                      ) : (
                        <div className="step__sponsors-link">{logo}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {circuit && (circuit.mapImageUrl || circuit.description || circuit.faqs.length > 0) && (
              <div className="step__content">
                {circuit.mapImageUrl && (
                  <figure className="wp-block-image size-large">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={circuit.mapImageUrl} alt={`${t("trackMap")} — ${circuit.name}`} loading="lazy" decoding="async" style={{ maxWidth: "100%", height: "auto" }} />
                  </figure>
                )}
                {circuit.description &&
                  circuit.description
                    .split(/\n{2,}/)
                    .map((p, i) => <p key={i} style={{ whiteSpace: "pre-line" }}>{p}</p>)}
                {circuit.faqs.length > 0 && (
                  <>
                    <p>
                      <strong>{t("faq")}</strong>
                    </p>
                    {circuit.faqs.map((f, i) => (
                      <p key={i} style={{ whiteSpace: "pre-line" }}>
                        <strong>{f.question}</strong>
                        <br />
                        {f.answer}
                      </p>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <JsonLd data={ld} />
    </section>
  );
}
