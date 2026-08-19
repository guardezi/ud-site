import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { lookupLegacyRedirect } from "@/lib/redirects";

const intl = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  // Lookup por pathname: as tabelas de 301 do WP são chaveadas por slug, sem
  // query. Incluir a search na chave quebrava o match sempre que havia ?utm_*.
  const legacy = lookupLegacyRedirect(request.nextUrl.pathname);
  if (legacy) {
    const url = new URL(legacy.to, request.url);
    // Preserva a query de entrada (utm_*, gclid, etc.) no destino do 301, sem
    // sobrescrever params que o próprio destino já defina.
    request.nextUrl.searchParams.forEach((value, key) => {
      if (!url.searchParams.has(key)) url.searchParams.append(key, value);
    });
    return NextResponse.redirect(url, legacy.code ?? 301);
  }
  return intl(request);
}

export const config = {
  // `auth` fora do next-intl: as páginas de ação do Firebase (/auth/action)
  // não são rotas localizadas — têm layout próprio e i18n via `lang`.
  matcher: ["/((?!api|auth|_next|_vercel|.*\\..*).*)"],
};
