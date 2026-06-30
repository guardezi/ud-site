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

const MONTH_PT = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function formatPtBr(date: Date | null): string {
  if (!date) return "";
  return `${date.getDate()} de ${MONTH_PT[date.getMonth()]} de ${date.getFullYear()}`;
}

export default async function NoticiaPage({ params }: { params: PageParams }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const article = await getNewsBySlug(slug, locale);
  if (!article) notFound();

  const ld = articleLd({
    headline: article.title,
    url: canonical("/noticias/[slug]", locale, { slug }),
    datePublished: toIso(article.publishedAt) ?? new Date().toISOString(),
    dateModified: toIso(article.updatedAt) ?? undefined,
    authorName: article.author ?? undefined,
    image: article.coverImageHighUrl ?? article.coverImageUrl ?? null,
    description: article.excerpt,
  });

  const publishedDate = article.publishedAt instanceof Date
    ? article.publishedAt
    : article.publishedAt
      ? new Date(article.publishedAt as unknown as string)
      : null;
  const publishedLabel = publishedDate ? `Publicado em ${formatPtBr(publishedDate)}` : "";

  return (
    <div className="wrapper">
      <Link href="/noticias" className="ui__title" data-animate="slide-bottom">
        <svg className="ui__icon" width="15" height="27" viewBox="0 0 15 27" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M13.5208 26.7703C13.8818 27.1025 14.4396 27.0692 14.7678 26.7039C15.096 26.3386 15.0632 25.774 14.7022 25.4419L2.00202 13.8182C1.67385 13.5193 1.67385 13.0875 2.00202 12.7886L14.7022 1.5634C15.0632 1.23129 15.096 0.666705 14.8006 0.301387C14.4725 -0.0639308 13.9146 -0.0971413 13.5536 0.201755L0.853422 11.4602C-0.262355 12.4565 -0.295172 14.1171 0.820606 15.1466L13.5208 26.7703Z"
            fill="#54F251"
          />
        </svg>
        <h1>{article.title}</h1>
      </Link>

      <main className="single-post-container">
        <article className="post-content">
          <header className="post-header" data-animate="slide-bottom">
            {publishedLabel && (
              <div className="post-meta">
                <span>{publishedLabel}</span>
                {article.author && <> • <span>{article.author}</span></>}
                {article.category && <> • <span>{article.category}</span></>}
              </div>
            )}
            {article.coverImageHighUrl && (
              <div className="post-thumbnail">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  width={1024}
                  height={683}
                  src={article.coverImageHighUrl}
                  alt={article.title}
                  decoding="async"
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
        </article>
      </main>

      <JsonLd data={ld} />
    </div>
  );
}
