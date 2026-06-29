import "../globals.css";
import type { Metadata, Viewport } from "next";
import { PT_Sans } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { JsonLd } from "@/components/seo/JsonLd";
import { organizationLd, websiteLd } from "@/lib/seo/jsonld";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { SITE_URL } from "@/lib/seo/canonical";
import { hreflangAlternates } from "@/lib/seo/hreflang";
import type { Locale } from "@/i18n/config";

// PT Sans é a fonte usada no tema WordPress legado. Mantemos pra preservar
// identidade visual no cutover.
const ptSans = PT_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-pt-sans",
  weight: ["400", "700"],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      template: "%s | Ultimate Drift",
      default: "Ultimate Drift — Campeonato Brasileiro de Drift",
    },
    description:
      "Ultimate Drift é o principal campeonato brasileiro de drift profissional, com etapas em circuitos pelo país e transmissão ao vivo.",
    applicationName: "Ultimate Drift",
    alternates: {
      canonical: locale === routing.defaultLocale ? SITE_URL : `${SITE_URL}/${locale}`,
      languages: hreflangAlternates("/"),
    },
    // Favicon vem de app/icon.tsx (gerado dinamicamente).
    verification: process.env.GOOGLE_SITE_VERIFICATION
      ? { google: process.env.GOOGLE_SITE_VERIFICATION }
      : undefined,
  };
}

export const viewport: Viewport = {
  themeColor: "#313137",
  colorScheme: "dark",
};

export default async function LocaleLayout({ children, params }: LayoutProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} className={ptSans.variable}>
      <head>
        <link rel="preconnect" href="https://storage.googleapis.com" />
        <link rel="preconnect" href="https://firebasestorage.googleapis.com" />
      </head>
      <body className="min-h-screen bg-ink text-signal antialiased">
        <NextIntlClientProvider>
          <PublicHeader />
          <main id="main" className="pt-20">{children}</main>
          <PublicFooter />
        </NextIntlClientProvider>
        <JsonLd data={[organizationLd(), websiteLd()]} />
      </body>
    </html>
  );
}
