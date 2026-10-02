import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import {
  getDriverChampionshipStats,
  getDriverProfile,
  resolveDriverSlug,
  type DriverChampionshipStats,
  type PublicDriverProfile,
} from "@/lib/drivers/queries";
import { flagSrc } from "@/lib/drivers/nationality";
import { JsonLd } from "@/components/seo/JsonLd";
import { personLd } from "@/lib/seo/jsonld";
import { canonical } from "@/lib/seo/canonical";
import { buildMetadata } from "@/lib/seo/meta";
import { imageHigh } from "@/lib/firebase/image-variants";
import { UDImage } from "@/components/ui/UDImage";
import { BackTitle } from "@/components/drivers/BackTitle";
import { DriverSocialIcon } from "@/components/drivers/DriverSocialIcon";
import type { Locale } from "@/i18n/config";

export const revalidate = 3600;

// Perfis renderizados sob demanda + ISR (sem pré-render no build): 57 pilotos ×
// 3 locales lendo Firestore em paralelo estouravam o timeout de 60s do build.
export async function generateStaticParams() {
  return [];
}

type PageParams = Promise<{ locale: Locale; slug: string }>;

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { locale, slug } = await params;
  const match = await resolveDriverSlug(slug).catch(() => null);
  const driver = match ? await getDriverProfile(match.id, match.slug) : null;
  if (!driver) return {};
  const t = await getTranslations({ locale, namespace: "pilotos.profile" });
  const description = (driver.bio?.replace(/\s+/g, " ").slice(0, 155) ?? "").trim() || t("metaFallback", { name: driver.apelido });
  return buildMetadata({
    href: "/pilotos/[slug]",
    locale,
    params: { slug: driver.slug },
    title: `${driver.apelido}${driver.numero ? ` #${driver.numero}` : ""}`,
    description,
    image: driver.heroFotoUrl ?? driver.fotoUrl ?? undefined,
  });
}

/** Idade a partir de `nascimento` (YYYY-MM-DD), como `_calculateAge` do app. */
function ageFrom(birth: string | null): number | null {
  if (!birth) return null;
  const [y, m, d] = birth.split("-").map(Number);
  if (!y || !m || !d) return null;
  const now = new Date();
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age--;
  return age > 0 && age < 120 ? age : null;
}

