import "server-only";
import { unstable_cache } from "next/cache";
import { adminDb } from "@/lib/firebase/admin";
import { imageMedium, imageHigh } from "@/lib/firebase/image-variants";
import { tsToDate, num, str, asArray, asRecord } from "@/lib/firestore-utils";
import { driverSlug, slugify } from "@/lib/utils/slug";
import { LEGACY_DRIVER_SLUGS } from "./legacy-slugs";
import { normalizeNationality } from "./nationality";

// ---------------------------------------------------------------------------
// Pilotos — mesma fonte do ud-app:
// - lista: `drivers` com `isActive == true` (DriversFirebaseService.getDrivers,
//   lib/services/drivers_service.dart);
// - perfil: `drivers/{id}` (DriverDetailPage → getDriverById), parse igual ao
//   PublicPageDriverModel (lib/view_model/public_page_driver_model.dart);
// - campeonato: `championships/{cid}/pilots/{id}` do campeonato vigente
//   (`settings/publicRound.championshipId`), como DriverStatsService /
//   ComparativoService (h2hStats).
//
// O doc `drivers/{id}` tem dados pessoais (cpf, rg, e-mail, telefone,
// contato de emergência, plano de saúde...). Só os campos públicos abaixo saem
// daqui — nada disso vai pro client.
// ---------------------------------------------------------------------------

export type PublicDriverCar = {
  marca: string | null;
  modelo: string | null;
  ano: number | null;
  potencia: number | null;
  motor: string | null;
  preparador: string | null;
  apelido: string | null;
  historia: string | null;
  fotoPath: string | null;
  /** Galeria do carro (`carros[].fotos[].url`). */
  fotos: string[];
  principal: boolean;
};

export type PublicDriverSponsor = {
  id: number | null;
  nome: string;
  segmento: string | null;
  tipo: string | null;
  site: string | null;
  fotoPath: string | null;
};

export type PublicDriverSocialLink = {
  kind: "instagram" | "youtube" | "facebook" | "twitter" | "site";
  href: string;
};

export type PublicDriverSummary = {
  id: number;
  slug: string;
  apelido: string;
  nome: string;
  numero: number | null;
  fotoPath: string | null;
  fotoUrl: string | null;
  category: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
};

export type PublicDriverProfile = PublicDriverSummary & {
  bio: string | null;
  /** `nascimento` (YYYY-MM-DD) — a página só exibe a idade. */
  birthDate: string | null;
  /** ISO alpha-2 quando reconhecido; senão o texto livre original. */
  nationality: string | null;
  naturalidade: string | null;
  social: PublicDriverSocialLink[];
  cars: PublicDriverCar[];
  mainCar: PublicDriverCar | null;
  sponsors: PublicDriverSponsor[];
  capaPath: string | null;
  heroFotoUrl: string | null;
  h2h: DriverH2H | null;
};

export type DriverH2H = { wins: number; losses: number; draws: number; total: number };

export type DriverStageResult = {
  stageId: number;
  stageNumber: number | null;
  city: string | null;
  /** ISO (string: `unstable_cache` serializa em JSON, Date não sobrevive). */
  date: string | null;
  qualiPosition: number;
  battlePosition: number;
  finalScore: number;
};

export type DriverChampionshipStats = {
  championshipId: number;
  name: string | null;
  year: number | null;
  /** `championshipPosition` (> 0); `null` quando ainda não pontuou. */
  position: number | null;
  totalScore: number;
  stages: DriverStageResult[];
  best: DriverStageResult | null;
  h2h: DriverH2H | null;
};

// O backoffice grava estes placeholders no lugar de campo vazio
// (StringUtils.hasRealValue do ud-app, lib/utils/string_utils.dart).
const BLANK_PLACEHOLDERS = new Set(["não informado", "nao informado", "n/a", "na", "-", ".", "0", "site"]);

export function realValue(v: unknown): string | null {
  const s = str(v)?.trim();
  if (!s) return null;
  return BLANK_PLACEHOLDERS.has(s.toLowerCase()) ? null : s;
}

const isUrl = (s: string) => /^https?:\/\//i.test(s);

