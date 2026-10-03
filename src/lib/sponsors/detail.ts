import "server-only";
import { unstable_cache } from "next/cache";
import { adminDb } from "@/lib/firebase/admin";
import { getDriversByIds } from "@/lib/drivers/queries";
import { num, str } from "@/lib/firestore-utils";
import { slugify } from "@/lib/utils/slug";

/**
 * Perfil público de patrocinador — /patrocinadores/[slug].
 *
 * MESMA fonte da SponsorDetailPage do ud-app
 * (lib/pages/public/championship/sponsor_detail_page.dart +
 * lib/services/sponsors_service.dart): doc `patrocinadores/{id}` (entidade do
 * ud-sistema, gravada pela function `patrocinadorUpsertQueue` do ud-app — ver
 * functions/src/models/patrocinador.model.ts) + subcoleção
 * `patrocinadores/{id}/pilotos/{pilotoId}` (vínculo com `tipo`/`historia`),
 * pilotos resolvidos em `drivers/{pilotoId}`.
 *
 * Como no app, os pilotos vinculados são filtrados pelos inscritos no
 * campeonato vigente (`settings/publicRound.championshipId` →
 * `championships/{cid}/pilots`) e ordenados pela colocação; sem campeonato
 * resolvido, não filtra.
 *
 * Slug = nome slugificado (casa com as URLs do WordPress legado, ex.
 * /patrocinadores/fueltech); em colisão de nome, `{slug}-{id}`. O id
 * numérico do ud-sistema também resolve.
 */

export type SponsorProfile = {
  id: string;
  slug: string;
  name: string;
  segment: string | null;
  /** Path do Storage (ou URL) do logo — `foto`. */
  logoPath: string | null;
  /** Path do Storage (ou URL) da capa paisagem — `capa`. */
  coverPath: string | null;
  website: string | null;
  instagram: string | null;
  youtube: string | null;
  history: string | null;
  isEventSponsor: boolean;
  /**
   * Rótulo do selo do evento (`rotuloPatrocinioEvento`, ud-sistema PR #77 —
   * ex. "Apoiador oficial"); `null` = selo padrão.
   */
  eventLabel: string | null;
};

export type SponsoredPilot = {
  driverId: number;
  slug: string;
  name: string;
  number: number | null;
  photoPath: string | null;
  isMain: boolean;
  history: string | null;
};

/**
 * Placeholders que o cadastro grava no lugar de campo vazio — espelha
 * `StringUtils.hasRealValue` do ud-app (lib/utils/string_utils.dart).
 */
const BLANK_PLACEHOLDERS = new Set(["não informado", "nao informado", "n/a", "na", "-", ".", "0", "site"]);

function realValue(v: unknown): string | null {
  const s = str(v)?.trim();
  if (!s || BLANK_PLACEHOLDERS.has(s.toLowerCase())) return null;
  return s;
}

