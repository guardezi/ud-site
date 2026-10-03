import "server-only";
import { unstable_cache } from "next/cache";
import { adminDb } from "@/lib/firebase/admin";
import { imageMedium } from "@/lib/firebase/image-variants";
import { num, str, tsToDate } from "@/lib/firestore-utils";
import { slugify } from "@/lib/utils/slug";

export type PublicStageHubSummary = {
  id: string;
  slug: string;
  stageId: number | null;
  championshipId: number | null;
  name: string;
  city: string | null;
  posterImagePath: string | null;
  posterImageUrl: string | null;
  startDate: Date | null;
  endDate: Date | null;
  circuitId: string | null;
};

function buildSlug(name: string, stageId: number | null, fallbackId: string): string {
  const base = slugify(name);
  if (base && stageId) return `${base}-${stageId}`;
  if (base) return base;
  return fallbackId;
}

function docToSummary(id: string, d: Record<string, unknown>): PublicStageHubSummary {
  const stageId = num(d.stageId);
  const name = str(d.name) ?? "Etapa";
  const posterImagePath = str(d.posterImagePath);
  return {
    id,
    slug: buildSlug(name, stageId, id),
    stageId,
    championshipId: num(d.championshipId),
    name,
    city: null,
    posterImagePath,
    posterImageUrl: imageMedium(posterImagePath),
    startDate: tsToDate(d.startDate),
    endDate: tsToDate(d.endDate),
    circuitId: str(d.circuitId),
  };
}

/** Lista todas etapas publicadas, ordenadas mais recentes primeiro. Cap 100. */
export const listStageHubs = unstable_cache(
  async (): Promise<PublicStageHubSummary[]> => {
    try {
      const snap = await adminDb
        .collection("stageHubs")
        .orderBy("startDate", "desc")
        .limit(100)
        .get();
      return snap.docs.map((d) => docToSummary(d.id, d.data() as Record<string, unknown>));
    } catch {
      return [];
    }
  },
  ["public-stage-hubs"],
  { revalidate: 600, tags: ["stages"] },
);

/** Próxima etapa: a primeira com startDate >= hoje (ou a mais recente). */
export async function getNextStageHub(): Promise<PublicStageHubSummary | null> {
  const all = await listStageHubs();
  const now = Date.now();
  const ms = (h: PublicStageHubSummary) => (h.startDate ? new Date(h.startDate as unknown as string).getTime() : 0);
  const upcoming = all.filter((h) => ms(h) >= now).sort((a, b) => ms(a) - ms(b));
  return upcoming[0] ?? all[0] ?? null;
}