/** Handles/URLs de `socialNetwork` → links, como `_openSocial` do DriverDetailPage. */
function socialLinks(raw: Record<string, unknown>): PublicDriverSocialLink[] {
  const out: PublicDriverSocialLink[] = [];
  const ig = realValue(raw.instagram);
  if (ig) out.push({ kind: "instagram", href: isUrl(ig) ? ig : `https://instagram.com/${ig.replace(/^@/, "")}` });
  const yt = realValue(raw.youtube);
  if (yt) out.push({ kind: "youtube", href: isUrl(yt) ? yt : `https://youtube.com/${yt.startsWith("@") ? yt : `@${yt}`}` });
  const fb = realValue(raw.facebook);
  if (fb) out.push({ kind: "facebook", href: isUrl(fb) ? fb : `https://facebook.com/${fb.replace(/^@/, "")}` });
  const tw = realValue(raw.twitter);
  if (tw) out.push({ kind: "twitter", href: isUrl(tw) ? tw : `https://x.com/${tw.replace(/^@/, "")}` });
  const site = realValue(raw.site);
  if (site && /\./.test(site)) out.push({ kind: "site", href: isUrl(site) ? site : `https://${site}` });
  return out;
}

function parseCar(c: Record<string, unknown>): PublicDriverCar {
  return {
    marca: realValue(c.marca),
    modelo: realValue(c.modelo),
    ano: num(c.ano) || null,
    potencia: num(c.potencia) || null,
    motor: realValue(c.motor),
    preparador: realValue(c.preparador),
    apelido: realValue(c.apelido),
    historia: realValue(c.historia),
    fotoPath: str(c.foto),
    fotos: asArray<unknown>(c.fotos)
      .map((f) => str(asRecord(f)?.url) ?? str(f))
      .filter((u): u is string => !!u),
    principal: c.isPrincipal === true,
  };
}

/** `carros[]`, com fallback pro `car` legado (como `_resolveCarros` do app). */
function parseCars(d: Record<string, unknown>): PublicDriverCar[] {
  const list = asArray<unknown>(d.carros).map(asRecord).filter((c): c is Record<string, unknown> => !!c);
  if (list.length) return list.map(parseCar);
  const legacy = asRecord(d.car);
  return legacy ? [parseCar(legacy)] : [];
}

function parseH2H(raw: unknown): DriverH2H | null {
  const h = asRecord(raw);
  if (!h) return null;
  return {
    wins: num(h.wins) ?? 0,
    losses: num(h.losses) ?? 0,
    draws: num(h.empates) ?? 0,
    total: num(h.totalBattles) ?? 0,
  };
}

type RawSummary = Omit<PublicDriverSummary, "slug">;

function docToSummary(id: string, d: Record<string, unknown>): RawSummary {
  const cat = asRecord(d.categoriaPiloto);
  const addr = asRecord(d.endereco);
  const apelido = str(d.apelido)?.trim() || str(d.nome)?.trim() || "Piloto";
  const nome = str(d.nome)?.trim() || apelido;
  const fotoPath = str(d.foto);
  return {
    id: Number(id),
    apelido,
    nome,
    numero: num(d.numero),
    fotoPath,
    fotoUrl: imageMedium(fotoPath),
    category: cat ? realValue(cat.descricao) : null,
    city: addr ? realValue(addr.cidade) : null,
    state: addr ? realValue(addr.estado) : null,
    country: addr ? realValue(addr.pais) : null,
  };
}

/**
 * Slug público de cada piloto: o do site antigo quando existe
 * (LEGACY_DRIVER_SLUGS), senão `slugify(apelido)`; colisão ganha `-{numero}`
 * (ou `-{id}`).
 */
function assignDriverSlugs(list: RawSummary[]): PublicDriverSummary[] {
  const taken = new Set(Object.values(LEGACY_DRIVER_SLUGS));
  return list.map((d) => {
    const legacy = LEGACY_DRIVER_SLUGS[d.id];
    if (legacy) return { ...d, slug: legacy };
    let slug = slugify(d.apelido) || `piloto-${d.id}`;
    if (taken.has(slug)) slug = `${slug}-${d.numero ?? d.id}`;
    if (taken.has(slug)) slug = `${slug}-${d.id}`;
    taken.add(slug);
    return { ...d, slug };
  });
}

