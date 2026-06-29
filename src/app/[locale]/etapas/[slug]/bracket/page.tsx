import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getStageHubBySlug, listStageHubs } from "@/lib/stages/queries";
import { getStageBracket, BATTLE_PHASES, type BattlePhase, type PublicBattle } from "@/lib/battles/queries";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { buildMetadata } from "@/lib/seo/meta";
import type { Locale } from "@/i18n/config";

export const revalidate = 300;

export async function generateStaticParams() {
  const stages = await listStageHubs().catch(() => []);
  return stages.map((s) => ({ slug: s.slug }));
}

type PageParams = Promise<{ locale: Locale; slug: string }>;

const PHASE_LABEL: Record<BattlePhase, string> = {
  qualify: "Qualify",
  roundof32: "Top 32",
  roundof16: "Top 16",
  quarterfinals: "Quarterfinals",
  semifinals: "Semifinals",
  final: "Final",
};

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { locale, slug } = await params;
  const stage = await getStageHubBySlug(slug).catch(() => null);
  if (!stage) return {};
  const t = await getTranslations({ locale, namespace: "etapas" });
  return buildMetadata({
    href: "/etapas/[slug]/bracket",
    locale,
    params: { slug },
    title: `${stage.name} — ${t("bracket")}`,
    description: `Chaveamento das batalhas da etapa ${stage.name} do Ultimate Drift.`,
  });
}

export default async function BracketPage({ params }: { params: PageParams }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const stage = await getStageHubBySlug(slug);
  if (!stage) notFound();
  const t = await getTranslations("etapas");

  const bracket = stage.stageId ? await getStageBracket(stage.stageId) : null;

  return (
    <div className="mx-auto max-w-wide px-4 py-12 lg:px-8 lg:py-16">
      <Breadcrumbs
        items={[
          { label: t("title"), href: "/etapas" },
          { label: stage.name, href: "/etapas/[slug]", params: { slug } },
          { label: t("bracket"), href: "/etapas/[slug]/bracket", params: { slug } },
        ]}
        locale={locale}
      />

      <header className="mb-10">
        <p className="eyebrow">{t("bracket")}</p>
        <h1 className="display mt-2 text-4xl text-signal lg:text-5xl">{stage.name}</h1>
      </header>

      {!bracket || Object.keys(bracket.phases).length === 0 ? (
        <p className="text-mute">—</p>
      ) : (
        <div className="space-y-10">
          {BATTLE_PHASES.filter((p) => bracket.phases[p]?.length).map((phase) => (
            <PhaseColumn
              key={phase}
              title={PHASE_LABEL[phase]}
              battles={bracket.phases[phase] ?? []}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PhaseColumn({ title, battles }: { title: string; battles: PublicBattle[] }) {
  return (
    <section>
      <h2 className="eyebrow mb-3 text-drift">{title}</h2>
      <ul className="grid gap-3 md:grid-cols-2">
        {battles.map((b) => (
          <li key={b.id} className="rounded border border-rail bg-panel/30 p-3">
            <p className="text-xs uppercase tracking-wider text-mute">Rodada {b.rodada ?? "—"}</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <BattleSide name={b.piloto1 ?? b.nomePiloto1} won={b.vencedor === b.piloto1 || b.vencedorId === b.idPiloto1} />
              <span className="data text-faint">vs</span>
              <BattleSide name={b.piloto2 ?? b.nomePiloto2} won={b.vencedor === b.piloto2 || b.vencedorId === b.idPiloto2} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function BattleSide({ name, won }: { name: string | null; won: boolean }) {
  return (
    <span className={won ? "font-bold text-drift" : "text-signal/90"}>
      {name ?? "—"}
    </span>
  );
}
