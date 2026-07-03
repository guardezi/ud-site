import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Hero } from "@/components/home/Hero";
import { TopDriversCard } from "@/components/home/TopDriversCard";
import { WPHomeSnapshot } from "@/components/home/WPHomeSnapshot";
import { StagesList } from "@/components/stages/StagesList";
import { UDImage } from "@/components/ui/UDImage";
import {
  getNextStageHub,
  listStageHubs,
  type PublicStageHubSummary,
} from "@/lib/stages/queries";
import { getCurrentChampionshipStandings } from "@/lib/championship/queries";
import { listLatestNews } from "@/lib/news/queries";
import { buildMetadata } from "@/lib/seo/meta";
import type { Locale } from "@/i18n/config";

export const revalidate = 300;

const SECTION_LINK =
  "text-xs uppercase font-bold tracking-[0.12em] text-mute hover:text-drift";

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

function startMs(h: PublicStageHubSummary): number {
  return h.startDate ? new Date(h.startDate as unknown as string).getTime() : 0;
}

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [next, stages, standings, news] = await Promise.all([
    getNextStageHub(),
    listStageHubs(),
    getCurrentChampionshipStandings(),
    listLatestNews(locale, 3),
  ]);

  const now = Date.now();
  const upcoming = stages
    .filter((h) => startMs(h) >= now)
    .sort((a, b) => startMs(a) - startMs(b))
    .slice(0, 3);
  const topEntries = standings?.entries ?? [];

  // Everything empty (Firestore not seeded yet) → fall back to legacy WP snapshot.
  const hasAny =
    Boolean(next) || upcoming.length > 0 || topEntries.length > 0 || news.length > 0;
  if (!hasAny) {
    return <WPHomeSnapshot />;
  }

  const [t, tEtapas] = await Promise.all([
    getTranslations("home"),
    getTranslations("etapas"),
  ]);

  return (
    <>
      {next && <Hero nextStage={next} locale={locale} />}

      <div className="mx-auto max-w-wide space-y-16 px-4 py-12 lg:px-8 lg:py-16">
        {(upcoming.length > 0 || topEntries.length > 0) && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {upcoming.length > 0 && (
              <section className="lg:col-span-2">
                <div className="mb-4 flex items-end justify-between">
                  <h2 className="display text-2xl text-signal">{tEtapas("future")}</h2>
                  <Link href="/etapas" className={SECTION_LINK}>
                    {t("viewAllStages")} →
                  </Link>
                </div>
                <StagesList stages={upcoming} locale={locale} />
              </section>
            )}
            {topEntries.length > 0 && (
              <div className={upcoming.length > 0 ? "" : "lg:col-span-3"}>
                <TopDriversCard entries={topEntries} />
              </div>
            )}
          </div>
        )}

        {news.length > 0 && (
          <section>
            <div className="mb-4 flex items-end justify-between">
              <h2 className="display text-2xl text-signal">{t("latestNews")}</h2>
              <Link href="/noticias" className={SECTION_LINK}>
                {t("viewAllNews")} →
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {news.map((n) => (
                <Link
                  key={n.id}
                  href={{ pathname: "/noticias/[slug]", params: { slug: n.slug } }}
                  className="card-ud group block"
                >
                  <div className="relative aspect-[16/9] overflow-hidden bg-shade">
                    <UDImage
                      src={n.coverImagePath}
                      alt={n.title}
                      baseVariant="medium"
                      srcsetPreset="responsive"
                      sizes="(min-width: 768px) 33vw, 100vw"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </div>
                  <div className="space-y-2 p-5">
                    {n.category && <p className="eyebrow">{n.category}</p>}
                    <h3 className="display text-lg text-signal transition-colors group-hover:text-drift">
                      {n.title}
                    </h3>
                    {n.excerpt && (
                      <p className="line-clamp-2 text-sm text-mute">{n.excerpt}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
