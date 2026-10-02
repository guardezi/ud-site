import { notFound } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import { CATEGORIES } from "@/components/categorias/categories";
import type { Locale } from "@/i18n/config";

/**
 * O site legado não tem página por categoria: o botão de cada categoria leva
 * pra classificação filtrada. Esta rota existia no ud-site (lia
 * `driftCategories`, que só tem categorias de NOTÍCIA importadas do WP) e é
 * mantida só como redirect pra não quebrar links: /categorias/rookie →
 * /classificacao?categoria=rookie, /categorias/pro → /classificacao.
 */
export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  const cat = CATEGORIES.find((c) => c.slug === slug.toLowerCase());
  if (!cat) notFound();
  redirect({
    href: cat.classificationFilter
      ? { pathname: "/classificacao", query: { categoria: cat.classificationFilter } }
      : "/classificacao",
    locale,
  });
}
