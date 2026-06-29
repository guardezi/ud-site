import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getNextStageHub, listStageHubs } from "@/lib/stages/queries";
import { getCurrentChampionshipStandings } from "@/lib/championship/queries";
import { Hero } from "@/components/home/Hero";
import { TopDriversCard } from "@/components/home/TopDriversCard";
import { StagesList } from "@/components/stages/StagesList";
import { Link } from "@/i18n/navigation";
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

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  const [nextStage, allStages, standings] = await Promise.all([
    getNextStageHub(),
    listStageHubs(),
    getCurrentChampionshipStandings(),
  ]);
  const upcoming = allStages.slice(0, 3);

  return (
    <>
      <Hero nextStage={nextStage} locale={locale} />

      <div className="mx-auto max-w-wide px-4 py-12 lg:px-8 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-3">
          <section className="lg:col-span-2">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <p className="eyebrow">{t("nextStage")}</p>
                <h2 className="display mt-2 text-3xl text-signal">{nextStage?.name ?? "—"}</h2>
              </div>
              <Link
                href="/etapas"
                className="text-xs uppercase tracking-[0.18em] text-mute hover:text-drift"
              >
                {t("viewAllStages")} →
              </Link>
            </div>
            <StagesList stages={upcoming} locale={locale} />
          </section>

          <aside>
            {standings && <TopDriversCard entries={standings.entries} />}
          </aside>
        </div>
      </div>
    </>
  );
}
