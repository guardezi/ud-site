import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { listPublicDrivers } from "@/lib/drivers/queries";
import { JsonLd } from "@/components/seo/JsonLd";
import { itemListLd } from "@/lib/seo/jsonld";
import { canonical } from "@/lib/seo/canonical";
import { buildMetadata } from "@/lib/seo/meta";
import { BackTitle } from "@/components/drivers/BackTitle";
import { DriversFilterList, type DriverListItem } from "@/components/drivers/DriversFilterList";
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

function badge(category: string | null): DriverListItem["badge"] {
  const c = (category ?? "").toUpperCase();
  return c === "MASTER" || c === "ROOKIE" ? c : null;
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
    <section className="drivers">
      <div className="wrapper">
        <BackTitle href="/" title={t("title")} />
        <DriversFilterList
          drivers={drivers.map((d) => ({
            id: d.id,
            slug: d.slug,
            apelido: d.apelido,
            numero: d.numero,
            fotoPath: d.fotoPath,
            badge: badge(d.category),
          }))}
          labels={{
            search: t("search"),
            placeholder: t("searchPlaceholder"),
            noResults: t("noResults"),
            viewProfile: t("viewProfile", { name: "{name}" }),
            photoAlt: t("photoAlt", { name: "{name}" }),
          }}
        />
      </div>
      <JsonLd data={ld} />
    </section>
  );
}
