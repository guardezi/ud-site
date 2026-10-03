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

/**
 * Tipo do vínculo com o evento (ud-sistema PR #77: `tipoPatrocinioEvento` =
 * "patrocinador" | "apoiador" | "outro"). Ainda não gravado pela function do
 * ud-app; docs sem o campo seguem só pelo `patrocinaEvento`.
 */
function eventSponsorType(data: Record<string, unknown>): string | null {
  return str(data.tipoPatrocinioEvento)?.trim().toLowerCase() || null;
}

function docToEventSponsor(id: string, data: Record<string, unknown>): EventSponsor {
  return {
    id,
    name: str(data.nome)?.trim() ?? "",
    logoPath: str(data.foto)?.trim() || null,
    website: httpUrl(data.site),
  };
}

function sortByName(list: EventSponsor[]): EventSponsor[] {
  return list.filter((s) => s.name || s.logoPath).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
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
    return sortByName(
      snap.docs
        .filter((d) => {
          // Com o tipo preenchido, só "patrocinador" entra aqui (um apoiador
          // não aparece nos dois blocos).
          const tipo = eventSponsorType(d.data() as Record<string, unknown>);
          return tipo == null || tipo === "patrocinador";
        })
        .map((d) => docToEventSponsor(d.id, d.data() as Record<string, unknown>)),
    );
  },
  ["event-sponsors-v2"],
  { revalidate: 3600, tags: ["sponsors", "patrocinadores"] },
);

const loadEventSupporters = unstable_cache(
  async (): Promise<EventSponsor[]> => {
    const snap = await adminDb
      .collection("patrocinadores")
      .where("tipoPatrocinioEvento", "==", "apoiador")
      .limit(200)
      .get();
    return sortByName(snap.docs.map((d) => docToEventSponsor(d.id, d.data() as Record<string, unknown>)));
  },
  ["event-supporters"],
  { revalidate: 3600, tags: ["sponsors", "patrocinadores"] },
);

/**
 * Patrocinadores do evento: `patrocinadores` com `patrocinaEvento == true` e,
 * quando houver `tipoPatrocinioEvento`, só os do tipo "patrocinador". Por nome.
 */
export async function listEventSponsors(): Promise<EventSponsor[]> {
  try {
    return await loadEventSponsors();
  } catch (e) {
    console.error("[sponsors] listEventSponsors failed:", e);
    return [];
  }
}

/** Apoiadores do evento: `patrocinadores` com `tipoPatrocinioEvento == "apoiador"`. Por nome. */
export async function listEventSupporters(): Promise<EventSponsor[]> {
  try {
    return await loadEventSupporters();
  } catch (e) {
    console.error("[sponsors] listEventSupporters failed:", e);
    return [];
  }
}
