import "server-only";
import { unstable_cache } from "next/cache";
import { adminDb } from "@/lib/firebase/admin";
import { imageHigh, imageMedium } from "@/lib/firebase/image-variants";
import { asArray, asRecord, num, str, tsToDate } from "@/lib/firestore-utils";

export type CircuitFaq = { question: string; answer: string };

export type PublicCircuit = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  description: string | null;
  heroImagePath: string | null;
  heroImageUrl: string | null;
  mapImageUrl: string | null;
  qualifyMapImageUrl: string | null;
  faqs: CircuitFaq[];
  updatedAt: Date | null;
};

function docToCircuit(id: string, d: Record<string, unknown>): PublicCircuit {
  const map = asRecord(d.map) ?? {};
  const qm = asRecord(d.qualifyMap) ?? {};
  const heroImagePath = str(d.heroImagePath);
  const faqs = asArray<Record<string, unknown>>(d.faqs)
    .map((f) => ({ question: str(f.question) ?? "", answer: str(f.answer) ?? "" }))
    .filter((f) => f.question && f.answer);
  return {
    id,
    name: str(d.name) ?? "",
    address: str(d.address),
    city: str(d.city),
    country: str(d.country),
    lat: num(d.lat),
    lng: num(d.lng),
    description: str(d.description),
    heroImagePath,
    heroImageUrl: imageHigh(heroImagePath),
    mapImageUrl: imageMedium(str(map.imagePath)),
    qualifyMapImageUrl: imageMedium(str(qm.imagePath)),
    faqs,
    updatedAt: tsToDate(d.updatedAt),
  };
}

export async function getCircuitById(id: string): Promise<PublicCircuit | null> {
  const fn = unstable_cache(
    async () => {
      try {
        const doc = await adminDb.collection("circuits").doc(id).get();
        if (!doc.exists) return null;
        return docToCircuit(doc.id, doc.data() as Record<string, unknown>);
      } catch {
        return null;
      }
    },
    [`circuit-${id}`],
    { revalidate: 86400, tags: ["circuits", `circuit:${id}`] },
  );
  return fn();
}
