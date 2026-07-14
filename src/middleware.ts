import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { lookupLegacyRedirect } from "@/lib/redirects";

const intl = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname + request.nextUrl.search;
  const legacy = lookupLegacyRedirect(path);
  if (legacy) {
    const url = new URL(legacy.to, request.url);
    return NextResponse.redirect(url, legacy.code ?? 301);
  }
  return intl(request);
}

export const config = {
  // `auth` fora do next-intl: as páginas de ação do Firebase (/auth/action)
  // não são rotas localizadas — têm layout próprio e i18n via `lang`.
  matcher: ["/((?!api|auth|_next|_vercel|.*\\..*).*)"],
};
