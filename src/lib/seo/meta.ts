import type { Metadata } from "next";
import type { Locale } from "@/i18n/config";
import type { AppPathname } from "@/i18n/routing";
import { canonical, absoluteUrl, SITE_URL } from "./canonical";
import { hreflangAlternates } from "./hreflang";

type Params = Record<string, string | number> | undefined;

const OG_FALLBACK = `${SITE_URL}/opengraph-default.png`;

const OG_LOCALE: Record<Locale, string> = {
  "pt-BR": "pt_BR",
  "en-US": "en_US",
  "es-ES": "es_ES",
};

const SITE_NAME = "Ultimate Drift";

type BuildMetadataArgs = {
  href: AppPathname;
  locale: Locale;
  params?: Params;
  title: string;
  description: string;
  image?: string | null;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  noindex?: boolean;
};

export function buildMetadata(args: BuildMetadataArgs): Metadata {
  const url = canonical(args.href, args.locale, args.params);
  const image = args.image ? absoluteUrl(args.image) : OG_FALLBACK;

  return {
    title: args.title,
    description: args.description,
    alternates: {
      canonical: url,
      languages: hreflangAlternates(args.href, args.params),
    },
    openGraph: {
      title: args.title,
      description: args.description,
      url,
      type: args.type ?? "website",
      siteName: SITE_NAME,
      locale: OG_LOCALE[args.locale],
      images: [{ url: image, width: 1200, height: 630, alt: args.title }],
      ...(args.publishedTime ? { publishedTime: args.publishedTime } : {}),
      ...(args.modifiedTime ? { modifiedTime: args.modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: args.title,
      description: args.description,
      images: [image],
    },
    robots: args.noindex
      ? { index: false, follow: false }
      : { index: true, follow: true, googleBot: { index: true, follow: true } },
    metadataBase: new URL(SITE_URL),
  };
}