const SUMMARY_FIELDS = ["apelido", "nome", "numero", "foto", "categoriaPiloto", "endereco"] as const;

/** Pilotos ativos (`drivers.isActive == true`), por apelido. Cache 1h, tag `drivers`. */
export const listPublicDrivers = unstable_cache(
  async (): Promise<PublicDriverSummary[]> => {
    try {
      const snap = await adminDb
        .collection("drivers")
        .where("isActive", "==", true)
        .select(...SUMMARY_FIELDS)
        .get();
      const list = snap.docs
        .map((d) => docToSummary(d.id, d.data() as Record<string, unknown>))
        .filter((d) => Number.isFinite(d.id) && d.id > 0)
        .sort((a, b) => a.apelido.localeCompare(b.apelido, "pt-BR", { sensitivity: "base" }));
      return assignDriverSlugs(list);
    } catch (e) {
      console.error("[drivers] listPublicDrivers failed:", e);
      return [];
    }
  },
  ["public-drivers-v2"],
  { revalidate: 3600, tags: ["drivers"] },
);

export type DriverSlugMatch = { id: number; slug: string };

/**
 * Resolve `/pilotos/{slug}`. Aceita o slug canônico e o formato antigo do
 * ud-site (`{apelido}-{numero}`, `driverSlug`) — usado pela Home e por links já
 * publicados —, devolvendo o canônico pra a página redirecionar.
 */
export async function resolveDriverSlug(slug: string): Promise<DriverSlugMatch | null> {
  const list = await listPublicDrivers();
  const hit =
    list.find((d) => d.slug === slug) ??
    list.find((d) => driverSlug({ apelido: d.apelido, numero: d.numero }) === slug);
  return hit ? { id: hit.id, slug: hit.slug } : null;
}

/** Slug canônico do piloto por id (pra outras páginas linkarem o perfil). */
export async function getDriverSlugById(id: number): Promise<string | null> {
  const list = await listPublicDrivers();
  return list.find((d) => d.id === id)?.slug ?? null;
}

function docToProfile(id: string, d: Record<string, unknown>, slug: string): PublicDriverProfile {
  const base = docToSummary(id, d);
  const cars = parseCars(d);
  const sponsors = asArray<unknown>(d.patrocinio)
    .map(asRecord)
    .filter((p): p is Record<string, unknown> => !!p)
    .map((p) => ({
      id: num(p.id),
      nome: realValue(p.nome) ?? "",
      segmento: realValue(p.segmento),
      tipo: realValue(p.tipo),
      site: realValue(p.site),
      fotoPath: str(p.foto),
    }))
    .filter((p) => p.nome)
    // Principal primeiro, depois alfabético (como o DriverDetailPage).
    .sort((a, b) => {
      const ap = a.tipo === "Principal";
      const bp = b.tipo === "Principal";
      if (ap !== bp) return ap ? -1 : 1;
      return a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" });
    });
  const nat = normalizeNationality(d.nacionalidade);
  const birth = str(d.nascimento);
  return {
    ...base,
    slug,
    bio: realValue(d.bio),
    birthDate: birth && /^\d{4}-\d{2}-\d{2}/.test(birth) ? birth.slice(0, 10) : null,
    nationality: nat && realValue(nat) ? nat : null,
    naturalidade: realValue(d.naturalidade),
    social: socialLinks(asRecord(d.socialNetwork) ?? {}),
    cars,
    mainCar: cars.find((c) => c.principal) ?? cars[0] ?? null,
    sponsors,
    capaPath: str(d.capa),
    heroFotoUrl: imageHigh(base.fotoPath),
    h2h: parseH2H(d.h2hStats),
  };
}

/** Perfil completo de `drivers/{id}`. Cache 1h por piloto; tags `drivers`, `driver:{id}`. */
export async function getDriverProfile(id: number, slug: string): Promise<PublicDriverProfile | null> {
  if (!Number.isFinite(id) || id <= 0) return null;
  return unstable_cache(
    async () => {
      try {
        const doc = await adminDb.collection("drivers").doc(String(id)).get();
        if (!doc.exists) return null;
        return docToProfile(doc.id, doc.data() as Record<string, unknown>, slug);
      } catch (e) {
        console.error(`[drivers] getDriverProfile(${id}) failed:`, e);
        return null;
      }
    },
    [`driver-profile-${id}-${slug}`],
    { revalidate: 3600, tags: ["drivers", `driver:${id}`] },
  )();
}

