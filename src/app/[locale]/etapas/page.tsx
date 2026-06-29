import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { listStageHubs } from "@/lib/stages/queries";
import { StagesList } from "@/components/stages/StagesList";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { itemListLd } from "@/lib/seo/jsonld";
import { canonical } from "@/lib/seo/canonical";
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

export default async function EtapasPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("etapas");
  const stages = await listStageHubs();
  const now = Date.now();
  const upcoming = stages.filter((s) => s.startDate && s.startDate.getTime() >= now);
  const past = stages.filter((s) => s.startDate && s.startDate.getTime() < now);

  const ld = itemListLd({
    name: t("title"),
    url: canonical("/etapas", locale),
    items: stages.map((s) => ({
      name: s.name,
      url: canonical("/etapas/[slug]", locale, { slug: s.slug }),
      image: s.posterImageUrl,
    })),
  });

  return (
    <div className="mx-auto max-w-wide px-4 py-12 lg:px-8 lg:py-16">
      <Breadcrumbs items={[{ label: t("title"), href: "/etapas" }]} locale={locale} />

      <header className="mb-10">
        <p className="eyebrow">{t("title")}</p>
        <h1 className="display mt-2 text-4xl text-signal lg:text-5xl">{t("title")}</h1>
        <p className="mt-3 max-w-2xl text-mute">{t("subtitle")}</p>
      </header>

      {upcoming.length > 0 && (
        <section className="mb-12">
          <h2 className="eyebrow mb-4">{t("future")}</h2>
          <StagesList stages={upcoming} locale={locale} />
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="eyebrow mb-4">{t("past")}</h2>
          <StagesList stages={past} locale={locale} />
        </section>
      )}

      {stages.length === 0 && <p className="text-mute">{t("noEvents")}</p>}

      <JsonLd data={ld} />
    </div>
  );
}
