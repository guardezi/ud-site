import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { UDImage } from "@/components/ui/UDImage";
import type { StaticPathname } from "@/lib/routes";
import type { ChampionshipClassification } from "@/lib/championship/queries";
import { driverSlug } from "@/lib/utils/slug";
import { formatStageScore } from "@/lib/championship/stage-score";

/**
 * "Classificação Geral": pódio (2º/1º/3º, classes `index__rank-*` do tema
 * legado) + tabela com POS, piloto (foto, nome, #número), pontos por etapa e
 * TOTAL. Os 3 primeiros com borda verde. No mobile a tabela rola na
 * horizontal dentro do próprio container (min-width fixa).
 *
 * Dados: `getActiveChampionshipClassification` (mesma lógica da home do
 * ud-app) adaptados por `toStandingsData`.
 */
export type StandingsDriver = {
  position: number;
  name: string;
  number: number | null;
  /** Path do Storage (ou URL) da foto; sem foto, placeholder do UDImage. */
  photo: string | null;
  /** Slug do perfil em /pilotos/[slug]; sem slug, a linha não é link. */
  slug: string | null;
  /** Pontos por etapa, na ordem (`formatStageScore`): "31", "0" = correu e zerou; `null` = não correu ("—"). */
  stagePoints: (string | null)[];
  total: number;
};

export type ChampionshipStandingsData = {
  year: number | null;
  /** Quantidade de colunas de etapa (1ª…Nª). */
  stageCount: number;
  drivers: StandingsDriver[];
  fullStandingsHref: StaticPathname;
};

function PodiumCard({ driver, place }: { driver: StandingsDriver; place: "first" | "second" | "third" }) {
  const t = useTranslations("homeSections");
  const inner = (
    <div className={`index__rank-${place}`}>
      <span className="index__rank-position">{t("podiumPlace", { position: driver.position })}</span>
      <div className="index__driver-box">
        <div className="index__rank-img-box">
          <UDImage
            src={driver.photo}
            alt={driver.name}
            baseVariant="medium"
            srcsetPreset="compact"
            sizes="220px"
            width={220}
            height={220}
            className="index__rank-driver-img"
          />
        </div>
        <div className="index__rank-bottom">
          <div className="index__rank-number-box">
            <span className="index__rank-number">{driver.number ?? "–"}</span>
          </div>
          <div className="index__driver-name flex-1 text-center">{driver.name}</div>
        </div>
      </div>
    </div>
  );
  const title = t("viewDriver", { name: driver.name });
  return driver.slug ? (
    <Link href={{ pathname: "/pilotos/[slug]", params: { slug: driver.slug } }} className="index__rank-driver" title={title}>
      {inner}
    </Link>
  ) : (
    <div className="index__rank-driver">{inner}</div>
  );
}

const GRID = "grid grid-cols-[70px_200px_repeat(var(--stages),minmax(0,1fr))_110px] items-center gap-x-2";

/** Colunas de etapa da tabela (layout fixo do site legado). */
export const STANDINGS_STAGE_COLUMNS = 10;
const TOP = 10;

/**
 * Classificação do campeonato → props da seção: top 10 do ranking geral;
 * pontos das 10 primeiras etapas via `formatStageScore` (PR #13): "0" quando
 * correu e zerou, "—" quando não correu;
 * slug do perfil igual ao de /pilotos (`driverSlug`). `null` sem dados.
 */
export function toStandingsData(c: ChampionshipClassification | null): ChampionshipStandingsData | null {
  if (!c || c.pilots.length === 0) return null;
  return {
    year: c.year,
    stageCount: STANDINGS_STAGE_COLUMNS,
    fullStandingsHref: "/classificacao",
    drivers: c.pilots.slice(0, TOP).map((p) => ({
      position: p.position,
      name: p.name,
      number: p.number,
      photo: p.photo,
      slug: p.name ? driverSlug({ apelido: p.name, numero: p.number }) : null,
      stagePoints: Array.from({ length: STANDINGS_STAGE_COLUMNS }, (_, i) => formatStageScore(p.stageEntries[i])),
      total: p.totalScore,
    })),
  };
}

export function ChampionshipStandings({ data }: { data: ChampionshipStandingsData }) {
  const t = useTranslations("homeSections");
  const [first, second, third] = data.drivers;
  const stageCols = Array.from({ length: data.stageCount }, (_, i) => i + 1);
  const gridStyle = { "--stages": data.stageCount } as React.CSSProperties;

  return (
    <section className="index__rank">
      <div className="wrapper">
        <h2 className="ui__title">{t("standingsTitle", { year: data.year ?? "" })}</h2>
      </div>

      {first && second && third && (
        <div className="index__rank-box">
          <div className="wrapper">
            <div className="index__rank-drivers">
              <PodiumCard driver={second} place="second" />
              <PodiumCard driver={first} place="first" />
              <PodiumCard driver={third} place="third" />
            </div>
          </div>
        </div>
      )}

      <div className="wrapper">
        <div className="mt-[90px] overflow-x-auto pb-2">
          <div className="min-w-[1000px]" style={gridStyle}>
            <div className={`${GRID} px-5 pb-3 text-xs font-bold uppercase tracking-wide text-faint`}>
              <span className="text-center">{t("colPos")}</span>
              <span>{t("colDriver")}</span>
              {stageCols.map((n) => (
                <span key={n} className="text-center">
                  {t("colStage", { n })}
                </span>
              ))}
              <span className="text-center">{t("colTotal")}</span>
            </div>

            <ol className="m-0 list-none space-y-4 p-0">
              {data.drivers.map((d) => {
                const row = (
                  <div
                    className={`${GRID} rounded-xl bg-white px-5 py-3 text-[#141417] ${
                      d.position <= 3 ? "ring-2 ring-drift" : ""
                    }`}
                  >
                    <span className="text-center text-xl font-bold text-[#002C04]">{d.position}º</span>
                    <span className="flex min-w-0 items-center gap-3">
                      <UDImage
                        src={d.photo}
                        alt=""
                        baseVariant="small"
                        srcsetPreset="compact"
                        sizes="64px"
                        width={64}
                        height={64}
                        className="size-16 shrink-0 rounded-full bg-gradient-to-b from-[#a1a1a1] to-white object-cover object-top"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-base font-bold">{d.name}</span>
                        {d.number != null && <span className="block text-sm text-[#6b6b6b]">#{d.number}</span>}
                      </span>
                    </span>
                    {stageCols.map((n) => {
                      const v = d.stagePoints[n - 1];
                      return (
                        <span key={n} className="text-center text-sm font-bold">
                          {v == null ? <span className="text-[#9b9b9b]">—</span> : v}
                        </span>
                      );
                    })}
                    <span className="flex flex-col items-center justify-center rounded-lg bg-[#002C04] py-2 leading-none">
                      <span className="text-xl font-bold text-drift">{d.total}</span>
                      <span className="mt-1 text-[10px] font-bold uppercase text-white">{t("pts")}</span>
                    </span>
                  </div>
                );
                return (
                  <li key={d.position}>
                    {d.slug ? (
                      <Link
                        href={{ pathname: "/pilotos/[slug]", params: { slug: d.slug } }}
                        title={t("viewDriver", { name: d.name })}
                        className="block"
                      >
                        {row}
                      </Link>
                    ) : (
                      row
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        <Link href={data.fullStandingsHref} className="index__rank-button button">
          {t("fullStandings")}
        </Link>
      </div>
    </section>
  );
}