/** Perfil via slug (canônico ou formato antigo). */
export async function getDriverBySlug(slug: string): Promise<PublicDriverProfile | null> {
  const match = await resolveDriverSlug(slug);
  return match ? getDriverProfile(match.id, match.slug) : null;
}

/**
 * Melhor etapa: menor `battlePosition` > 0 (empate → maior `finalScore`); sem
 * batalha, menor `qualiPosition`. Porta de `DriverStatsService.selectBestStage`.
 */
function selectBestStage(stages: DriverStageResult[]): DriverStageResult | null {
  const pick = (key: "battlePosition" | "qualiPosition") =>
    stages
      .filter((s) => s[key] > 0)
      .reduce<DriverStageResult | null>(
        (best, s) =>
          !best || s[key] < best[key] || (s[key] === best[key] && s.finalScore > best.finalScore) ? s : best,
        null,
      );
  return pick("battlePosition") ?? pick("qualiPosition");
}

/**
 * Resultado do piloto no campeonato vigente: `settings/publicRound.championshipId`
 * → `championships/{cid}` (nome/ano) + `championships/{cid}/pilots/{driverId}`
 * (posição, total, etapas com cidade/data denormalizadas, `driver.h2hStats`).
 * `null` quando não há campeonato vigente ou o piloto não está inscrito nele.
 */
export async function getDriverChampionshipStats(driverId: number): Promise<DriverChampionshipStats | null> {
  return unstable_cache(
    async () => {
      try {
        const pr = (await adminDb.collection("settings").doc("publicRound").get()).data() as
          | Record<string, unknown>
          | undefined;
        const cid = pr ? (num(pr.championshipId) ?? num(pr.campeonatoId)) : null;
        if (cid == null) return null;
        const ref = adminDb.collection("championships").doc(String(cid));
        const [meta, pilot] = await Promise.all([ref.get(), ref.collection("pilots").doc(String(driverId)).get()]);
        if (!pilot.exists) return null;
        const m = (meta.data() ?? {}) as Record<string, unknown>;
        const p = pilot.data() as Record<string, unknown>;
        const stages = asArray<unknown>(p.stages)
          .map(asRecord)
          .filter((s): s is Record<string, unknown> => !!s)
          .map((s) => ({
            stageId: num(s.stageId) ?? 0,
            stageNumber: num(s.stageNumber),
            city: realValue(s.city),
            date: tsToDate(s.date)?.toISOString() ?? null,
            qualiPosition: num(s.qualiPosition) ?? 0,
            battlePosition: num(s.battlePosition) ?? 0,
            finalScore: num(s.finalScore) ?? 0,
          }))
          .sort((a, b) => (a.stageNumber ?? 0) - (b.stageNumber ?? 0) || (a.date ?? "").localeCompare(b.date ?? ""));
        const position = num(p.championshipPosition);
        return {
          championshipId: cid,
          name: str(m.championshipName),
          year: num(m.championshipYear),
          position: position && position > 0 ? position : null,
          totalScore: num(p.totalScore) ?? 0,
          stages,
          best: selectBestStage(stages),
          h2h: parseH2H(asRecord(p.driver)?.h2hStats),
        } satisfies DriverChampionshipStats;
      } catch (e) {
        console.error(`[drivers] getDriverChampionshipStats(${driverId}) failed:`, e);
        return null;
      }
    },
    [`driver-championship-${driverId}`],
    { revalidate: 600, tags: ["drivers", `driver:${driverId}`, "standings"] },
  )();
}

export async function getDriversByIds(ids: number[]): Promise<Map<number, PublicDriverSummary>> {
  const out = new Map<number, PublicDriverSummary>();
  const unique = Array.from(new Set(ids.filter((n) => Number.isFinite(n) && n > 0)));
  if (unique.length === 0) return out;
  const list = await listPublicDrivers();
  for (const d of list) if (unique.includes(d.id)) out.set(d.id, d);
  return out;
}

