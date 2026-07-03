import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { WPPageSnapshot } from "@/components/home/WPPageSnapshot";
import { StagesList } from "@/components/stages/StagesList";
import { listStageHubs, getNextStageHub, type PublicStageHubSummary } from "@/lib/stages/queries";
import { buildMetadata } from "@/lib/seo/meta";
import type { Locale } from "@/i18n/config";

export const revalidate = 600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "etapas" });
  return buildMetadata({
    href: "/etapas",
    locale,
    title: t("title"),
    description: t("subtitle"),
  });
}

function startMs(h: PublicStageHubSummary): number {
  return h.startDate ? new Date(h.startDate as unknown as string).getTime() : 0;
}

export default async function EtapasPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("etapas");

  const [stages, next] = await Promise.all([listStageHubs(), getNextStageHub()]);

  // Fallback to legacy WP snapshot until admin seeds Firestore stage hubs.
  if (stages.length === 0) {
    return <WPPageSnapshot slug="etapas" />;
  }

  const now = Date.now();
  const upcoming = stages
    .filter((h) => startMs(h) >= now)
    .sort((a, b) => startMs(a) - startMs(b));
  const upcomingIds = new Set(upcoming.map((h) => h.id));
  // listStageHubs is already ordered startDate desc.
  const past = stages.filter((h) => !upcomingIds.has(h.id));

  return (
    <div className="mx-auto max-w-wide px-4 py-12 lg:px-8 lg:py-16">
      <header className="mb-10">
        <p className="eyebrow">{t("title")}</p>
        <h1 className="display mt-2 text-4xl text-signal lg:text-5xl">{t("title")}</h1>
        <p className="mt-3 max-w-2xl text-mute">{t("subtitle")}</p>
      </header>

      {upcoming.length > 0 && (
        <section className="mb-12">
          <h2 className="display mb-4 text-2xl text-signal">
            {next && next.id === upcoming[0].id ? t("next") : t("future")}
          </h2>
          <StagesList stages={upcoming} locale={locale} />
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="display mb-4 text-2xl text-signal">{t("past")}</h2>
          <StagesList stages={past} locale={locale} />
        </section>
      )}
    </div>
  );
}
