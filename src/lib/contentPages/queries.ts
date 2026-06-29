import "server-only";
import { unstable_cache } from "next/cache";
import { adminDb } from "@/lib/firebase/admin";
import { asRecord, str, tsToDate } from "@/lib/firestore-utils";
import type { Locale } from "@/i18n/config";

export type ContentPage = {
  slug: string;
  locale: Locale;
  title: string;
  body: string;
  updatedAt: Date | null;
  seo: { title: string | null; description: string | null };
};

export async function getContentPage(slug: string, locale: Locale): Promise<ContentPage | null> {
  const fn = unstable_cache(
    async () => {
      try {
        const doc = await adminDb.collection("content").doc(`${slug}-${locale}`).get();
        if (!doc.exists) return null;
        const d = doc.data() as Record<string, unknown>;
        const seo = asRecord(d.seo) ?? {};
        return {
          slug,
          locale,
          title: str(d.title) ?? "",
          body: str(d.body) ?? "",
          updatedAt: tsToDate(d.updatedAt),
          seo: { title: str(seo.title), description: str(seo.description) },
        } satisfies ContentPage;
      } catch {
        return null;
      }
    },
    [`content-${slug}-${locale}`],
    { revalidate: 3600, tags: ["content", `content:${slug}`] },
  );
  return fn();
}
