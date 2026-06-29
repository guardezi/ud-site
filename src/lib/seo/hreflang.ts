import { LOCALES, DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { canonical } from "./canonical";
import type { AppPathname } from "@/i18n/routing";

type Params = Record<string, string | number> | undefined;

/**
 * Constrói o map `alternates.languages` pro Metadata API, incluindo `x-default`
 * apontando pro locale padrão. Use no `generateMetadata` de cada rota.
 */
export function hreflangAlternates(href: AppPathname, params?: Params) {
  const languages: Record<string, string> = {};
  for (const locale of LOCALES) {
    languages[locale] = canonical(href, locale, params);
  }
  languages["x-default"] = canonical(href, DEFAULT_LOCALE, params);
  return languages;
}
