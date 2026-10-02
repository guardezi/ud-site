"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { imageSrcSet, imageVariant } from "@/lib/firebase/image-variants";
import type { ClassificationSeason, SeasonCategory, SeasonPilot, SeasonStage } from "@/lib/championship/seasons";
import "./classification.css";

/**
 * /classificacao com o markup e as classes do tema legado (`rank__*`,
 * `rank-card*`, `rank-list__*`): botões de temporada, GERAL/ROOKIE/MASTER e
 * uma linha por piloto com pontos por etapa + total, linkando pro perfil.
 */
export function ClassificationBoard({
  seasons,
  initialChampionshipId,
}: {
  seasons: ClassificationSeason[];
  initialChampionshipId: number;
}) {
  const t = useTranslations("classificacao");
  const router = useRouter();
  const [seasonId, setSeasonId] = useState(initialChampionshipId);
  const [categoryBySeason, setCategoryBySeason] = useState<Record<number, SeasonCategory>>({});

  // `?categoria=` lido no cliente pra página continuar ISR (useSearchParams
  // tiraria o board do HTML estático). Aceita `rookie`/`master`/`geral` e o
  // formato do site legado `rookie-2026` (o ano escolhe a temporada).
  useEffect(() => {
    const parsed = parseCategoria(new URLSearchParams(window.location.search).get("categoria"));
    if (!parsed) return;
    const season = (parsed.year != null && seasons.find((s) => s.year === parsed.year)) || null;
    const id = season?.championshipId ?? initialChampionshipId;
    const target = seasons.find((s) => s.championshipId === id);
    const cat = target?.categories.some((c) => c.key === parsed.category) ? parsed.category : "Pro";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza com a URL só na montagem
    setSeasonId(id);
    setCategoryBySeason((prev) => ({ ...prev, [id]: cat }));
  }, [seasons, initialChampionshipId]);

  // Mantém a URL compartilhável: `?categoria=rookie` na temporada padrão,
  // `?categoria=rookie-2025` em outra; geral na padrão = sem parâmetro.
  const syncUrl = (id: number, cat: SeasonCategory) => {
    const season = seasons.find((s) => s.championshipId === id);
    const url = new URL(window.location.href);
    const base = cat === "Pro" ? "geral" : cat.toLowerCase();
    if (id === initialChampionshipId) {
      if (cat === "Pro") url.searchParams.delete("categoria");
      else url.searchParams.set("categoria", base);
    } else {
      url.searchParams.set("categoria", `${base}-${season?.year ?? ""}`);
    }
    window.history.replaceState(window.history.state, "", url);
  };

  return (
    <section className="rank">
      <div className="wrapper">
        <a
          href="#"
          className="ui__title"
         
          onClick={(e) => {
            e.preventDefault();
            if (window.history.length > 1) window.history.back();
            else router.push("/");
          }}
        >
          <BackIcon />
          <h1>{t("title")}</h1>
        </a>

        <div className="rank__content">
          <div className="rank__seasons">
            {seasons.map((s) => (
              <button
                key={s.championshipId}
                type="button"
                className={`rank__season-btn button ${s.championshipId === seasonId ? "active" : ""}`}
                onClick={() => {
                  setSeasonId(s.championshipId);
                  syncUrl(s.championshipId, categoryBySeason[s.championshipId] ?? "Pro");
                }}
              >
                {s.year}
              </button>
            ))}
          </div>

          {seasons.map((s) => {
            const active = categoryBySeason[s.championshipId] ?? "Pro";
            return (
              <div
                key={s.championshipId}
                className={`rank__season-content ${s.championshipId === seasonId ? "active" : ""}`}
              >
                <div className="rank__buttons">
                  {s.categories.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      className={`rank__button ${c.key === active ? "active" : ""}`}
                      onClick={() => {
                        setCategoryBySeason((prev) => ({ ...prev, [s.championshipId]: c.key }));
                        syncUrl(s.championshipId, c.key);
                      }}
                    >
                      {t(`category${c.key}`)}
                    </button>
                  ))}
                </div>

                <div className="rank__tables">
                  {s.categories.map((c) => (
                    <div
                      key={c.key}
                      className={`${c.key === "Pro" ? "rank__geral" : c.key === "Rookie" ? "rank__rookie" : "rank__master"} ${
                        c.key === active ? "active" : ""
                      }`}
                    >
                      <RankList stages={s.stages} pilots={c.pilots} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/** `rookie` | `master` | `geral`/`pro`, opcionalmente com `-AAAA`. Desconhecido → geral. */
function parseCategoria(raw: string | null): { category: SeasonCategory; year: number | null } | null {
  if (!raw) return null;
  const m = /^([a-z]+)(?:-(\d{4}))?$/.exec(raw.trim().toLowerCase());
  const name = m?.[1] ?? "";
  const category: SeasonCategory = name === "rookie" ? "Rookie" : name === "master" ? "Master" : "Pro";
  return { category, year: m?.[2] ? Number(m[2]) : null };
}

function stageTitle(t: ReturnType<typeof useTranslations>, s: SeasonStage) {
  return s.city ? t("stageTitle", { n: s.number, city: s.city }) : t("stageTitleNoCity", { n: s.number });
}

function RankList({ stages, pilots }: { stages: SeasonStage[]; pilots: SeasonPilot[] }) {
  const t = useTranslations("classificacao");
  const cols = { "--rank-cols": `56px minmax(180px,1fr) repeat(${stages.length}, minmax(64px,84px)) 90px` } as React.CSSProperties;

  return (
    <div className="index__rank-list-wrap">
      <div className="rank-list__header" style={cols}>
        <span className="rank-list__header-cell rank-list__header-pos">{t("colPos")}</span>
        <span className="rank-list__header-cell rank-list__header-piloto">{t("driver")}</span>
        <div className="rank-list__header-etapas">
          {stages.map((s) => (
            <span key={s.stageId} className="rank-list__header-cell rank-list__header-etapa" title={stageTitle(t, s)}>
              {t("stageOrdinal", { n: s.number })}
            </span>
          ))}
        </div>
        <span className="rank-list__header-cell rank-list__header-total">{t("colTotal")}</span>
      </div>

      <div className="index__rank-list">
        {pilots.map((p) => {
          const body = (
            <>
              <span className="rank-card__position">
                {p.position}
                <small>º</small>
              </span>
              <div className="rank-card__piloto">
                <div className="rank-card__avatar">
                  {p.category === "Master" || p.category === "Rookie" ? (
                    <span className="rank-card__category" data-category={p.category.toUpperCase()}>
                      {p.category.toUpperCase()}
                    </span>
                  ) : null}
                  <Avatar photo={p.photo} alt={t("photoAlt", { name: p.name })} />
                </div>
                <div className="rank-card__info">
                  <span className="rank-card__name">{p.name}</span>
                  {p.number != null && <span className="rank-card__number">#{p.number}</span>}
                </div>
              </div>
              <div className="rank-card__etapas">
                {stages.map((s) => {
                  const v = p.scores[s.stageId];
                  return (
                    <span
                      key={s.stageId}
                      className={`rank-card__etapa ${v ? "" : "rank-card__etapa--empty"}`}
                      title={stageTitle(t, s)}
                    >
                      <small className="rank-card__etapa-label">{t("stageOrdinal", { n: s.number })}</small>
                      {v ? v : "—"}
                    </span>
                  );
                })}
              </div>
              <div className="rank-card__total">
                <span className="rank-card__total-value">{p.totalScore}</span>
                <span className="rank-card__total-label">{t("pts")}</span>
              </div>
            </>
          );
          return p.slug ? (
            <Link
              key={p.driverId}
              className="rank-card"
              style={cols}
              href={{ pathname: "/pilotos/[slug]", params: { slug: p.slug } }}
              title={t("viewDriver", { name: p.name })}
            >
              {body}
            </Link>
          ) : (
            <div key={p.driverId} className="rank-card" style={cols}>
              {body}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Avatar({ photo, alt }: { photo: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);
  const src = imageVariant(photo, "small");
  if (!src || failed) return <span className="rank-card__img rank-card__img--placeholder" />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      srcSet={imageSrcSet(photo, "compact") ?? undefined}
      sizes="64px"
      alt={alt}
      className="rank-card__img"
      width={80}
      height={80}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

function BackIcon() {
  return (
    <svg className="ui__icon" width="15" height="27" viewBox="0 0 15 27" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M13.5208 26.7703C13.8818 27.1025 14.4396 27.0692 14.7678 26.7039C15.096 26.3386 15.0632 25.774 14.7022 25.4419L2.00202 13.8182C1.67385 13.5193 1.67385 13.0875 2.00202 12.7886L14.7022 1.5634C15.0632 1.23129 15.096 0.666705 14.8006 0.301387C14.4725 -0.0639308 13.9146 -0.0971413 13.5536 0.201755L0.853422 11.4602C-0.262355 12.4565 -0.295172 14.1171 0.820606 15.1466L13.5208 26.7703Z"
        fill="#54F251"
      />
    </svg>
  );
}
