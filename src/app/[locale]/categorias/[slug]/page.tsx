import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getDriftCategoryBySlug, listDriftCategories } from "@/lib/driftCategories/queries";
import { listPublicDrivers } from "@/lib/drivers/queries";
import { DriverGrid } from "@/components/drivers/DriverGrid";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { buildMetadata } from "@/lib/seo/meta";
import type { Locale } from "@/i18n/config";

export const revalidate = 86400;

export async function generateStaticParams() {
  const cats = await listDriftCategories().catch(() => []);
  return cats.map((c) => ({ slug: c.slug }));
}

type PageParams = Promise<{ locale: Locale; slug: string }>;

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { locale, slug } = await params;
  const cat = await getDriftCategoryBySlug(slug).catch(() => null);
  if (!cat) return {};
  return buildMetadata({
    href: "/categorias/[slug]",
    locale,
    params: { slug },
    title: cat.name,
    description: cat.description ?? `Categoria ${cat.name} do Ultimate Drift.`,
  });
}

export default async function CategoryPage({ params }: { params: PageParams }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const cat = await getDriftCategoryBySlug(slug);
  if (!cat) notFound();
  const t = await getTranslations("categorias");

  const allDrivers = await listPublicDrivers();
  const drivers = allDrivers.filter((d) => d.category?.toLowerCase() === cat.name.toLowerCase());

  return (
    <div className="mx-auto max-w-wide px-4 py-12 lg:px-8 lg:py-16">
      <Breadcrumbs
        items={[
          { label: t("title"), href: "/categorias" },
          { label: cat.name, href: "/categorias/[slug]", params: { slug } },
        ]}
        locale={locale}
      />

      <header className="mb-10">
        <p className="eyebrow">{t("title")}</p>
        <h1 className="display mt-2 text-4xl text-signal lg:text-5xl">{cat.name}</h1>
        {cat.description && <p className="mt-3 max-w-2xl text-mute">{cat.description}</p>}
      </header>

      <DriverGrid drivers={drivers} />
    </div>
  );
}
