import type { Metadata } from "next";
import Image from "next/image";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { listNews } from "@/lib/news/queries";
import { Link } from "@/i18n/navigation";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { buildMetadata } from "@/lib/seo/meta";
import { formatDate } from "@/lib/format";
import type { Locale } from "@/i18n/config";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "noticias" });
  return buildMetadata({
    href: "/noticias",
    locale,
    title: t("title"),
    description: t("subtitle"),
  });
}

export default async function NoticiasPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("noticias");
  const { items } = await listNews({ locale, limit: 12 });

  return (
    <div className="mx-auto max-w-wide px-4 py-12 lg:px-8 lg:py-16">
      <Breadcrumbs items={[{ label: t("title"), href: "/noticias" }]} locale={locale} />

      <header className="mb-10">
        <p className="eyebrow">{t("title")}</p>
        <h1 className="display mt-2 text-4xl text-signal lg:text-5xl">{t("title")}</h1>
        <p className="mt-3 max-w-2xl text-mute">{t("subtitle")}</p>
      </header>

      {items.length === 0 ? (
        <p className="text-mute">{t("empty")}</p>
      ) : (
        <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((n) => (
            <li key={n.id}>
              <Link
                href={{ pathname: "/noticias/[slug]", params: { slug: n.slug } }}
                className="group block rounded border border-rail bg-panel/30 transition-colors hover:border-drift"
              >
                {n.coverImageUrl && (
                  <div className="relative aspect-[16/9] overflow-hidden rounded-t">
                    <Image src={n.coverImageUrl} alt={n.title} fill sizes="400px" className="object-cover" unoptimized />
                  </div>
                )}
                <div className="space-y-2 p-4">
                  {n.publishedAt && (
                    <p className="data text-xs uppercase tracking-wider text-faint">
                      {formatDate(n.publishedAt, locale)}
                    </p>
                  )}
                  <h2 className="display text-xl text-signal group-hover:text-drift">{n.title}</h2>
                  {n.excerpt && <p className="text-sm text-mute line-clamp-3">{n.excerpt}</p>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
