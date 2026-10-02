import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { UDImage } from "@/components/ui/UDImage";
import { InstagramIcon, YouTubeIcon } from "@/components/wp-icons";
import { BackArrow } from "@/components/sponsors/SponsorsUi";
import { getSponsorBySlug, getSponsoredPilots, listSponsorProfiles } from "@/lib/sponsors/detail";
import { imageMedium } from "@/lib/firebase/image-variants";
import { buildMetadata } from "@/lib/seo/meta";
import type { Locale } from "@/i18n/config";

/**
 * Perfil do patrocinador — equivalente às subpáginas /patrocinadores/{slug}
 * do WordPress legado, com o conteúdo da SponsorDetailPage do ud-app (capa,
 * logo, segmento, site, Instagram/YouTube, selo de patrocinador do evento,
 * história e pilotos patrocinados). Fonte: `patrocinadores/{id}` — ver
 * src/lib/sponsors/detail.ts.
 */
export const revalidate = 3600;

export async function generateStaticParams() {
  const sponsors = await listSponsorProfiles();
  return sponsors.map((s) => ({ slug: s.slug }));
}

type PageParams = Promise<{ locale: Locale; slug: string }>;

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { locale, slug } = await params;
  const sponsor = await getSponsorBySlug(slug);
  if (!sponsor) return {};
  const t = await getTranslations({ locale, namespace: "patrocinadores.detail" });
  return buildMetadata({
    href: "/patrocinadores/[slug]",
    locale,
    params: { slug: sponsor.slug },
    title: sponsor.name,
    description: (sponsor.history?.slice(0, 155) ?? "").trim() || t("metaDescription", { name: sponsor.name }),
    image: imageMedium(sponsor.coverPath ?? sponsor.logoPath),
  });
}

export default async function SponsorPage({ params }: { params: PageParams }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const sponsor = await getSponsorBySlug(slug);
  if (!sponsor) notFound();
  const [t, tRoot, pilots] = await Promise.all([
    getTranslations("patrocinadores.detail"),
    getTranslations("patrocinadores"),
    getSponsoredPilots(sponsor.id),
  ]);

  return (
    <section className="sponsors">
      <div className="wrapper">
        <Link href="/patrocinadores" className="ui__title" aria-label={tRoot("back")}>
          <BackArrow />
          <h1>{sponsor.name}</h1>
        </Link>

        <div className="single-post-container">
          {/* Capa (paisagem) com o logo sobreposto, como no app; sem capa, só o logo. */}
          <div className="relative mb-16">
            {sponsor.coverPath ? (
              <div className="overflow-hidden rounded-xl" style={{ aspectRatio: "16 / 6" }}>
                <UDImage
                  src={sponsor.coverPath}
                  alt={t("coverAlt", { name: sponsor.name })}
                  baseVariant="high"
                  sizes="(max-width: 1200px) 100vw, 1200px"
                  loading="eager"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            ) : null}
            <div
              className={`mx-auto flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-white shadow-md ${
                sponsor.coverPath ? "absolute -bottom-14 left-1/2 -translate-x-1/2" : ""
              }`}
            >
              <UDImage
                src={sponsor.logoPath}
                alt={t("logoAlt", { name: sponsor.name })}
                baseVariant="small"
                srcsetPreset="compact"
                sizes="144px"
                width={144}
                height={144}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 text-center">
            {sponsor.segment && <p className="text-sm uppercase tracking-wide text-gray-500">{sponsor.segment}</p>}
            {(sponsor.website || sponsor.instagram || sponsor.youtube) && (
              <div className="flex flex-wrap items-center justify-center gap-3">
                {sponsor.website && (
                  <a
                    href={sponsor.website}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className="rounded-md bg-[#54F251] px-5 py-2 font-bold text-black"
                  >
                    {t("visitSite")}
                  </a>
                )}
                {sponsor.instagram && (
                  <a href={sponsor.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="rounded-full bg-[#141417] p-2">
                    <InstagramIcon />
                  </a>
                )}
                {sponsor.youtube && (
                  <a href={sponsor.youtube} target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="rounded-full bg-[#141417] p-2">
                    <YouTubeIcon />
                  </a>
                )}
              </div>
            )}
            {sponsor.isEventSponsor && (
              <div className="flex items-center gap-3 rounded-xl border border-[#54F251] bg-[#141417] px-4 py-3 text-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/theme/img/logo-light2.png" alt="" height={32} style={{ height: 32, width: "auto" }} />
                <span className="font-bold">{t("officialEventSponsor")}</span>
              </div>
            )}
          </div>

          {sponsor.history && (
            <div className="post-body mt-8">
              <h2>{t("history")}</h2>
              <p style={{ whiteSpace: "pre-line" }}>{sponsor.history}</p>
            </div>
          )}
        </div>

        {pilots.length > 0 && (
          <div className="mt-10">
            <div className="ui__title">
              <h2>{t("sponsoredPilots")}</h2>
            </div>
            <div className="drivers__container row">
              {pilots.map((p) => (
                <div key={p.driverId} className="driver-col col-xl-3 col-lg-4 col-sm-6">
                  <Link
                    href={{ pathname: "/pilotos/[slug]", params: { slug: p.slug } }}
                    className="drivers__rank-driver"
                    title={t("seeFullProfile")}
                  >
                    <div className="drivers__driver">
                      <div className="drivers__driver-box">
                        {p.isMain && (
                          <div className="drivers__driver-category" data-category="PRO">
                            {t("mainSponsor")}
                          </div>
                        )}
                        <div className="drivers__rank-img-box">
                          <UDImage
                            src={p.photoPath}
                            alt={p.name}
                            baseVariant="small"
                            srcsetPreset="compact"
                            sizes="(max-width: 576px) 50vw, (max-width: 992px) 33vw, 220px"
                            width={220}
                            height={220}
                            className="drivers__rank-driver-img"
                          />
                        </div>
                        <div className="drivers__rank-bottom">
                          <div className="drivers__rank-number-box">
                            <span className="drivers__rank-number">{p.number ?? "—"}</span>
                          </div>
                          <div className="drivers__driver-name">{p.name}</div>
                        </div>
                      </div>
                    </div>
                  </Link>
                  <p className="mt-2 text-sm text-gray-300">{p.history ?? t("noPilotHistory")}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
