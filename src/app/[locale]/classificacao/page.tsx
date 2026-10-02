import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { ClassificationBoard } from "@/components/standings/ClassificationBoard";
import { getClassificationSeasons } from "@/lib/championship/seasons";
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

  const { seasons, activeChampionshipId } = await getClassificationSeasons();

  if (seasons.length === 0) {
    return (
      <section className="rank">
        <div className="wrapper">
          <div className="ui__title">
            <h1>{t("title")}</h1>
          </div>
          <p className="text-mute" style={{ marginTop: 40 }}>
            {t("empty")}
          </p>
        </div>
      </section>
    );
  }

  // Abre na temporada do campeonato vigente (settings/publicRound), senão na mais recente.
  const initial =
    seasons.find((s) => s.championshipId === activeChampionshipId)?.championshipId ??
    seasons[seasons.length - 1]!.championshipId;

  return <ClassificationBoard seasons={seasons} initialChampionshipId={initial} />;
}
