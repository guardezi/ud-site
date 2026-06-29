import type { AppPathname } from "@/i18n/routing";

/** Apenas paths estáticos (sem `[slug]`). Mantém type-safety nos navs. */
export type StaticPathname = Exclude<AppPathname, `${string}[${string}]${string}`>;

export type NavItem = {
  href: StaticPathname;
  labelKey: string;
};

/**
 * Navegação principal do site público. Espelha o WordPress legado.
 * `labelKey` aponta pra chave em messages/<locale>.json#nav.
 */
export const PRIMARY_NAV: NavItem[] = [
  { href: "/", labelKey: "home" },
  { href: "/pilotos", labelKey: "pilotos" },
  { href: "/etapas", labelKey: "etapas" },
  { href: "/classificacao", labelKey: "classificacao" },
  { href: "/categorias", labelKey: "categorias" },
  { href: "/noticias", labelKey: "noticias" },
  { href: "/patrocinadores", labelKey: "patrocinadores" },
  { href: "/contato", labelKey: "contato" },
];

export const FOOTER_LINKS: NavItem[] = [
  { href: "/sobre", labelKey: "home" },
  { href: "/termos", labelKey: "termos" },
  { href: "/privacidade", labelKey: "privacidade" },
];

/**
 * Links externos do footer (não-localizados). Ingressos vai pra plataforma
 * externa de venda; regulamento aponta pro PDF da CBA.
 */
export const EXTERNAL_LINKS = {
  tickets: "https://www.tycket.com.br/eventos",
  wildcard: "https://forms.gle/wildcard",
  regulation: "https://www.cba-automobilismo.org.br/regulamentos",
} as const;
