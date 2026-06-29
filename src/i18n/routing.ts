import { defineRouting } from "next-intl/routing";
import { LOCALES, DEFAULT_LOCALE } from "./config";

/**
 * Routing do site público. `localePrefix: 'as-needed'` mantém pt-BR no apex
 * sem prefixo (preserva equity SEO do WordPress legado) e força en-US/es-ES
 * a usarem `/en-US/...` e `/es-ES/...` — hreflang fica trivial.
 *
 * pathnames traduzidos por locale dão chance de cada mercado ranquear com
 * termos locais (`/pilotos` em pt-BR/es-ES vs `/drivers` em en-US).
 */
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "as-needed",
  pathnames: {
    "/": "/",
    "/pilotos": {
      "pt-BR": "/pilotos",
      "en-US": "/drivers",
      "es-ES": "/pilotos",
    },
    "/pilotos/[slug]": {
      "pt-BR": "/pilotos/[slug]",
      "en-US": "/drivers/[slug]",
      "es-ES": "/pilotos/[slug]",
    },
    "/etapas": {
      "pt-BR": "/etapas",
      "en-US": "/stages",
      "es-ES": "/etapas",
    },
    "/etapas/[slug]": {
      "pt-BR": "/etapas/[slug]",
      "en-US": "/stages/[slug]",
      "es-ES": "/etapas/[slug]",
    },
    "/etapas/[slug]/qualifying": {
      "pt-BR": "/etapas/[slug]/qualifying",
      "en-US": "/stages/[slug]/qualifying",
      "es-ES": "/etapas/[slug]/qualifying",
    },
    "/etapas/[slug]/bracket": {
      "pt-BR": "/etapas/[slug]/chaveamento",
      "en-US": "/stages/[slug]/bracket",
      "es-ES": "/etapas/[slug]/llave",
    },
    "/classificacao": {
      "pt-BR": "/classificacao",
      "en-US": "/standings",
      "es-ES": "/clasificacion",
    },
    "/categorias": {
      "pt-BR": "/categorias",
      "en-US": "/categories",
      "es-ES": "/categorias",
    },
    "/categorias/[slug]": {
      "pt-BR": "/categorias/[slug]",
      "en-US": "/categories/[slug]",
      "es-ES": "/categorias/[slug]",
    },
    "/noticias": {
      "pt-BR": "/noticias",
      "en-US": "/news",
      "es-ES": "/noticias",
    },
    "/noticias/[slug]": {
      "pt-BR": "/noticias/[slug]",
      "en-US": "/news/[slug]",
      "es-ES": "/noticias/[slug]",
    },
    "/patrocinadores": {
      "pt-BR": "/patrocinadores",
      "en-US": "/sponsors",
      "es-ES": "/patrocinadores",
    },
    "/contato": {
      "pt-BR": "/contato",
      "en-US": "/contact",
      "es-ES": "/contacto",
    },
    "/sobre": {
      "pt-BR": "/sobre",
      "en-US": "/about",
      "es-ES": "/sobre",
    },
    "/termos": {
      "pt-BR": "/termos",
      "en-US": "/terms",
      "es-ES": "/terminos",
    },
    "/privacidade": {
      "pt-BR": "/privacidade",
      "en-US": "/privacy",
      "es-ES": "/privacidad",
    },
  },
});

export type AppPathname = keyof typeof routing.pathnames;
