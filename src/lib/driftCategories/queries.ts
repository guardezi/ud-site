import "server-only";
import { unstable_cache } from "next/cache";
import { adminDb } from "@/lib/firebase/admin";
import { num, str } from "@/lib/firestore-utils";

export type DriftCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  order: number;
};

export const listDriftCategories = unstable_cache(
  async (): Promise<DriftCategory[]> => {
    try {
      const snap = await adminDb.collection("driftCategories").orderBy("order", "asc").limit(50).get();
      return snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          slug: str(data.slug) ?? d.id,
          name: str(data.name) ?? "",
          description: str(data.description),
          icon: str(data.icon),
          order: num(data.order) ?? 0,
        } satisfies DriftCategory;
      });
    } catch {
      return [];
    }
  },
  ["drift-categories-list"],
  { revalidate: 86400, tags: ["categories"] },
);

export async function getDriftCategoryBySlug(slug: string): Promise<DriftCategory | null> {
  const all = await listDriftCategories();
  return all.find((c) => c.slug === slug) ?? null;
}
