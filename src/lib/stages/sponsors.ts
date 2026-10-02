import "server-only";
import { unstable_cache } from "next/cache";
import { adminDb } from "@/lib/firebase/admin";
import { str } from "@/lib/firestore-utils";

/**
 * Patrocinadores do EVENTO exibidos na página da etapa — collection
 * `patrocinadores` (entidade do ud-sistema, gravada pela function
 * `patrocinadorUpsertQueue` do ud-app), só `patrocinaEvento === true`.
 * Mesma fonte do selo/ranking de patrocinador do evento no app (#272).
 *
 * Não existe patrocinador POR etapa no Firestore (no WordPress era uma
 * seleção manual por post): todas as etapas mostram o mesmo conjunto.
 *
 * TODO: a home (PR #12) tem um `listEventSponsors` equivalente em
 * `src/lib/sponsors/queries.ts`; unificar quando os dois PRs entrarem.
 */
export type StageSponsor = { id: string; name: string; logoPath: string | null; site: string | null };

function safeUrl(v: string | null): string | null {
  if (!v) return null;
  const withProto = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withProto);
    return u.hostname.includes(".") ? u.toString() : null;
  } catch {
    return null;
  }
}

const cached = unstable_cache(
  async (): Promise<StageSponsor[]> => {
    const snap = await adminDb.collection("patrocinadores").where("patrocinaEvento", "==", true).get();
    return snap.docs
      .map((doc) => {
        const d = doc.data() as Record<string, unknown>;
        return { id: doc.id, name: str(d.nome) ?? "", logoPath: str(d.foto), site: safeUrl(str(d.site)) };
      })
      .filter((s) => s.name || s.logoPath)
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  },
  ["stage-event-sponsors-v1"],
  { revalidate: 3600, tags: ["sponsors"] },
);

export async function listStageEventSponsors(): Promise<StageSponsor[]> {
  try {
    return await cached();
  } catch (e) {
    console.error("[stages] sponsors failed:", e);
    return [];
  }
}
