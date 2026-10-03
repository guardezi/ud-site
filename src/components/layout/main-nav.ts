import type { StaticPathname } from "@/lib/routes";

/**
 * Menu principal do site (header desktop + menu mobile). Fonte única da ordem
 * das tabs — mexer aqui reflete nos dois lugares.
 *
 * Itens `internal` usam o `Link` do next-intl (pathname traduzido por locale);
 * itens `external` abrem em nova aba. `labelKey` aponta pra
 * messages/<locale>.json#nav.
 */
export const WILDCARD_URL = "https://forms.gle/64JUaXQJJCBfiVV99";

export type MainNavItem =
  | { kind: "internal"; href: StaticPathname; labelKey: string; highlight?: boolean }
  | { kind: "external"; href: string; labelKey: string; highlight?: boolean };

export const MAIN_NAV: MainNavItem[] = [
  { kind: "internal", href: "/", labelKey: "home" },
  { kind: "internal", href: "/ingressos", labelKey: "ingressos", highlight: true },
  { kind: "internal", href: "/pilotos", labelKey: "pilotos" },
  { kind: "external", href: WILDCARD_URL, labelKey: "inscricaoCuringa" },
  { kind: "internal", href: "/classificacao", labelKey: "classificacao" },
  { kind: "internal", href: "/etapas", labelKey: "etapas" },
  { kind: "internal", href: "/categorias", labelKey: "categorias" },
  { kind: "internal", href: "/noticias", labelKey: "noticias" },
  { kind: "internal", href: "/patrocinadores", labelKey: "patrocinadores" },
  { kind: "internal", href: "/contato", labelKey: "contato" },
];
