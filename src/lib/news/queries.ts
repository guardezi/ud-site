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
    publishedAt: tsToDate(d.publishedAt),
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
 * Lista notícias publicadas, ordenadas mais recentes primeiro.
 * Fase 1: collection `/news` ainda vazia → retorna []. Fase 2: alimentada via
 * import-wp.mjs + CMS no ud-backoffice.
 */
export async function listNews(opts: {
  locale: Locale;
  limit?: number;
  offset?: number;
}): Promise<{ items: NewsSummary[]; total: number }> {
  const limit = opts.limit ?? 12;
  const offset = opts.offset ?? 0;
  const fn = unstable_cache(
    async () => {
      try {
        let q = adminDb
          .collection("news")
          .where("status", "==", "published")
          .where("locale", "==", opts.locale)
          .orderBy("publishedAt", "desc")
          .limit(limit + offset);
        const snap = await q.get();
        const all = snap.docs.map((d) => docToSummary(d.id, d.data() as Record<string, unknown>));
        return { items: all.slice(offset, offset + limit), total: all.length };
      } catch {
        return { items: [] as NewsSummary[], total: 0 };
      }
    },
    [`news-list-${opts.locale}-${offset}-${limit}`],
    { revalidate: 60, tags: ["news", `news:${opts.locale}`] },
  );
  return fn();
}

export async function listLatestNews(locale: Locale, n = 6): Promise<NewsSummary[]> {
  const { items } = await listNews({ locale, limit: n, offset: 0 });
  return items;
}

export async function getNewsBySlug(slug: string, locale: Locale): Promise<NewsArticle | null> {
  const fn = unstable_cache(
    async () => {
      try {
        const snap = await adminDb
          .collection("news")
          .where("slug", "==", slug)
          .where("locale", "==", locale)
          .where("status", "==", "published")
          .limit(1)
          .get();
        const doc = snap.docs[0];
        if (!doc) return null;
        return docToArticle(doc.id, doc.data() as Record<string, unknown>);
      } catch {
        return null;
      }
    },
    [`news-${slug}-${locale}`],
    { revalidate: 3600, tags: ["news", `news:${slug}`] },
  );
  return fn();
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
