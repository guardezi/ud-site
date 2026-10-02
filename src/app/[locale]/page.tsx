import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { NextStageBanner } from "@/components/home/NextStageBanner";
import { SponsorCallout, SPONSOR_CALLOUT } from "@/components/home/SponsorCallout";
import { NextStageSchedule, toNextStageScheduleData } from "@/components/home/NextStageSchedule";
import { AllStages, toStageCards } from "@/components/home/AllStages";
import { ChampionshipStandings, toStandingsData } from "@/components/home/ChampionshipStandings";
import { AppPromo, APP_PROMO } from "@/components/home/AppPromo";
import { HomeNews, toHomeNewsData } from "@/components/home/HomeNews";
import { HomeSponsors, eventSponsorToLogo } from "@/components/home/HomeSponsors";
import { getNextRaceEvent } from "@/lib/events/queries";
import { getActiveChampionshipClassification } from "@/lib/championship/queries";
import { listEventSponsors } from "@/lib/sponsors/queries";
import { getPublicStageSchedule, listUpcomingStages } from "@/lib/stages/home-stages";
import { listHomeNews } from "@/lib/news/home-news";
import { buildMetadata } from "@/lib/seo/meta";
import type { Locale } from "@/i18n/config";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "brand" });
  return buildMetadata({
    href: "/",
    locale,
    title: `${t("name")} — ${t("tagline")}`,
    description: t("shortDescription"),
  });
}

/**
 * Home — mesma sequência de seções do site legado:
 * banner da próxima etapa → seja um patrocinador → próxima etapa (cronograma)
 * → todas as etapas → classificação geral → app → notícias → patrocinadores
 * e apoiadores.
 *
 * Fontes (Firestore, as mesmas do ud-app/ud-backoffice): banner = `events`;
 * próxima etapa / todas as etapas = `stageHubs` + `circuits` + cronograma
 * `championships/{cid}/stages/{sid}/schedule`; classificação =
 * `championships/{cid}/pilots`; notícias = `news`; patrocinadores =
 * `patrocinadores` (patrocinaEvento). "Seja um patrocinador" e App são
 * estáticos. Seção sem dado não aparece.
 */
export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [nextEvent, classification, eventSponsors, upcomingStages, news] = await Promise.all([
    getNextRaceEvent(),
    getActiveChampionshipClassification(),
    listEventSponsors(),
    listUpcomingStages(),
    listHomeNews(locale, 3),
  ]);
  const nextStage = upcomingStages[0] ?? null;
  const schedule = nextStage
    ? await getPublicStageSchedule(nextStage.hub.championshipId, nextStage.hub.stageId)
    : [];
  const standings = toStandingsData(classification);

  return (
    <>
      {nextEvent && <NextStageBanner event={nextEvent} locale={locale} />}
      <SponsorCallout data={SPONSOR_CALLOUT} />
      {nextStage && <NextStageSchedule data={toNextStageScheduleData(nextStage, schedule, locale)} />}
      <AllStages stages={toStageCards(upcomingStages, locale)} />
      {standings && <ChampionshipStandings data={standings} />}
      <AppPromo data={APP_PROMO} />
      <HomeNews data={toHomeNewsData(news)} />
      <HomeSponsors data={{ sponsors: eventSponsors.map(eventSponsorToLogo), supporters: [] }} />
    </>
  );
}
