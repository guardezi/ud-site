/**
 * Tabela de 301s legados do WordPress. Populada pelo `scripts/import-wp.mjs`
 * com a forma `{ "/old-slug": { "to": "/noticias/<new-slug>", "code": 301 } }`.
 *
 * Em Fase 1 fica vazia. O middleware checa cada request antes do roteamento
 * do next-intl pra preservar 100% do equity SEO da migração.
 */
import legacyRedirects from "./legacy-redirects.json";

type LegacyRedirect = { to: string; code?: 301 | 302 | 307 | 308 };
const TABLE = legacyRedirects as Record<string, LegacyRedirect>;

export function lookupLegacyRedirect(path: string): LegacyRedirect | null {
  if (TABLE[path]) return TABLE[path];
  const noSlash = path.endsWith("/") && path !== "/" ? path.slice(0, -1) : null;
  if (noSlash && TABLE[noSlash]) return TABLE[noSlash];
  return null;
}
