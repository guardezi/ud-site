import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import { BackTitle } from "@/components/categorias/BackTitle";
import { CATEGORIES } from "@/components/categorias/categories";
import { CategoryBlock, ClassificationLink, PilotsLink } from "@/components/categorias/CategoryBlock";
import { buildMetadata } from "@/lib/seo/meta";
import type { Locale } from "@/i18n/config";

// Conteúdo institucional fixo (i18n + arte do tema) — não lê Firestore.
export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "categorias" });
  return buildMetadata({
    href: "/categorias",
    locale,
    title: t("title"),
    description: t("subtitle"),
  });
}

export default async function CategoriasPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("categorias");

  return (
    <section className="category">
      <div className="wrapper">
        <BackTitle fallbackHref={getPathname({ href: "/", locale })}>{t("title")}</BackTitle>

        {CATEGORIES.map((c, i) => (
          // Zigue-zague do layout legado: a 2ª categoria (Master) com a imagem à direita.
          <CategoryBlock
            key={c.slug}
            category={c}
            text={t(`items.${c.slug}`)}
            flipped={i % 2 === 1}
            links={
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 40px" }}>
                <ClassificationLink category={c} label={t("classification")} />
                <PilotsLink category={c} label={t("viewDrivers")} />
              </div>
            }
          />
        ))}
      </div>
    </section>
  );
}
