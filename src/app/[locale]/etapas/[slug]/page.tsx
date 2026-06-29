import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { ChevronRight } from "lucide-react";
import { getStageHubBySlug, listStageHubs } from "@/lib/stages/queries";
import { getCircuitById } from "@/lib/circuits/queries";
import { buildMetadata } from "@/lib/seo/meta";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { sportsEventLd } from "@/lib/seo/jsonld";
import { canonical } from "@/lib/seo/canonical";
import { formatDateRange } from "@/lib/format";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/config";

export const revalidate = 600;

export async function generateStaticParams() {
  const stages = await listStageHubs().catch(() => []);
  return stages.map((s) => ({ slug: s.slug }));
}

type PageParams = Promise<{ locale: Locale; slug: string }>;

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { locale, slug } = await params;
  const stage = await getStageHubBySlug(slug).catch(() => null);
  if (!stage) return {};
  return buildMetadata({
    href: "/etapas/[slug]",
    locale,
    params: { slug },
    title: stage.name,
    description: `Etapa ${stage.name} do Ultimate Drift. Cronograma, mapa e resultados.`,
    image: stage.posterImageHighUrl ?? stage.posterImageUrl ?? undefined,
  });
}

export default async function StagePage({ params }: { params: PageParams }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("etapas");
  const stage = await getStageHubBySlug(slug);
  if (!stage) notFound();

  const circuit = stage.circuitId ? await getCircuitById(stage.circuitId) : null;

  const ld = sportsEventLd({
    name: stage.name,
    url: canonical("/etapas/[slug]", locale, { slug }),
    startDate: stage.startDate?.toISOString() ?? new Date().toISOString(),
    endDate: stage.endDate?.toISOString(),
    locationName: circuit?.name ?? stage.name,
    locationAddress: circuit ? { city: circuit.city, country: circuit.country } : undefined,
    image: stage.posterImageHighUrl ?? stage.posterImageUrl,
    description: circuit?.description ?? null,
  });

  return (
    <div className="mx-auto max-w-wide px-4 py-12 lg:px-8 lg:py-16">
      <Breadcrumbs
        items={[
          { label: t("title"), href: "/etapas" },
          { label: stage.name, href: "/etapas/[slug]", params: { slug } },
        ]}
        locale={locale}
      />

      <header className="grid gap-6 lg:grid-cols-[1.4fr,1fr]">
        <div>
          {stage.startDate && (
            <p className="eyebrow">{formatDateRange(stage.startDate, stage.endDate, locale)}</p>
          )}
          <h1 className="display mt-2 text-4xl text-signal lg:text-6xl">{stage.name}</h1>
          {circuit && (
            <p className="mt-3 text-mute">
              {circuit.name}
              {circuit.city && ` · ${circuit.city}`}
              {circuit.country && `, ${circuit.country}`}
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={{ pathname: "/etapas/[slug]/qualifying", params: { slug } }}
              className="inline-flex items-center gap-1 rounded border border-rail px-3 py-2 text-xs uppercase tracking-[0.18em] text-mute hover:text-signal hover:border-drift"
            >
              {t("viewQualifying")} <ChevronRight className="size-3" aria-hidden />
            </Link>
            <Link
              href={{ pathname: "/etapas/[slug]/bracket", params: { slug } }}
              className="inline-flex items-center gap-1 rounded border border-rail px-3 py-2 text-xs uppercase tracking-[0.18em] text-mute hover:text-signal hover:border-drift"
            >
              {t("viewBracket")} <ChevronRight className="size-3" aria-hidden />
            </Link>
          </div>
        </div>

        {stage.posterImageHighUrl && (
          <div className="relative aspect-[4/5] overflow-hidden rounded border border-rail">
            <Image
              src={stage.posterImageHighUrl}
              alt={stage.name}
              fill
              priority
              sizes="(min-width: 1024px) 500px, 100vw"
              className="object-cover"
              unoptimized
            />
          </div>
        )}
      </header>

      {stage.timetable.length > 0 && (
        <section className="mt-12">
          <h2 className="eyebrow mb-4">{t("timetable")}</h2>
          <div className="space-y-6">
            {stage.timetable.map((day) => (
              <div key={day.day}>
                <p className="data mb-2 text-sm uppercase tracking-wider text-drift">{day.day}</p>
                <ul className="divide-y divide-rail rounded border border-rail">
                  {day.items.map((item, i) => (
                    <li key={i} className="flex items-baseline gap-4 px-3 py-2">
                      <span className="data shrink-0 text-sm text-signal">
                        {item.startTime}
                        {item.endTime ? `–${item.endTime}` : ""}
                      </span>
                      <div className="flex-1">
                        <p className="text-signal">{item.title}</p>
                        {item.sublocation && (
                          <p className="text-xs text-mute">{item.sublocation}</p>
                        )}
                      </div>
                      <span className="hidden md:inline text-xs uppercase tracking-wider text-faint">
                        {t(`categories.${item.category}` as never)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {circuit?.description && (
        <section className="mt-12">
          <h2 className="eyebrow mb-3">{t("circuit")}</h2>
          <p className="max-w-3xl whitespace-pre-line text-signal/90">{circuit.description}</p>
        </section>
      )}

      <JsonLd data={ld} />
    </div>
  );
}
