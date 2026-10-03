import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import { BackTitle } from "@/components/categorias/BackTitle";
import { CATEGORIES } from "@/components/categorias/categories";
import { CategoryBlock, ClassificationLink } from "@/components/categorias/CategoryBlock";
import { CategoryPilotGrid } from "@/components/categorias/CategoryPilotGrid";
import { listCategoryPilots } from "@/lib/categorias/pilots";
import { buildMetadata } from "@/lib/seo/meta";
import type { Locale } from "@/i18n/config";

/**
 * Página da categoria (não existe no site legado; pedida pelo usuário):
 * arte + texto da categoria e a grade de pilotos do campeonato vigente nela,
 * no estilo da /pilotos do tema antigo. Dados: lib/categorias/pilots.ts.
 */
export const revalidate = 300;

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

type PageParams = Promise<{ locale: Locale; slug: string }>;

const findCategory = (slug: string) => CATEGORIES.find((c) => c.slug === slug);

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { locale, slug } = await params;
  const cat = findCategory(slug);
  if (!cat) return {};
  const t = await getTranslations({ locale, namespace: "categorias" });
  return buildMetadata({
    href: "/categorias/[slug]",
    locale,
    params: { slug },
    title: t("detailTitle", { name: cat.label }),
    description: t(`items.${cat.slug}`),
  });
}

export default async function CategoryPage({ params }: { params: PageParams }) {
  const { locale, slug } = await params;
  const cat = findCategory(slug);
  if (!cat) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("categorias");
  const pilots = await listCategoryPilots(cat.slug);

  return (
    <>
      <section className="category">
        <div className="wrapper">
          <BackTitle fallbackHref={getPathname({ href: "/categorias", locale })}>{cat.label}</BackTitle>
          <CategoryBlock
            category={cat}
            text={t(`items.${cat.slug}`)}
            links={<ClassificationLink category={cat} label={t("classification")} />}
          />
        </div>
      </section>

      <section className="drivers">
        <div className="wrapper">
          <h2 className="ui__title" data-animate="slide-bottom">
            {t("driversTitle")}
          </h2>
          {pilots && pilots.length > 0 ? (
            <CategoryPilotGrid
              pilots={pilots}
              viewProfile={(name) => t("viewProfile", { name })}
              photoAlt={(name) => t("photoAlt", { name })}
            />
          ) : (
            <p style={{ padding: "40px 0", textAlign: "center", color: "#9b9b9b" }}>{t("noDrivers")}</p>
          )}
        </div>
      </section>
    </>
  );
}
