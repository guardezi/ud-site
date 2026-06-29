import type { Metadata } from "next";
import Image from "next/image";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { listSponsors } from "@/lib/sponsors/queries";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { buildMetadata } from "@/lib/seo/meta";
import type { Locale } from "@/i18n/config";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "patrocinadores" });
  return buildMetadata({
    href: "/patrocinadores",
    locale,
    title: t("title"),
    description: t("subtitle"),
  });
}

export default async function PatrocinadoresPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("patrocinadores");
  const sponsors = await listSponsors();

  return (
    <div className="mx-auto max-w-wide px-4 py-12 lg:px-8 lg:py-16">
      <Breadcrumbs items={[{ label: t("title"), href: "/patrocinadores" }]} locale={locale} />

      <header className="mb-10">
        <p className="eyebrow">{t("title")}</p>
        <h1 className="display mt-2 text-4xl text-signal lg:text-5xl">{t("title")}</h1>
        <p className="mt-3 max-w-2xl text-mute">{t("subtitle")}</p>
      </header>

      {sponsors.length === 0 ? (
        <p className="text-mute">{t("empty")}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {sponsors.map((s) => (
            <li key={s.id}>
              <a
                href={s.website ?? "#"}
                target={s.website ? "_blank" : undefined}
                rel={s.website ? "noopener noreferrer" : undefined}
                className="block rounded border border-rail bg-panel/30 p-5 text-center transition-colors hover:border-drift"
              >
                {s.logoUrl ? (
                  <div className="relative mx-auto aspect-video">
                    <Image src={s.logoUrl} alt={s.name} fill sizes="200px" className="object-contain" unoptimized />
                  </div>
                ) : (
                  <span className="display text-xl text-signal">{s.name}</span>
                )}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
