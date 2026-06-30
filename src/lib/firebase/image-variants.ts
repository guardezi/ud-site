/**
 * URL pública direta para variantes WebP geradas pela Cloud Function
 * `storageImageVariantsOnObjectFinalized` no projeto ud-app/functions.
 * Variantes vão pro Storage com `predefinedAcl: 'publicRead'`, sem token.
 *
 * Entradas aceitas: path puro, gs://bucket/path, download URL Firebase, URL GCS pública.
 *
 * Tamanhos (mesma escala do ud-app/lib/utils/image_variants.dart):
 * - thumb:  max 200x200  → chips, lista densa, avatares pequenos
 * - small:  max 400x400  → avatares 50-130dp, cards densos
 * - medium: max 800x800  → cards padrão, preview, dialog
 * - high:   max 1920x1600 → hero, detalhe full-screen, banner
 * - webp:   resolução original (PDF/print/export)
 */

const DEFAULT_BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "";

export type Variant = "thumb" | "small" | "medium" | "high" | "webp";

const SUFFIX: Record<Variant, string> = {
  thumb: "_thumb",
  small: "_small",
  medium: "_medium",
  high: "_high",
  webp: "",
};

/** Largura máxima estimada de cada variante (mesma escala do ud-app). */
export const VARIANT_WIDTH: Record<Exclude<Variant, "webp">, number> = {
  thumb: 200,
  small: 400,
  medium: 800,
  high: 1920,
};

export function imageVariant(input: string | null | undefined, v: Variant): string | null {
  if (!input) return null;
  try {
    const [bucket, fullPath] = parse(input);
    const dot = fullPath.lastIndexOf(".");
    const base = dot >= 0 ? fullPath.substring(0, dot) : fullPath;
    return `https://storage.googleapis.com/${bucket}/${base}${SUFFIX[v]}.webp`;
  } catch {
    return input;
  }
}

export const imageThumb = (p: string | null | undefined) => imageVariant(p, "thumb");
export const imageSmall = (p: string | null | undefined) => imageVariant(p, "small");
export const imageMedium = (p: string | null | undefined) => imageVariant(p, "medium");
export const imageHigh = (p: string | null | undefined) => imageVariant(p, "high");

export type SrcSetVariants = "all" | "responsive" | "compact";

/**
 * Gera `srcset` com múltiplas variantes pra browser escolher conforme DPR/viewport.
 *
 * - `responsive` (default): small, medium, high — cobre 99% dos casos
 * - `compact`: thumb, small — pra elementos sempre pequenos (chips, ícones)
 * - `all`: as 4 variantes
 *
 * Retorna `null` se path inválido.
 */
export function imageSrcSet(
  input: string | null | undefined,
  preset: SrcSetVariants = "responsive",
): string | null {
  if (!input) return null;
  const variants: Array<Exclude<Variant, "webp">> =
    preset === "all" ? ["thumb", "small", "medium", "high"]
    : preset === "compact" ? ["thumb", "small"]
    : ["small", "medium", "high"];

  const parts: string[] = [];
  for (const v of variants) {
    const url = imageVariant(input, v);
    if (url) parts.push(`${url} ${VARIANT_WIDTH[v]}w`);
  }
  return parts.length ? parts.join(", ") : null;
}

function parse(input: string): [bucket: string, fullPath: string] {
  if (input.startsWith("gs://")) {
    const rest = input.substring("gs://".length);
    const slash = rest.indexOf("/");
    if (slash > 0) return [normalize(rest.substring(0, slash)), rest.substring(slash + 1)];
  }
  if (input.startsWith("https://firebasestorage.googleapis.com/")) {
    const u = new URL(input);
    const m = u.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
    if (m) return [normalize(m[1]!), decodeURIComponent(m[2]!)];
  }
  if (input.startsWith("https://storage.googleapis.com/")) {
    const rest = input.substring("https://storage.googleapis.com/".length);
    const slash = rest.indexOf("/");
    if (slash > 0) return [normalize(rest.substring(0, slash)), rest.substring(slash + 1)];
  }
  return [normalize(DEFAULT_BUCKET), input];
}

function normalize(bucket: string): string {
  if (bucket.endsWith(".firebasestorage.app")) {
    return `${bucket.replace(/\.firebasestorage\.app$/, "")}.appspot.com`;
  }
  return bucket;
}
