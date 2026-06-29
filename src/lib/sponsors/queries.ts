import "server-only";
import { unstable_cache } from "next/cache";
import { adminDb } from "@/lib/firebase/admin";
import { imageMedium } from "@/lib/firebase/image-variants";
import { num, str } from "@/lib/firestore-utils";

export type PublicSponsor = {
  id: string;
  name: string;
  logoPath: string | null;
  logoUrl: string | null;
  website: string | null;
  tier: string | null;
  order: number;
};

export const listSponsors = unstable_cache(
  async (): Promise<PublicSponsor[]> => {
    try {
      const snap = await adminDb.collection("sponsors").orderBy("order", "asc").limit(200).get();
      return snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        const logoPath = str(data.logoPath);
        return {
          id: d.id,
          name: str(data.name) ?? "",
          logoPath,
          logoUrl: imageMedium(logoPath),
          website: str(data.website),
          tier: str(data.tier),
          order: num(data.order) ?? 0,
        } satisfies PublicSponsor;
      });
    } catch {
      return [];
    }
  },
  ["sponsors-list"],
  { revalidate: 3600, tags: ["sponsors"] },
);
