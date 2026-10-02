import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { NextStageBanner } from "@/components/home/NextStageBanner";
import { SponsorCallout } from "@/components/home/SponsorCallout";
import { NextStageSchedule } from "@/components/home/NextStageSchedule";
import { AllStages } from "@/components/home/AllStages";
import { ChampionshipStandings, toStandingsData } from "@/components/home/ChampionshipStandings";
import { AppPromo } from "@/components/home/AppPromo";
import { HomeNews } from "@/components/home/HomeNews";
import { HomeSponsors, eventSponsorToLogo } from "@/components/home/HomeSponsors";
// MOCK — dados fixos até a fonte de cada seção ser definida.
import { SPONSOR_CALLOUT_MOCK } from "@/components/home/sponsor-callout.mock";
import { NEXT_STAGE_SCHEDULE_MOCK } from "@/components/home/next-stage-schedule.mock";
import { ALL_STAGES_MOCK } from "@/components/home/all-stages.mock";
import { APP_PROMO_MOCK } from "@/components/home/app-promo.mock";
import { HOME_NEWS_MOCK } from "@/components/home/home-news.mock";
import { HOME_SUPPORTERS_MOCK } from "@/components/home/home-sponsors.mock";
import { getNextRaceEvent } from "@/lib/events/queries";
import { getActiveChampionshipClassification } from "@/lib/championship/queries";
import { listEventSponsors } from "@/lib/sponsors/queries";
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
 * e apoiadores. Banner (`events`), classificação (`championships`) e
 * patrocinadores (`patrocinadores`, só os do evento) leem o Firestore; o resto
 * é mock.
 */
export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [nextEvent, classification, eventSponsors] = await Promise.all([
    getNextRaceEvent(),
    getActiveChampionshipClassification(),
    listEventSponsors(),
  ]);
  const standings = toStandingsData(classification);

  return (
    <>
      {nextEvent && <NextStageBanner event={nextEvent} locale={locale} />}
      <SponsorCallout data={SPONSOR_CALLOUT_MOCK} />
      <NextStageSchedule data={NEXT_STAGE_SCHEDULE_MOCK} />
      <AllStages stages={ALL_STAGES_MOCK} />
      {standings && <ChampionshipStandings data={standings} />}
      <AppPromo data={APP_PROMO_MOCK} />
      <HomeNews data={HOME_NEWS_MOCK} />
      <HomeSponsors
        data={{ sponsors: eventSponsors.map(eventSponsorToLogo), supporters: HOME_SUPPORTERS_MOCK }}
      />
    </>
  );
}
