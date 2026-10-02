import "server-only";
import { unstable_cache } from "next/cache";
import { adminDb } from "@/lib/firebase/admin";
import { str, tsToDate } from "@/lib/firestore-utils";
import type { Locale } from "@/i18n/config";

/**
 * Últimas notícias da Home — mesma collection `news` que /noticias lê
 * (src/lib/news/queries.ts; populada hoje pelo scripts/import-wp.mjs, CMS no
 * ud-backoffice ainda não existe).
 *
 * Diferença proposital da `listNews`: filtra só por igualdade (status +
 * locale, servido pelos índices automáticos) e ordena em memória por
 * `publishedAt`, que nos docs importados é string "YYYY-MM-DD". A `listNews`
 * usa `orderBy("publishedAt")` e exige o índice composto
 * news(locale ASC, status ASC, publishedAt DESC), que não existe → hoje ela
 * devolve [] silenciosamente.
 */

export type HomeNewsSummary = {
  id: string;
  slug: string;
  title: string;
  /** Slug da categoria (`noticia`, `historia`…). */
  category: string | null;
  coverImagePath: string | null;
  publishedAt: Date | null;
};

const loadHomeNews = unstable_cache(
  async (locale: Locale, n: number): Promise<HomeNewsSummary[]> => {
    const snap = await adminDb
      .collection("news")
      .where("status", "==", "published")
      .where("locale", "==", locale)
      .limit(500)
      .get();
    return snap.docs
      .map((doc) => {
        const d = doc.data() as Record<string, unknown>;
        return {
          id: doc.id,
          slug: str(d.slug) ?? doc.id,
          title: str(d.title) ?? "",
          category: str(d.category),
          coverImagePath: str(d.coverImagePath),
          publishedAt: tsToDate(d.publishedAt),
        };
      })
      .filter((n) => n.title && n.slug)
      .sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0))
      .slice(0, n);
  },
  ["home-news"],
  { revalidate: 300, tags: ["news"] },
);

/** As `n` notícias publicadas mais recentes do locale. Erro → []. */
export async function listHomeNews(locale: Locale, n = 3): Promise<HomeNewsSummary[]> {
  try {
    return await loadHomeNews(locale, n);
  } catch (e) {
    console.error("[news] listHomeNews failed:", e);
    return [];
  }
}
