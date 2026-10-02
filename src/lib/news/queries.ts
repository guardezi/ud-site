import "server-only";
import { unstable_cache } from "next/cache";
import { adminDb } from "@/lib/firebase/admin";
import { imageHigh, imageMedium } from "@/lib/firebase/image-variants";
import { asArray, asRecord, str, tsToDate } from "@/lib/firestore-utils";
import type { Locale } from "@/i18n/config";

export type NewsSummary = {
  id: string;
  slug: string;
  locale: Locale;
  title: string;
  excerpt: string;
  coverImagePath: string | null;
  coverImageUrl: string | null;
  author: string | null;
  category: string | null;
  tags: string[];
  publishedAt: Date | null;
};

export type NewsArticle = NewsSummary & {
  body: string;
  coverImageHighUrl: string | null;
  updatedAt: Date | null;
  seo: { title: string | null; description: string | null; ogImagePath: string | null };
};

/**
 * `publishedAt` dos posts migrados é string "YYYY-MM-DD" (data do WP, sem
 * hora). `new Date("2026-01-16")` vira meia-noite UTC = 15/01 21h em
 * Brasília; ancorar no meio-dia UTC mantém o dia certo em qualquer fuso BR.
 */
function publishedDate(v: unknown): Date | null {
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return tsToDate(`${v}T12:00:00Z`);
  return tsToDate(v);
}

function docToSummary(id: string, d: Record<string, unknown>): NewsSummary {
  const coverImagePath = str(d.coverImagePath);
  return {
    id,
    slug: str(d.slug) ?? id,
    locale: ((str(d.locale) as Locale) ?? "pt-BR"),
    title: str(d.title) ?? "",
    excerpt: str(d.excerpt) ?? "",
    coverImagePath,
    coverImageUrl: imageMedium(coverImagePath),
    author: str(d.author),
    category: str(d.category),
    tags: asArray<string>(d.tags),
    publishedAt: publishedDate(d.publishedAt),
  };
}

function docToArticle(id: string, d: Record<string, unknown>): NewsArticle {
  const base = docToSummary(id, d);
  const seo = asRecord(d.seo) ?? {};
  return {
    ...base,
    body: str(d.body) ?? "",
    coverImageHighUrl: imageHigh(base.coverImagePath),
    updatedAt: tsToDate(d.updatedAt),
    seo: {
      title: str(seo.title),
      description: str(seo.description),
      ogImagePath: str(seo.ogImagePath),
    },
  };
}

/**
 * Todas as notícias publicadas de um locale, mais recentes primeiro.
 *
 * Só filtros de igualdade (status + locale): o Firestore resolve isso com os
 * índices de campo único, sem índice composto. A ordenação por `publishedAt`
 * é feita em memória — a coleção é pequena (dezenas de docs, migração do WP).
 * Com `orderBy` no servidor a query exigiria um índice composto
 * (status, locale, publishedAt desc) que não existe em nenhum projeto, e o
 * erro FAILED_PRECONDITION fazia a listagem cair sempre no estado vazio.
 *
 * Os posts migrados do WordPress só existem em pt-BR; em en-US/es-ES, sem
 * nenhuma notícia própria do locale, cai pro pt-BR (mesmo conteúdo do site
 * antigo, que só tinha português).
 */
async function fetchPublishedNews(locale: Locale): Promise<NewsSummary[]> {
  const byLocale = async (l: Locale) => {
    const snap = await adminDb
      .collection("news")
      .where("status", "==", "published")
      .where("locale", "==", l)
      .get();
    return snap.docs
      .map((d) => docToSummary(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0));
  };
  const items = await byLocale(locale);
  if (items.length > 0 || locale === "pt-BR") return items;
  return byLocale("pt-BR");
}

const cachedPublishedNews = (locale: Locale) =>
  unstable_cache(
    async () => {
      try {
        // Date não sobrevive à serialização do cache: guarda ISO e reidrata.
        const items = await fetchPublishedNews(locale);
        return items.map((n) => ({ ...n, publishedAt: n.publishedAt?.toISOString() ?? null }));
      } catch (err) {
        console.error("[news] listNews falhou", err);
        return [];
      }
    },
    [`news-published-${locale}`],
    { revalidate: 60, tags: ["news", `news:${locale}`] },
  )();

/** Lista paginada de notícias publicadas (mais recentes primeiro). */
export async function listNews(opts: {
  locale: Locale;
  limit?: number;
  offset?: number;
}): Promise<{ items: NewsSummary[]; total: number }> {
  const limit = opts.limit ?? 12;
  const offset = opts.offset ?? 0;
  const all = (await cachedPublishedNews(opts.locale)).map((n) => ({
    ...n,
    publishedAt: n.publishedAt ? new Date(n.publishedAt) : null,
  }));
  return { items: all.slice(offset, offset + limit), total: all.length };
}

export async function listLatestNews(locale: Locale, n = 6): Promise<NewsSummary[]> {
  const { items } = await listNews({ locale, limit: n, offset: 0 });
  return items;
}

export async function getNewsBySlug(slug: string, locale: Locale): Promise<NewsArticle | null> {
  const fn = unstable_cache(
    async () => {
      try {
        const find = async (l: Locale) => {
          const snap = await adminDb
            .collection("news")
            .where("slug", "==", slug)
            .where("locale", "==", l)
            .where("status", "==", "published")
            .limit(1)
            .get();
          return snap.docs[0] ?? null;
        };
        // Mesmo fallback da listagem: posts migrados só existem em pt-BR.
        const doc = (await find(locale)) ?? (locale !== "pt-BR" ? await find("pt-BR") : null);
        if (!doc) return null;
        const article = docToArticle(doc.id, doc.data() as Record<string, unknown>);
        return {
          ...article,
          publishedAt: article.publishedAt?.toISOString() ?? null,
          updatedAt: article.updatedAt?.toISOString() ?? null,
        };
      } catch {
        return null;
      }
    },
    [`news-${slug}-${locale}`],
    { revalidate: 3600, tags: ["news", `news:${slug}`] },
  );
  const cached = await fn();
  if (!cached) return null;
  return {
    ...cached,
    publishedAt: cached.publishedAt ? new Date(cached.publishedAt) : null,
    updatedAt: cached.updatedAt ? new Date(cached.updatedAt) : null,
  };
}

export async function listAllNewsSlugs(): Promise<Array<{ slug: string; locale: Locale; updatedAt: Date | null }>> {
  try {
    const snap = await adminDb.collection("news").where("status", "==", "published").get();
    return snap.docs
      .map((d) => {
        const data = d.data() as Record<string, unknown>;
        return {
          slug: str(data.slug) ?? d.id,
          locale: (str(data.locale) as Locale) ?? "pt-BR",
          updatedAt: tsToDate(data.updatedAt) ?? tsToDate(data.publishedAt),
        };
      })
      .filter((n) => n.slug);
  } catch {
    return [];
  }
}
