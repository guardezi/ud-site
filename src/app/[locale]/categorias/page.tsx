import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { listDriftCategories } from "@/lib/driftCategories/queries";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Link } from "@/i18n/navigation";
import { buildMetadata } from "@/lib/seo/meta";
import type { Locale } from "@/i18n/config";

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
  const categories = await listDriftCategories();

  return (
    <div className="mx-auto max-w-wide px-4 py-12 lg:px-8 lg:py-16">
      <Breadcrumbs items={[{ label: t("title"), href: "/categorias" }]} locale={locale} />

      <header className="mb-10">
        <p className="eyebrow">{t("title")}</p>
        <h1 className="display mt-2 text-4xl text-signal lg:text-5xl">{t("title")}</h1>
        <p className="mt-3 max-w-2xl text-mute">{t("subtitle")}</p>
      </header>

      {categories.length === 0 ? (
        <p className="text-mute">{t("empty")}</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <li key={c.id}>
              <Link
                href={{ pathname: "/categorias/[slug]", params: { slug: c.slug } }}
                className="block rounded border border-rail bg-panel/30 p-5 transition-colors hover:border-drift"
              >
                <h3 className="display text-2xl text-signal">{c.name}</h3>
                {c.description && <p className="mt-2 text-sm text-mute">{c.description}</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
