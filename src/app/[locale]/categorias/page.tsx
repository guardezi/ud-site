import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { WPPageSnapshot } from "@/components/home/WPPageSnapshot";
import { listDriftCategories } from "@/lib/driftCategories/queries";
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

  // Fallback to legacy WP snapshot until admin seeds Firestore categories.
  if (categories.length === 0) {
    return <WPPageSnapshot slug="categorias" />;
  }

  return (
    <div className="mx-auto max-w-wide px-4 py-12 lg:px-8 lg:py-16">
      <header className="mb-10">
        <p className="eyebrow">{t("title")}</p>
        <h1 className="display mt-2 text-4xl text-signal lg:text-5xl">{t("title")}</h1>
        <p className="mt-3 max-w-2xl text-mute">{t("subtitle")}</p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <Link
            key={c.id}
            href={{ pathname: "/categorias/[slug]", params: { slug: c.slug } }}
            className="card-ud group block p-6"
          >
            {c.icon && (
              <div className="mb-3 text-3xl" aria-hidden>
                {c.icon}
              </div>
            )}
            <h2 className="display text-2xl text-signal group-hover:text-drift transition-colors">
              {c.name}
            </h2>
            {c.description && <p className="mt-2 text-sm text-mute">{c.description}</p>}
          </Link>
        ))}
      </div>
    </div>
  );
}
