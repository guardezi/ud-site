import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { WPPageSnapshot } from "@/components/home/WPPageSnapshot";
import { StandingsTable } from "@/components/standings/StandingsTable";
import { getCurrentChampionshipStandings } from "@/lib/championship/queries";
import { buildMetadata } from "@/lib/seo/meta";
import type { Locale } from "@/i18n/config";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "classificacao" });
  return buildMetadata({
    href: "/classificacao",
    locale,
    title: t("title"),
    description: t("subtitle"),
  });
}

export default async function ClassificacaoPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("classificacao");

  const standings = await getCurrentChampionshipStandings();

  // TODO: query exposes only the current championship (single ranking, no
  // category/season split). When publicChampionshipHistory grows a season or
  // category dimension, add a selector here and render one table per category.
  if (!standings || standings.entries.length === 0) {
    return <WPPageSnapshot slug="classificacao" />;
  }

  return (
    <section className="wrapper" style={{ padding: "60px 0" }}>
      <div className="ui__title" data-animate="slide-bottom">
        <h1>{t("title")}</h1>
        <p className="text-mute">{t("subtitle")}</p>
      </div>
      <StandingsTable entries={standings.entries} />
    </section>
  );
}
