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

// ---------------------------------------------------------------------------
// Patrocinadores do EVENTO — collection `patrocinadores` (entidade do
// ud-sistema, sincronizada pela function `patrocinadorUpsertQueue` do ud-app;
// ver ud-app functions/src/models/patrocinador.model.ts). Não confundir com
// `sponsors` (CMS do backoffice, usada por listSponsors).
//
// Campos usados: `nome`, `foto` (path GCS do logo; o ud-sistema publica como
// `logotipo` e a function grava `foto`), `site`, `patrocinaEvento` (só `true`
// literal). Não há campo de ativo nem de ordem: patrocinador excluído no
// ud-sistema some do Firestore (`patrocinadorDeleteQueue`); ordem = nome.
// ---------------------------------------------------------------------------

export type EventSponsor = {
  id: string;
  name: string;
  /** Path do Storage (ou URL) do logo; `null` sem logo. */
  logoPath: string | null;
  /** Site do patrocinador, só quando é uma URL http(s) válida. */
  website: string | null;
};

function httpUrl(v: unknown): string | null {
  const s = str(v)?.trim();
  if (!s) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    return u.hostname.includes(".") ? u.toString() : null;
  } catch {
    return null;
  }
}

// Erros propagam de dentro do cache de propósito: falha (ex. build sem
// credencial) não fica cacheada como lista vazia.
const loadEventSponsors = unstable_cache(
  async (): Promise<EventSponsor[]> => {
    const snap = await adminDb
      .collection("patrocinadores")
      .where("patrocinaEvento", "==", true)
      .limit(200)
      .get();
    return snap.docs
      .map((d) => {
        const data = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          name: str(data.nome)?.trim() ?? "",
          logoPath: str(data.foto)?.trim() || null,
          website: httpUrl(data.site),
        } satisfies EventSponsor;
      })
      .filter((s) => s.name || s.logoPath)
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  },
  ["event-sponsors"],
  { revalidate: 3600, tags: ["sponsors", "patrocinadores"] },
);

/** Patrocinadores do evento (`patrocinadores` com `patrocinaEvento == true`), por nome. */
export async function listEventSponsors(): Promise<EventSponsor[]> {
  try {
    return await loadEventSponsors();
  } catch (e) {
    console.error("[sponsors] listEventSponsors failed:", e);
    return [];
  }
}
