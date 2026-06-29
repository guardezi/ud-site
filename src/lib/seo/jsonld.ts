import { SITE_URL } from "./canonical";

const ORG_ID = `${SITE_URL}#organization`;
const SITE_ID = `${SITE_URL}#website`;

const ORG_DESCRIPTION =
  "Ultimate Drift é o principal campeonato brasileiro de drift profissional, com etapas em circuitos pelo país e transmissão ao vivo.";

const SOCIAL: string[] = [
  "https://www.instagram.com/ultimatedriftbr",
  "https://www.youtube.com/@ultimatedrift",
  "https://www.facebook.com/ultimatedriftbr",
  "https://www.tiktok.com/@ultimatedrift",
];

export function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SportsOrganization",
    "@id": ORG_ID,
    name: "Ultimate Drift",
    alternateName: "UD",
    url: SITE_URL,
    logo: `${SITE_URL}/icon-512.png`,
    description: ORG_DESCRIPTION,
    sport: "Drifting",
    foundingLocation: { "@type": "Country", name: "Brasil" },
    sameAs: SOCIAL,
  };
}

export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": SITE_ID,
    url: SITE_URL,
    name: "Ultimate Drift",
    description: ORG_DESCRIPTION,
    publisher: { "@id": ORG_ID },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/noticias?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbLd(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function itemListLd(args: {
  name: string;
  url: string;
  items: Array<{ name: string; url: string; image?: string | null }>;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: args.name,
    url: args.url,
    numberOfItems: args.items.length,
    itemListElement: args.items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: item.url,
      name: item.name,
      ...(item.image ? { image: item.image } : {}),
    })),
  };
}

export function personLd(args: {
  name: string;
  alternateName?: string | null;
  url: string;
  image?: string | null;
  description?: string | null;
  nationality?: string | null;
  sameAs?: string[];
  jobTitle?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: args.name,
    ...(args.alternateName ? { alternateName: args.alternateName } : {}),
    url: args.url,
    ...(args.image ? { image: args.image } : {}),
    ...(args.description ? { description: args.description } : {}),
    jobTitle: args.jobTitle ?? "Professional drift driver",
    ...(args.nationality ? { nationality: args.nationality } : {}),
    ...(args.sameAs && args.sameAs.length ? { sameAs: args.sameAs } : {}),
  };
}

export function sportsEventLd(args: {
  name: string;
  url: string;
  startDate: string;
  endDate?: string;
  locationName: string;
  locationAddress?: { city?: string | null; region?: string | null; country?: string | null };
  image?: string | null;
  description?: string | null;
  performers?: Array<{ name: string; url?: string }>;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: args.name,
    url: args.url,
    startDate: args.startDate,
    ...(args.endDate ? { endDate: args.endDate } : {}),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/MixedEventAttendanceMode",
    sport: "Drifting",
    organizer: { "@id": ORG_ID },
    location: {
      "@type": "Place",
      name: args.locationName,
      ...(args.locationAddress
        ? {
            address: {
              "@type": "PostalAddress",
              ...(args.locationAddress.city ? { addressLocality: args.locationAddress.city } : {}),
              ...(args.locationAddress.region ? { addressRegion: args.locationAddress.region } : {}),
              ...(args.locationAddress.country ? { addressCountry: args.locationAddress.country } : {}),
            },
          }
        : {}),
    },
    ...(args.image ? { image: args.image } : {}),
    ...(args.description ? { description: args.description } : {}),
    ...(args.performers && args.performers.length
      ? {
          performer: args.performers.map((p) => ({
            "@type": "Person",
            name: p.name,
            ...(p.url ? { url: p.url } : {}),
          })),
        }
      : {}),
  };
}

export function articleLd(args: {
  headline: string;
  url: string;
  datePublished: string;
  dateModified?: string;
  authorName?: string;
  image?: string | null;
  description?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: args.headline,
    url: args.url,
    datePublished: args.datePublished,
    ...(args.dateModified ? { dateModified: args.dateModified } : {}),
    ...(args.image ? { image: args.image } : {}),
    ...(args.description ? { description: args.description } : {}),
    ...(args.authorName
      ? {
          author: {
            "@type": "Person",
            name: args.authorName,
          },
        }
      : {}),
    publisher: { "@id": ORG_ID },
    mainEntityOfPage: { "@type": "WebPage", "@id": args.url },
  };
}