function countryName(code: string, locale: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return code;
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Fotos dos carros do piloto (`carros[].foto` + `carros[].fotos[].url`), principal primeiro. */
function galleryOf(driver: PublicDriverProfile): Array<{ path: string; alt: string }> {
  const cars = [...driver.cars].sort((a, b) => Number(b.principal) - Number(a.principal));
  const seen = new Set<string>();
  const out: Array<{ path: string; alt: string }> = [];
  for (const c of cars) {
    const alt = [c.marca, c.modelo].filter(Boolean).join(" ") || driver.apelido;
    for (const p of [c.fotoPath, ...c.fotos]) {
      if (p && !seen.has(p)) {
        seen.add(p);
        out.push({ path: p, alt });
      }
    }
  }
  return out;
}

export default async function DriverPage({ params }: { params: PageParams }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const match = await resolveDriverSlug(slug);
  if (!match) notFound();
  if (match.slug !== slug) {
    // Formato antigo do ud-site (`{apelido}-{numero}`) → slug canônico (= URL do WordPress).
    permanentRedirect(getPathname({ locale, href: { pathname: "/pilotos/[slug]", params: { slug: match.slug } } }));
  }
  const [driver, champ] = await Promise.all([getDriverProfile(match.id, match.slug), getDriverChampionshipStats(match.id)]);
  if (!driver) notFound();
  const t = await getTranslations("pilotos.profile");

  const car = driver.mainCar;
  const carName = car ? [car.marca, car.modelo].filter(Boolean).join(" ").toUpperCase() : "";
  const age = ageFrom(driver.birthDate);
  const nat = driver.nationality;
  const flag = flagSrc(nat);
  const hometown = [driver.city, driver.state, driver.country].filter(Boolean).join(", ");
  const gallery = galleryOf(driver);

  const ld = personLd({
    name: driver.nome,
    alternateName: driver.apelido,
    url: canonical("/pilotos/[slug]", locale, { slug: driver.slug }),
    image: driver.heroFotoUrl ?? driver.fotoUrl ?? null,
    description: driver.bio,
    nationality: nat ? countryName(nat, "en") : null,
    sameAs: driver.social.map((s) => s.href),
  });

  return (
    <section className="driver">
      <div className="wrapper">
        <BackTitle href="/pilotos" title={driver.apelido} />
      </div>

      <div className="driver__top">
        <div className="wrapper">
          <div className="driver__top-container">
            <div className="driver__top-left" data-animate="slide-left">
              {driver.numero != null && <div className="driver__number">{driver.numero}</div>}
              {carName && (
                <div className="driver__left-item">
                  <strong>{t("car")}: </strong>
                  <span>{carName}</span>
                </div>
              )}
              {car?.motor && (
                <div className="driver__left-item">
                  <strong>{t("engine")}: </strong>
                  <span>{car.motor}</span>
                </div>
              )}
              {car?.potencia != null && (
                <div className="driver__left-item">
                  <strong>{t("power")}: </strong>
                  <span>{car.potencia}CV</span>
                </div>
              )}
              {driver.category && (
                <div className="driver__left-item">
                  <strong>{t("category")}: </strong>
                  <span>{driver.category.toUpperCase()}</span>
                </div>
              )}
            </div>
            <div className="driver__top-right" data-animate="slide-right">
              <div className="driver__top-box-img">
                <UDImage
                  src={driver.fotoPath}
                  alt={t("photoAlt", { name: driver.apelido })}
                  baseVariant="medium"
                  srcsetPreset="responsive"
                  sizes="(max-width: 768px) 100vw, 500px"
                  width={494}
                  height={484}
                  className="driver__img"
                  loading="eager"
                  fetchPriority="high"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="driver__bottom">
        <div className="wrapper">
          <div className="driver__bottom-container">
            <div className="driver__bottom-box" data-animate="slide-bottom">
              <div className="driver__bottom-left">
                {driver.bio && (
                  <div className="driver__bottom-item">
                    <h2 className="driver__bottom-title">{t("bio")}</h2>
                    <p className="driver__bottom-text">{driver.bio.replace(/\s*\r?\n\s*/g, " ")}</p>
                  </div>
                )}

                {champ && <ChampionshipBlock champ={champ} locale={locale} t={t} />}
              </div>

              <div className="driver__bottom-right">
                <div className="driver__bottom-item">
                  <h2 className="driver__bottom-title">{t("personalInfo")}</h2>
                  <p className="driver__bottom-text">
                    <strong>{t("name")}: </strong> {driver.nome}
                  </p>
                  {age != null && (
                    <p className="driver__bottom-text">
                      <strong>{t("age")}: </strong> {age}
                    </p>
                  )}
                  {nat && (
                    <p className="driver__bottom-text">
                      <strong>{t("nationality")}: </strong>{" "}
                      {flag && (
                        // eslint-disable-next-line @next/next/no-img-element -- SVG estático em public/flags
                        <img src={flag} alt="" width={24} height={18} className="mr-1 inline-block align-[-2px]" />
                      )}
                      {countryName(nat, locale)}
                    </p>
                  )}
                  {driver.naturalidade && (
                    <p className="driver__bottom-text">
                      <strong>{t("birthplace")}: </strong> {driver.naturalidade}
                    </p>
                  )}
                  {hometown && (
                    <p className="driver__bottom-text">
                      <strong>{t("hometown")}: </strong> {hometown}
                    </p>
                  )}
                  {driver.sponsors.length > 0 && (
                    <p className="driver__bottom-text">
                      <strong>{t("sponsors")}: </strong>{" "}
                      {driver.sponsors.map((s, i) => (
                        <span key={`${s.id ?? s.nome}-${i}`}>
                          {i > 0 && " / "}
                          {s.site ? (
                            <a
                              href={/^https?:\/\//i.test(s.site) ? s.site : `https://${s.site}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              {s.nome}
                            </a>
                          ) : (
                            s.nome
                          )}
                        </span>
                      ))}
                    </p>
                  )}
                </div>

                {driver.social.length > 0 && (
                  <div className="driver__bottom-item">
                    <h2 className="driver__bottom-title">{t("social")}</h2>
                    {driver.social.map((s) => (
                      <a key={s.kind} href={s.href} target="_blank" rel="noopener noreferrer" className="driver__social">
                        <DriverSocialIcon kind={s.kind} />
                        <span className="driver__social-text">{t(`socialLabel.${s.kind}`)}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {gallery.length > 0 && (
              <div className="col-12" data-animate="slide-bottom">
                <h2 className="driver__bottom-title">{t("gallery")}</h2>
                <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {gallery.map((g) => (
                    <a
                      key={g.path}
                      href={imageHigh(g.path) ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block aspect-[3/2] overflow-hidden"
                    >
                      <UDImage
                        src={g.path}
                        alt={g.alt}
                        baseVariant="medium"
                        srcsetPreset="responsive"
                        sizes="(max-width: 576px) 100vw, (max-width: 992px) 50vw, 400px"
                        className="swiper__img"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <JsonLd data={ld} />
    </section>
  );
}

type T = Awaited<ReturnType<typeof getTranslations<"pilotos.profile">>>;

/** Resultado no campeonato vigente — mesmos números do DriverDetailPage do app. */
function ChampionshipBlock({ champ, locale, t }: { champ: DriverChampionshipStats; locale: string; t: T }) {
  const fmtDate = (iso: string | null) =>
    iso ? new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(iso)) : "";
  const pos = (n: number) => (n > 0 ? `${n}º` : "–");
  const h2h = champ.h2h;
  const best = champ.best;
  const stats: Array<{ label: string; value: string; extra?: string }> = [
    { label: t("ranking"), value: champ.position ? `${champ.position}º` : "–" },
    { label: t("points"), value: String(champ.totalScore) },
    {
      label: t("wins"),
      value: h2h && h2h.total > 0 ? `${h2h.wins}/${h2h.total}` : "–",
      extra: h2h && h2h.total > 0 ? `${Math.round((h2h.wins / h2h.total) * 100)}%` : undefined,
    },
  ];
  return (
    <div className="driver__bottom-item">
      <h2 className="driver__bottom-title">
        {t("championship")}
        {champ.year ? ` ${champ.year}` : ""}
      </h2>
      <div className="mt-[15px] grid grid-cols-3 gap-2 sm:gap-3">
        {stats.map((s) => (
          <div key={s.label} className="min-w-0 rounded-[10px] bg-[#141417] px-2 py-3 text-white sm:px-3">
            <div className="truncate text-[11px] font-bold tracking-wide text-[#9b9b9b] uppercase sm:text-[12px]">{s.label}</div>
            <div className="mt-1 text-[18px] leading-none font-bold text-[#54f251] sm:text-[24px]">
              {s.value}
              {s.extra && <span className="mt-1 block text-[12px] text-white sm:mt-0 sm:ml-2 sm:inline sm:text-[14px]">{s.extra}</span>}
            </div>
          </div>
        ))}
      </div>
      {best && (
        <p className="driver__bottom-text">
          <strong>{t("bestResult")}: </strong>
          {pos(best.battlePosition > 0 ? best.battlePosition : best.qualiPosition)}
          {best.city ? ` · ${best.city}` : ""}
          {best.date ? ` · ${fmtDate(best.date)}` : ""}
        </p>
      )}
      {champ.stages.length > 0 && (
        <div className="mt-[15px] max-w-full overflow-x-auto">
          <table className="w-full text-left text-[14px] sm:text-[16px]">
            <thead>
              <tr className="border-b-2 border-[#141417] text-[13px] uppercase">
                <th className="py-2 pr-2">{t("stage")}</th>
                <th className="py-2 pr-2">{t("city")}</th>
                <th className="py-2 pr-2 text-center">{t("qualy")}</th>
                <th className="py-2 pr-2 text-center">{t("battles")}</th>
                <th className="py-2 text-right">{t("stagePoints")}</th>
              </tr>
            </thead>
            <tbody>
              {champ.stages.map((s, i) => (
                <tr key={`${s.stageId}-${i}`} className="border-b border-[#14141733]">
                  <td className="py-2 pr-2 font-bold">{s.stageNumber ?? i + 1}ª</td>
                  <td className="py-2 pr-2">
                    {s.city ?? "–"}
                    {s.date && <span className="ml-1 hidden text-[13px] text-[#555] sm:inline">{fmtDate(s.date)}</span>}
                  </td>
                  <td className="py-2 pr-2 text-center">{pos(s.qualiPosition)}</td>
                  <td className="py-2 pr-2 text-center">{pos(s.battlePosition)}</td>
                  <td className="py-2 text-right font-bold">{s.finalScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
