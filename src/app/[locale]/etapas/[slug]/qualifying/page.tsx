import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getStageHubBySlug, listStageHubs } from "@/lib/stages/queries";
import { getStageQualifying } from "@/lib/qualifyings/queries";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { buildMetadata } from "@/lib/seo/meta";
import type { Locale } from "@/i18n/config";

export const revalidate = 300;

export async function generateStaticParams() {
  const stages = await listStageHubs().catch(() => []);
  return stages.map((s) => ({ slug: s.slug }));
}

type PageParams = Promise<{ locale: Locale; slug: string }>;

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { locale, slug } = await params;
  const stage = await getStageHubBySlug(slug).catch(() => null);
  if (!stage) return {};
  const t = await getTranslations({ locale, namespace: "etapas" });
  return buildMetadata({
    href: "/etapas/[slug]/qualifying",
    locale,
    params: { slug },
    title: `${stage.name} — ${t("qualifying")}`,
    description: `Resultado do qualifying da etapa ${stage.name} do Ultimate Drift.`,
  });
}

export default async function QualifyingPage({ params }: { params: PageParams }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const stage = await getStageHubBySlug(slug);
  if (!stage) notFound();
  const t = await getTranslations("etapas");
  const tClass = await getTranslations("classificacao");

  const qualifying = stage.stageId ? await getStageQualifying(stage.stageId) : null;

  return (
    <div className="mx-auto max-w-wide px-4 py-12 lg:px-8 lg:py-16">
      <Breadcrumbs
        items={[
          { label: t("title"), href: "/etapas" },
          { label: stage.name, href: "/etapas/[slug]", params: { slug } },
          { label: t("qualifying"), href: "/etapas/[slug]/qualifying", params: { slug } },
        ]}
        locale={locale}
      />

      <header className="mb-10">
        <p className="eyebrow">{t("qualifying")}</p>
        <h1 className="display mt-2 text-4xl text-signal lg:text-5xl">{stage.name}</h1>
      </header>

      {!qualifying || (qualifying.firstLap.length === 0 && qualifying.secondLap.length === 0) ? (
        <p className="text-mute">{tClass("empty")}</p>
      ) : (
        <div className="grid gap-10 lg:grid-cols-2">
          <LapTable title="1st Lap" laps={qualifying.firstLap} />
          <LapTable title="2nd Lap" laps={qualifying.secondLap} />
        </div>
      )}
    </div>
  );
}

function LapTable({ title, laps }: { title: string; laps: Array<{ position: number | null; driverName: string; driverNickname: string | null; score: number | null }> }) {
  if (laps.length === 0) return null;
  return (
    <section>
      <h2 className="eyebrow mb-3">{title}</h2>
      <div className="overflow-x-auto rounded border border-rail">
        <table className="w-full text-sm">
          <thead className="bg-panel text-xs uppercase tracking-wider text-mute">
            <tr>
              <th className="px-3 py-2 text-left">Pos.</th>
              <th className="px-3 py-2 text-left">Piloto</th>
              <th className="px-3 py-2 text-right">Score</th>
            </tr>
          </thead>
          <tbody>
            {laps.map((l, i) => (
              <tr key={`${i}-${l.driverName}`} className="border-t border-rail">
                <td className="px-3 py-2 data text-mute">{l.position ?? i + 1}.</td>
                <td className="px-3 py-2 text-signal">{l.driverNickname ?? l.driverName}</td>
                <td className="px-3 py-2 text-right data font-bold text-drift">{l.score ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
