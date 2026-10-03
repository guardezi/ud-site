import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { BackTitle } from "@/components/stages/BackTitle";
import { StageEventCard } from "@/components/stages/StageEventCard";
import { listStageEvents } from "@/lib/stages/events";
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
    title: t("allStages"),
    description: t("listDescription"),
  });
}

/**
 * /etapas — "Todas as etapas" do site legado: "Próximas Etapas" (verde, com
 * "Comprar ingresso") e "Etapas Realizadas" (laranja, "Ver Detalhes"), em
 * ordem cronológica. Fonte: campeonato vigente + stageHubs + events (ver
 * `src/lib/stages/events.ts`).
 */
export default async function EtapasPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("etapas");

  const stages = await listStageEvents();
  const upcoming = stages.filter((s) => s.isUpcoming);
  const past = stages.filter((s) => !s.isUpcoming);

  return (
    <div className="wrapper">
      <BackTitle fallbackHref="/" backLabel={t("back")}>
        {t("allStages")}
      </BackTitle>

      {stages.length === 0 && <p className="steps__grid text-center">{t("emptyList")}</p>}

      {upcoming.length > 0 && (
        <div className="steps__grid">
          <h2 className="steps__title">{t("upcomingStages")}</h2>
          <div className="row g-4">
            {upcoming.map((s) => (
              <StageEventCard key={s.key} stage={s} />
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div className="steps__grid">
          <h2 className="steps__title carried-out">{t("pastStages")}</h2>
          <div className="row g-4">
            {past.map((s) => (
              <StageEventCard key={s.key} stage={s} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
