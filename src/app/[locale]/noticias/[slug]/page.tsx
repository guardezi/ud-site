import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getNewsBySlug, listAllNewsSlugs } from "@/lib/news/queries";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { articleLd } from "@/lib/seo/jsonld";
import { canonical } from "@/lib/seo/canonical";
import { buildMetadata } from "@/lib/seo/meta";
import { renderMarkdown } from "@/lib/utils/markdown";
import { formatDate } from "@/lib/format";
import type { Locale } from "@/i18n/config";

export const revalidate = 3600;

export async function generateStaticParams() {
  const news = await listAllNewsSlugs().catch(() => []);
  return news.map((n) => ({ slug: n.slug }));
}

type PageParams = Promise<{ locale: Locale; slug: string }>;

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { locale, slug } = await params;
  const article = await getNewsBySlug(slug, locale).catch(() => null);
  if (!article) return {};
  return buildMetadata({
    href: "/noticias/[slug]",
    locale,
    params: { slug },
    title: article.seo.title ?? article.title,
    description: article.seo.description ?? article.excerpt,
    image: article.coverImageHighUrl ?? article.coverImageUrl ?? undefined,
    type: "article",
    publishedTime: article.publishedAt?.toISOString(),
    modifiedTime: article.updatedAt?.toISOString(),
  });
}

export default async function NoticiaPage({ params }: { params: PageParams }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("noticias");
  const article = await getNewsBySlug(slug, locale);
  if (!article) notFound();

  const ld = articleLd({
    headline: article.title,
    url: canonical("/noticias/[slug]", locale, { slug }),
    datePublished: article.publishedAt?.toISOString() ?? new Date().toISOString(),
    dateModified: article.updatedAt?.toISOString(),
    authorName: article.author ?? undefined,
    image: article.coverImageHighUrl ?? article.coverImageUrl ?? null,
    description: article.excerpt,
  });

  return (
    <div className="mx-auto max-w-narrow px-4 py-12 lg:px-8 lg:py-16">
      <Breadcrumbs
        items={[
          { label: t("title"), href: "/noticias" },
          { label: article.title, href: "/noticias/[slug]", params: { slug } },
        ]}
        locale={locale}
      />

      <header className="mb-8">
        {article.category && <p className="eyebrow">{article.category}</p>}
        <h1 className="display mt-2 text-4xl text-signal lg:text-5xl">{article.title}</h1>
        <p className="mt-3 text-sm text-mute">
          {article.publishedAt && t("publishedAt", { date: formatDate(article.publishedAt, locale) })}
          {article.author && (
            <>
              {" · "}
              {t("by", { author: article.author })}
            </>
          )}
        </p>
      </header>

      {article.coverImageHighUrl && (
        <div className="relative mb-10 aspect-[16/9] overflow-hidden rounded border border-rail">
          <Image
            src={article.coverImageHighUrl}
            alt={article.title}
            fill
            priority
            sizes="(min-width: 1024px) 900px, 100vw"
            className="object-cover"
            unoptimized
          />
        </div>
      )}

      <article className="prose-ud" dangerouslySetInnerHTML={{ __html: renderMarkdown(article.body) }} />

      <JsonLd data={ld} />
    </div>
  );
}
