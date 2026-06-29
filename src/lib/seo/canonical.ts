import type { Locale } from "@/i18n/config";
import { getPathname } from "@/i18n/navigation";
import type { AppPathname } from "@/i18n/routing";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ultimatedrift.com.br";

type Params = Record<string, string | number> | undefined;

export function canonical(href: AppPathname, locale: Locale, params?: Params): string {
  // getPathname com localePrefix 'as-needed' já gera o prefix correto:
  //   default locale → '/pilotos'
  //   outros        → '/en-US/drivers'
  const path = getPathname({ href: { pathname: href, params } as never, locale });
  return `${SITE_URL}${path === "/" ? "" : path}`;
}

export function absoluteUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
