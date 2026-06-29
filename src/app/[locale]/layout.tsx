import "../globals.css";
import type { Metadata, Viewport } from "next";
import { Inter, Oswald } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import Script from "next/script";
import { routing } from "@/i18n/routing";
import { JsonLd } from "@/components/seo/JsonLd";
import { organizationLd, websiteLd } from "@/lib/seo/jsonld";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { SITE_URL } from "@/lib/seo/canonical";
import { hreflangAlternates } from "@/lib/seo/hreflang";
import type { Locale } from "@/i18n/config";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });
const oswald = Oswald({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-oswald",
  weight: ["400", "600", "700"],
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
    icons: {
      icon: [
        { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      ],
      apple: "/icon-192.png",
    },
    verification: process.env.GOOGLE_SITE_VERIFICATION
      ? { google: process.env.GOOGLE_SITE_VERIFICATION }
      : undefined,
  };
}

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  colorScheme: "dark",
};

export default async function LocaleLayout({ children, params }: LayoutProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} className={`${inter.variable} ${oswald.variable}`} data-theme="dark">
      <head>
        <link rel="preconnect" href="https://storage.googleapis.com" />
        <link rel="preconnect" href="https://firebasestorage.googleapis.com" />
      </head>
      <body className="min-h-screen bg-ink text-signal antialiased">
        <NextIntlClientProvider>
          <PublicHeader />
          <main id="main">{children}</main>
          <PublicFooter />
        </NextIntlClientProvider>
        <JsonLd data={[organizationLd(), websiteLd()]} />
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){try{var t=localStorage.getItem('ud-theme');if(t){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`}
        </Script>
      </body>
    </html>
  );
}
