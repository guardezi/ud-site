import type { MetadataRoute } from "next";
import { LOCALES, DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { routing, type AppPathname } from "@/i18n/routing";
import { canonical } from "@/lib/seo/canonical";
import { listPublicDrivers } from "@/lib/drivers/queries";
import { listStageHubs } from "@/lib/stages/queries";
import { listDriftCategories } from "@/lib/driftCategories/queries";
import { listAllNewsSlugs } from "@/lib/news/queries";

type Entry = MetadataRoute.Sitemap[number];

function entry(
  href: AppPathname,
  opts: {
    params?: Record<string, string>;
    lastModified?: Date;
    changeFrequency?: Entry["changeFrequency"];
    priority?: number;
  } = {},
): Entry[] {
  const languages: Record<string, string> = {};
  for (const locale of LOCALES) {
    languages[locale] = canonical(href, locale, opts.params);
  }
  return LOCALES.map((locale) => ({
    url: canonical(href, locale, opts.params),
    lastModified: opts.lastModified,
    changeFrequency: opts.changeFrequency,
    priority: opts.priority,
    alternates: { languages: { ...languages, "x-default": canonical(href, DEFAULT_LOCALE, opts.params) } },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: Entry[] = [
    ...entry("/", { changeFrequency: "daily", priority: 1.0, lastModified: now }),
    ...entry("/pilotos", { changeFrequency: "weekly", priority: 0.8, lastModified: now }),
    ...entry("/etapas", { changeFrequency: "weekly", priority: 0.8, lastModified: now }),
    ...entry("/classificacao", { changeFrequency: "daily", priority: 0.8, lastModified: now }),
    ...entry("/categorias", { changeFrequency: "monthly", priority: 0.6, lastModified: now }),
    ...entry("/noticias", { changeFrequency: "daily", priority: 0.8, lastModified: now }),
    ...entry("/patrocinadores", { changeFrequency: "monthly", priority: 0.5, lastModified: now }),
    ...entry("/contato", { changeFrequency: "yearly", priority: 0.4, lastModified: now }),
    ...entry("/sobre", { changeFrequency: "yearly", priority: 0.4, lastModified: now }),
    ...entry("/termos", { changeFrequency: "yearly", priority: 0.2, lastModified: now }),
    ...entry("/privacidade", { changeFrequency: "yearly", priority: 0.2, lastModified: now }),
  ];

  let drivers: Awaited<ReturnType<typeof listPublicDrivers>> = [];
  let stages: Awaited<ReturnType<typeof listStageHubs>> = [];
  let categories: Awaited<ReturnType<typeof listDriftCategories>> = [];
  let news: Awaited<ReturnType<typeof listAllNewsSlugs>> = [];

  try {
    [drivers, stages, categories, news] = await Promise.all([
      listPublicDrivers(),
      listStageHubs(),
      listDriftCategories(),
      listAllNewsSlugs(),
    ]);
  } catch {
    // Falha de Firestore não derruba sitemap — pelo menos as rotas estáticas saem.
  }

  const driverEntries = drivers.flatMap((d) =>
    entry("/pilotos/[slug]", {
      params: { slug: d.slug },
      changeFrequency: "weekly",
      priority: 0.6,
    }),
  );

  const stageEntries = stages.flatMap((s) => [
    ...entry("/etapas/[slug]", {
      params: { slug: s.slug },
      changeFrequency: "daily",
      priority: 0.7,
      lastModified: s.startDate ?? undefined,
    }),
    ...entry("/etapas/[slug]/qualifying", {
      params: { slug: s.slug },
      changeFrequency: "weekly",
      priority: 0.5,
      lastModified: s.startDate ?? undefined,
    }),
    ...entry("/etapas/[slug]/bracket", {
      params: { slug: s.slug },
      changeFrequency: "weekly",
      priority: 0.5,
      lastModified: s.startDate ?? undefined,
    }),
  ]);

  const categoryEntries = categories.flatMap((c) =>
    entry("/categorias/[slug]", {
      params: { slug: c.slug },
      changeFrequency: "monthly",
      priority: 0.5,
    }),
  );

  const newsEntries: Entry[] = news.flatMap((n) => {
    // News é per-locale; emite apenas a URL no locale do doc.
    const locale = n.locale as Locale;
    return [
      {
        url: canonical("/noticias/[slug]", locale, { slug: n.slug }),
        lastModified: n.updatedAt ?? undefined,
        changeFrequency: "weekly",
        priority: 0.7,
      },
    ];
  });

  return [...staticEntries, ...driverEntries, ...stageEntries, ...categoryEntries, ...newsEntries];
}
