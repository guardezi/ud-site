import "server-only";
import { unstable_cache } from "next/cache";
import { adminDb } from "@/lib/firebase/admin";
import { imageHigh, imageMedium } from "@/lib/firebase/image-variants";
import { asArray, asRecord, num, str, tsToDate } from "@/lib/firestore-utils";
import { slugify } from "@/lib/utils/slug";

export type TimetableItem = {
  category: "EVENT" | "TRACK" | "ENTERTAINMENT" | "OTHER";
  startTime: string;
  endTime: string | null;
  title: string;
  sublocation: string | null;
  longDescription: string | null;
  externalUrl: string | null;
};

export type TimetableDay = {
  day: string;
  items: TimetableItem[];
};

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

export type PublicStageHub = PublicStageHubSummary & {
  posterImageHighUrl: string | null;
  timetable: TimetableDay[];
  updatedAt: Date | null;
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

function docToHub(id: string, d: Record<string, unknown>): PublicStageHub {
  const base = docToSummary(id, d);
  const rawTimetable = asArray<Record<string, unknown>>(d.timetable);
  const timetable: TimetableDay[] = rawTimetable.map((day) => ({
    day: str(day.day) ?? "",
    items: asArray<Record<string, unknown>>(day.items).map((item) => ({
      category: ((str(item.category) ?? "OTHER") as TimetableItem["category"]) || "OTHER",
      startTime: str(item.startTime) ?? "",
      endTime: str(item.endTime),
      title: str(item.title) ?? "",
      sublocation: str(item.sublocation),
      longDescription: str(item.longDescription),
      externalUrl: str(item.externalUrl),
    })),
  }));
  return {
    ...base,
    posterImageHighUrl: imageHigh(base.posterImagePath),
    timetable,
    updatedAt: tsToDate(d.updatedAt),
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
  const upcoming = all
    .filter((h) => h.startDate && h.startDate.getTime() >= now)
    .sort((a, b) => (a.startDate!.getTime() - b.startDate!.getTime()));
  return upcoming[0] ?? all[0] ?? null;
}

export async function getStageHubById(id: string): Promise<PublicStageHub | null> {
  const fn = unstable_cache(
    async () => {
      try {
        const doc = await adminDb.collection("stageHubs").doc(id).get();
        if (!doc.exists) return null;
        return docToHub(doc.id, doc.data() as Record<string, unknown>);
      } catch {
        return null;
      }
    },
    [`stage-hub-${id}`],
    { revalidate: 600, tags: ["stages", `stage:${id}`] },
  );
  return fn();
}

export async function getStageHubBySlug(slug: string): Promise<PublicStageHub | null> {
  const list = await listStageHubs();
  const match = list.find((h) => h.slug === slug);
  return match ? getStageHubById(match.id) : null;
}
