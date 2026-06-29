// Locales suportados em formato BCP-47 (usado por next-intl / browser / <html lang>)
export const LOCALES = ["pt-BR", "en-US", "es-ES"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "pt-BR";

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

const NAMES: Record<Locale, string> = {
  "pt-BR": "Português (Brasil)",
  "en-US": "English (US)",
  "es-ES": "Español",
};

const SHORT_NAMES: Record<Locale, string> = {
  "pt-BR": "PT",
  "en-US": "EN",
  "es-ES": "ES",
};

export function localeName(locale: Locale): string {
  return NAMES[locale];
}

export function localeShort(locale: Locale): string {
  return SHORT_NAMES[locale];
}
