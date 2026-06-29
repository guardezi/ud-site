import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getCurrentChampionshipStandings } from "@/lib/championship/queries";
import { StandingsTable } from "@/components/standings/StandingsTable";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
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

  return (
    <div className="mx-auto max-w-wide px-4 py-12 lg:px-8 lg:py-16">
      <Breadcrumbs items={[{ label: t("title"), href: "/classificacao" }]} locale={locale} />

      <header className="mb-10">
        <p className="eyebrow">{t("title")}</p>
        <h1 className="display mt-2 text-4xl text-signal lg:text-5xl">{t("title")}</h1>
        <p className="mt-3 max-w-2xl text-mute">{t("subtitle")}</p>
      </header>

      {standings ? <StandingsTable entries={standings.entries} /> : <p className="text-mute">{t("empty")}</p>}
    </div>
  );
}