function httpUrl(v: unknown): string | null {
  const s = realValue(v);
  if (!s) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    return u.hostname.includes(".") ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Instagram: handle (`@x`, `x`) ou URL — mesmo tratamento do app. */
function instagramUrl(v: unknown): string | null {
  const s = realValue(v);
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  if (/instagram\.com\//i.test(s)) return `https://${s.replace(/^\/+/, "")}`;
  return `https://instagram.com/${s.replace(/^@/, "")}`;
}

/** YouTube: URL, `@canal` ou `canal` — mesmo tratamento do app. */
function youtubeUrl(v: unknown): string | null {
  const s = realValue(v);
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  if (/youtube\.com\/|youtu\.be\//i.test(s)) return `https://${s.replace(/^\/+/, "")}`;
  return `https://youtube.com/${s.startsWith("@") ? s : `@${s}`}`;
}

/**
 * Selo do evento = mesma regra de `isEventSponsor` + `listEventSupporters`
 * (src/lib/sponsors/queries.ts): com `tipoPatrocinioEvento`, só
 * "patrocinador" ou "apoiador" ("outro" não); sem o campo (legado),
 * `patrocinaEvento === true`.
 */
function hasEventBadge(d: Record<string, unknown>): boolean {
  const tipo = str(d.tipoPatrocinioEvento)?.trim().toLowerCase();
  if (tipo) return tipo === "patrocinador" || tipo === "apoiador";
  return d.patrocinaEvento === true;
}

function docToProfile(id: string, d: Record<string, unknown>): Omit<SponsorProfile, "slug"> {
  return {
    id,
    name: str(d.nome)?.trim() ?? "",
    segment: realValue(d.segmento),
    logoPath: str(d.foto)?.trim() || null,
    coverPath: str(d.capa)?.trim() || null,
    website: httpUrl(d.site),
    instagram: instagramUrl(d.instagram),
    youtube: youtubeUrl(d.youtube),
    history: str(d.historia)?.trim() || null,
    isEventSponsor: hasEventBadge(d),
    eventLabel: str(d.rotuloPatrocinioEvento)?.trim() || null,
  };
}

// Erros propagam de dentro do cache de propósito: falha de leitura não fica
// cacheada como lista vazia.
const loadSponsorProfiles = unstable_cache(
  async (): Promise<SponsorProfile[]> => {
    const snap = await adminDb.collection("patrocinadores").limit(500).get();
    const profiles = snap.docs
      .map((doc) => docToProfile(doc.id, doc.data() as Record<string, unknown>))
      .filter((p) => p.name);
    const counts = new Map<string, number>();
    for (const p of profiles) {
      const base = slugify(p.name);
      counts.set(base, (counts.get(base) ?? 0) + 1);
    }
    return profiles.map((p) => {
      const base = slugify(p.name) || p.id;
      return { ...p, slug: (counts.get(base) ?? 0) > 1 ? `${base}-${p.id}` : base };
    });
  },
  ["sponsor-profiles"],
  { revalidate: 3600, tags: ["sponsors", "patrocinadores"] },
);

/** Todos os patrocinadores (`patrocinadores`), com slug. `[]` em falha. */
export async function listSponsorProfiles(): Promise<SponsorProfile[]> {
  try {
    return await loadSponsorProfiles();
  } catch (e) {
    console.error("[sponsors] listSponsorProfiles failed:", e);
    return [];
  }
}

export async function getSponsorBySlug(slug: string): Promise<SponsorProfile | null> {
  const list = await listSponsorProfiles();
  const key = decodeURIComponent(slug).toLowerCase();
  return list.find((s) => s.slug === key) ?? list.find((s) => s.id === key) ?? null;
}

type Standing = { position: number; totalScore: number };

/** `championships/{cid}/pilots` do campeonato vigente, por driverId. */
async function currentStandings(): Promise<Map<number, Standing>> {
  const out = new Map<number, Standing>();
  const settings = await adminDb.collection("settings").doc("publicRound").get();
  const s = settings.data() as Record<string, unknown> | undefined;
  const cid = s ? (num(s.championshipId) ?? num(s.campeonatoId)) : null;
  if (cid == null) return out;
  const snap = await adminDb.collection("championships").doc(String(cid)).collection("pilots").get();
  for (const doc of snap.docs) {
    const d = doc.data() as Record<string, unknown>;
    const driverId = num(d.driverId) ?? num(doc.id);
    if (driverId == null) continue;
    out.set(driverId, { position: num(d.championshipPosition) ?? 0, totalScore: num(d.totalScore) ?? 0 });
  }
  return out;
}

/** Ordem de ranking do app (`DriverClassification.rankOrder`): sem posição vai pro fim. */
const rankOrder = (p: number) => (p <= 0 ? Number.MAX_SAFE_INTEGER : p);

const loadSponsoredPilots = (sponsorId: string) =>
  unstable_cache(
    async (): Promise<SponsoredPilot[]> => {
      const [linksSnap, standings] = await Promise.all([
        adminDb.collection("patrocinadores").doc(sponsorId).collection("pilotos").get(),
        currentStandings().catch(() => new Map<number, Standing>()),
      ]);
      const links = linksSnap.docs.map((doc) => {
        const d = doc.data() as Record<string, unknown>;
        return {
          driverId: num(d.pilotoId) ?? num(doc.id) ?? 0,
          tipo: str(d.tipo),
          historia: str(d.historia)?.trim() || null,
        };
      });
      const participating = standings.size === 0 ? links : links.filter((l) => standings.has(l.driverId));
      const drivers = await getDriversByIds(participating.map((l) => l.driverId));
      const pilots = participating.flatMap((l) => {
        const d = drivers.get(l.driverId);
        if (!d) return [];
        return [
          {
            driverId: l.driverId,
            slug: d.slug,
            name: d.apelido || d.nome,
            number: d.numero,
            photoPath: d.fotoPath,
            isMain: l.tipo === "Principal",
            history: l.historia,
          } satisfies SponsoredPilot,
        ];
      });
      return pilots.sort((a, b) => {
        const ca = standings.get(a.driverId);
        const cb = standings.get(b.driverId);
        if (!ca && !cb) return 0;
        if (!ca) return 1;
        if (!cb) return -1;
        const byPosition = rankOrder(ca.position) - rankOrder(cb.position);
        return byPosition !== 0 ? byPosition : cb.totalScore - ca.totalScore;
      });
    },
    [`sponsor-pilots-${sponsorId}`],
    { revalidate: 3600, tags: ["sponsors", "patrocinadores", "drivers", "standings"] },
  )();

/** Pilotos patrocinados (inscritos no campeonato vigente), por colocação. `[]` em falha. */
export async function getSponsoredPilots(sponsorId: string): Promise<SponsoredPilot[]> {
  try {
    return await loadSponsoredPilots(sponsorId);
  } catch (e) {
    console.error("[sponsors] getSponsoredPilots failed:", e);
    return [];
  }
}
