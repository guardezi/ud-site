import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getNewsBySlug, listAllNewsSlugs } from "@/lib/news/queries";
import { JsonLd } from "@/components/seo/JsonLd";
import { articleLd } from "@/lib/seo/jsonld";
import { canonical } from "@/lib/seo/canonical";
import { buildMetadata } from "@/lib/seo/meta";
import { renderMarkdown } from "@/lib/utils/markdown";
import { toIso } from "@/lib/firestore-utils";
import { UDImage } from "@/components/ui/UDImage";
import { ChevronIcon } from "@/components/noticias/ChevronIcon";
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
    publishedTime: toIso(article.publishedAt) ?? undefined,
    modifiedTime: toIso(article.updatedAt) ?? undefined,
  });
}

/**
 * Avatar genérico (silhueta cinza) no lugar do Gravatar "mystery person" que o
 * WP mostrava pro autor — o doc em `news` só guarda o nome do autor.
 */
const AVATAR_PLACEHOLDER =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="#d1d5db"/><circle cx="40" cy="31" r="15" fill="#f3f4f6"/><path d="M12 80c2-17 14-27 28-27s26 10 28 27z" fill="#f3f4f6"/></svg>',
  );

export default async function NoticiaPage({ params }: { params: PageParams }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const article = await getNewsBySlug(slug, locale);
  if (!article) notFound();
  const t = await getTranslations("noticias");

  const ld = articleLd({
    headline: article.title,
    url: canonical("/noticias/[slug]", locale, { slug }),
    datePublished: toIso(article.publishedAt) ?? new Date().toISOString(),
    dateModified: toIso(article.updatedAt) ?? undefined,
    authorName: article.author ?? undefined,
    image: article.coverImageHighUrl ?? article.coverImageUrl ?? null,
    description: article.excerpt,
  });

  const publishedLabel = article.publishedAt
    ? t("publishedAt", {
        date: new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "America/Sao_Paulo" }).format(
          article.publishedAt,
        ),
      })
    : "";

  return (
    <div className="wrapper">
      <Link href="/noticias" className="ui__title" data-animate="slide-bottom">
        <ChevronIcon className="ui__icon" width={15} height={27} />
        <h1 className="">{article.title}</h1>
      </Link>

      <main className="single-post-container">
        <article className="post-content">
          <header className="post-header" data-animate="slide-bottom">
            {publishedLabel && (
              <div className="post-meta">
                <span>{publishedLabel}</span>
              </div>
            )}
            {article.coverImagePath && (
              <div className="post-thumbnail">
                <UDImage
                  src={article.coverImagePath}
                  alt=""
                  baseVariant="high"
                  srcsetPreset="responsive"
                  sizes="(max-width: 1024px) 100vw, 1024px"
                  width={1024}
                  height={683}
                  loading="eager"
                  fetchPriority="high"
                />
              </div>
            )}
          </header>

          <div
            className="post-body"
            data-animate="slide-bottom"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(article.body) }}
          />

          <footer className="post-footer" data-animate="slide-bottom">
            {article.tags.length > 0 && (
              <div className="tags">
                {article.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            )}
            {article.author && (
              <div className="author-box">
                <div className="author-avatar">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={AVATAR_PLACEHOLDER} alt="" width={60} height={60} />
                </div>
                <div className="author-info">
                  <h4>{article.author}</h4>
                </div>
              </div>
            )}
          </footer>
        </article>
      </main>

      <JsonLd data={ld} />
    </div>
  );
}
