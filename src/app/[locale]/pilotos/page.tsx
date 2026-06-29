import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { listPublicDrivers } from "@/lib/drivers/queries";
import { DriverGrid } from "@/components/drivers/DriverGrid";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildMetadata } from "@/lib/seo/meta";
import { itemListLd } from "@/lib/seo/jsonld";
import { canonical } from "@/lib/seo/canonical";
import type { Locale } from "@/i18n/config";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pilotos" });
  return buildMetadata({
    href: "/pilotos",
    locale,
    title: t("title"),
    description: t("subtitle"),
  });
}

export default async function PilotosPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pilotos");
  const drivers = await listPublicDrivers();

  const ld = itemListLd({
    name: t("title"),
    url: canonical("/pilotos", locale),
    items: drivers.map((d) => ({
      name: d.apelido,
      url: canonical("/pilotos/[slug]", locale, { slug: d.slug }),
      image: d.fotoUrl,
    })),
  });

  return (
    <div className="mx-auto max-w-wide px-4 py-12 lg:px-8 lg:py-16">
      <Breadcrumbs items={[{ label: t("title"), href: "/pilotos" }]} locale={locale} />

      <header className="mb-10">
        <p className="eyebrow">{t("title")}</p>
        <h1 className="display mt-2 text-4xl text-signal lg:text-5xl">{t("title")}</h1>
        <p className="mt-3 max-w-2xl text-mute">{t("subtitle")}</p>
      </header>

      {drivers.length > 0 ? <DriverGrid drivers={drivers} /> : <p className="text-mute">{t("noResults")}</p>}

      <JsonLd data={ld} />
    </div>
  );
}
