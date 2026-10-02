/**
 * Tabela de 301s legados do WordPress. Populada pelo `scripts/import-wp.mjs`
 * com a forma `{ "/old-slug": { "to": "/noticias/<new-slug>", "code": 301 } }`.
 *
 * O middleware checa cada request antes do roteamento do next-intl pra
 * preservar 100% do equity SEO da migração.
 */
import legacyRedirects from "./legacy-redirects.json";

type LegacyRedirect = { to: string; code?: 301 | 302 | 307 | 308 };
const TABLE = legacyRedirects as Record<string, LegacyRedirect>;

/**
 * Padrões de URL do WordPress que não cabem na tabela fixa (posts publicados
 * depois da importação, paginação do arquivo). Aplicados só quando a tabela
 * não tem entrada exata.
 *
 * - `/noticia/{slug}/` (singular, permalink dos posts da categoria Notícia) e
 *   `/historia/{slug}/` (categoria História) → `/noticias/{slug}`. O slug do
 *   doc em `news` é o mesmo slug do WP (import-wp.mjs grava `slug: post.slug`).
 * - `/noticias/page/{n}/` (paginação do arquivo no WP) → `/noticias?page={n}`.
 */
const PATTERNS: Array<{ re: RegExp; to: (m: RegExpMatchArray) => string }> = [
  { re: /^\/(?:noticia|historia)\/([a-z0-9][a-z0-9-]*)\/?$/i, to: (m) => `/noticias/${m[1]}` },
  {
    re: /^\/noticias\/page\/(\d+)\/?$/,
    to: (m) => (m[1] === "1" ? "/noticias" : `/noticias?page=${m[1]}`),
  },
];

export function lookupLegacyRedirect(path: string): LegacyRedirect | null {
  if (TABLE[path]) return TABLE[path];
  const noSlash = path.endsWith("/") && path !== "/" ? path.slice(0, -1) : null;
  if (noSlash && TABLE[noSlash]) return TABLE[noSlash];
  for (const { re, to } of PATTERNS) {
    const m = path.match(re);
    if (m) return { to: to(m), code: 301 };
  }
  return null;
}
