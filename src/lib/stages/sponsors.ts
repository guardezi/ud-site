import "server-only";
import { unstable_cache } from "next/cache";
import { adminDb } from "@/lib/firebase/admin";
import { str } from "@/lib/firestore-utils";

/**
 * Patrocinadores do EVENTO exibidos na página da etapa — collection
 * `patrocinadores` (entidade do ud-sistema, gravada pela function
 * `patrocinadorUpsertQueue` do ud-app) — ver `isEventSponsor`.
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

/**
 * Regra de quem entra (decisão do produto): só PATROCINADORES do evento,
 * apoiadores nunca aparecem nas etapas.
 * - Doc com `tipoPatrocinioEvento` (ud-sistema PR #77): só `== "patrocinador"`.
 * - Doc sem o campo (legado): `patrocinaEvento === true`.
 * Duas queries de igualdade simples (sem índice composto) e o filtro final
 * em memória.
 */
function isEventSponsor(d: Record<string, unknown>): boolean {
  const tipo = str(d.tipoPatrocinioEvento);
  if (tipo != null) return tipo.toLowerCase() === "patrocinador";
  return d.patrocinaEvento === true;
}

const cached = unstable_cache(
  async (): Promise<StageSponsor[]> => {
    const col = adminDb.collection("patrocinadores");
    const [legacy, typed] = await Promise.all([
      col.where("patrocinaEvento", "==", true).get(),
      col.where("tipoPatrocinioEvento", "==", "patrocinador").get(),
    ]);
    const byId = new Map<string, Record<string, unknown>>();
    for (const doc of [...legacy.docs, ...typed.docs]) byId.set(doc.id, doc.data() as Record<string, unknown>);
    return [...byId.entries()]
      .filter(([, d]) => isEventSponsor(d))
      .map(([id, d]) => ({ id, name: str(d.nome) ?? "", logoPath: str(d.foto), site: safeUrl(str(d.site)) }))
      .filter((s) => s.name || s.logoPath)
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  },
  ["stage-event-sponsors-v2"],
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
