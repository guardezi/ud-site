import "server-only";
import { unstable_cache } from "next/cache";
import { adminDb } from "@/lib/firebase/admin";
import { asRecord, num, str } from "@/lib/firestore-utils";
import { listPublicDrivers } from "@/lib/drivers/queries";
import { driverSlug } from "@/lib/utils/slug";
import type { CategorySlug } from "@/components/categorias/categories";

/**
 * Pilotos por categoria — MESMA fonte e regras da classificação do ud-app
 * (lib/pages/public/championship/championship_details.dart):
 *
 * - Campeonato vigente: `settings/publicRound.championshipId` (ou
 *   `campeonatoId`), sem fallback (resolveActiveChampionshipId do app).
 * - Pilotos: `championships/{cid}/pilots`, um doc por piloto inscrito.
 * - Ordem: pontuados por `championshipPosition`; inscritos sem ponto (0) no
 *   fim, alfabético (rankedForDisplay do app).
 * - Categoria: `driverCategory` (string ou `{descricao}`) agrupada como
 *   DriverCategoryEnum.fromDescriptionGrouped: "Pro / Master" → Master,
 *   "Pro / Rookie" → Rookie.
 * - Pro = todos os pilotos do campeonato (o chip "Pro" do app é o geral, e a
 *   Pro é aberta a todos — Master/Rookie também correm nela).
 */

export type GroupedCategory = "pro" | "master" | "rookie" | null;

export type CategoryPilot = {
  driverId: number;
  /** Posição dentro da categoria (renumerada, como o app faz no chip). */
  position: number;
  name: string;
  number: number | null;
  photo: string | null;
  category: GroupedCategory;
  /** Slug do perfil `/pilotos/[slug]`. */
  slug: string;
};

/** Porta de DriverCategoryEnum.fromDescriptionGrouped (ud-app). */
export function groupCategory(description: string | null | undefined): GroupedCategory {
  if (!description) return null;
  const d = description.toLowerCase().replace(/\s*\/\s*/g, " / ").trim();
  if (d === "pro") return "pro";
  if (d === "master" || d === "pro / master") return "master";
  if (d === "rookie" || d === "pro / rookie") return "rookie";
  return null;
}

type RawPilot = {
  driverId: number;
  position: number;
  name: string;
  number: number | null;
  photo: string | null;
  category: GroupedCategory;
};

function docToPilot(d: Record<string, unknown>): RawPilot {
  const driver = asRecord(d.driver) ?? {};
  const cat = asRecord(d.driverCategory);
  return {
    driverId: num(d.driverId) ?? 0,
    position: num(d.championshipPosition) ?? 0,
    name: str(driver.apelido)?.trim() || str(d.driverName)?.trim() || "",
    number: num(driver.numero),
    photo: str(driver.foto),
    category: groupCategory(cat ? str(cat.descricao) : str(d.driverCategory)),
  };
}

async function fetchActivePilots(): Promise<RawPilot[] | null> {
  const settings = await adminDb.collection("settings").doc("publicRound").get();
  const s = settings.data() as Record<string, unknown> | undefined;
  const cid = s ? (num(s.championshipId) ?? num(s.campeonatoId)) : null;
  if (cid == null) return null;
  const snap = await adminDb.collection("championships").doc(String(cid)).collection("pilots").get();
  const pilots = snap.docs.map((doc) => docToPilot(doc.data() as Record<string, unknown>));
  const scored = pilots.filter((p) => p.position > 0).sort((a, b) => a.position - b.position);
  const unscored = pilots
    .filter((p) => p.position <= 0)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
  return [...scored, ...unscored];
}

// Falha lança dentro do cache (não fica cacheada) e vira null fora dele.
const cachedActivePilots = unstable_cache(fetchActivePilots, ["categorias-active-pilots"], {
  revalidate: 300,
  tags: ["standings", "drivers"],
});

async function loadActivePilots(): Promise<RawPilot[] | null> {
  try {
    return await cachedActivePilots();
  } catch (e) {
    console.error("[categorias] fetchActivePilots failed:", e);
    return null;
  }
}

/**
 * Pilotos do campeonato vigente na categoria, em ordem de classificação.
 * `null` = sem campeonato vigente / leitura falhou; `[]` = categoria vazia.
 */
export async function listCategoryPilots(slug: CategorySlug): Promise<CategoryPilot[] | null> {
  const all = await loadActivePilots();
  if (!all) return null;
  const inCategory = slug === "pro" ? all : all.filter((p) => p.category === slug);

  // Slug do perfil: o mesmo que /pilotos/[slug] resolve (lista de `drivers`
  // por id). Piloto fora dessa lista cai no formato {apelido}-{numero}.
  const drivers = await listPublicDrivers().catch(() => []);
  const slugById = new Map(drivers.map((d) => [d.id, d.slug]));

  return inCategory.map((p, i) => ({
    ...p,
    position: i + 1,
    slug: slugById.get(p.driverId) ?? driverSlug({ apelido: p.name, numero: p.number }),
  }));
}
