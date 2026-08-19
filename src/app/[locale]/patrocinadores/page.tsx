import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { WPPageSnapshot } from "@/components/home/WPPageSnapshot";
import { UDImage } from "@/components/ui/UDImage";
import { listSponsors, type PublicSponsor } from "@/lib/sponsors/queries";
import { buildMetadata } from "@/lib/seo/meta";
import type { Locale } from "@/i18n/config";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "patrocinadores" });
  return buildMetadata({
    href: "/patrocinadores",
    locale,
    title: t("title"),
    description: t("subtitle"),
  });
}

/** Agrupa por tier preservando a ordem global (já vem ordenado por `order` asc). */
function groupByTier(sponsors: PublicSponsor[]): { tier: string; items: PublicSponsor[] }[] {
  const groups: { tier: string; items: PublicSponsor[] }[] = [];
  const byTier = new Map<string, PublicSponsor[]>();
  for (const s of sponsors) {
    const tier = s.tier ?? "";
    let bucket = byTier.get(tier);
    if (!bucket) {
      bucket = [];
      byTier.set(tier, bucket);
      groups.push({ tier, items: bucket });
    }
    bucket.push(s);
  }
  return groups;
}

export default async function PatrocinadoresPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("patrocinadores");
  const sponsors = await listSponsors();

  // Coleção vazia hoje: cai no snapshot legado do WordPress pra não servir página em branco.
  if (sponsors.length === 0) {
    return <WPPageSnapshot slug="patrocinadores" />;
  }

  const groups = groupByTier(sponsors);

  return (
    <section className="sponsors">
      <div className="wrapper">
        <div className="ui__title" data-animate="slide-bottom">
          <h1>{t("title")}</h1>
          <p>{t("subtitle")}</p>
        </div>

        {groups.map((group) => (
          <div key={group.tier || "default"} className="sponsors__tier" data-tier={group.tier || undefined}>
            <h2 className="sponsors__tier-title">{group.tier || t("tierTitle")}</h2>
            <div
              className="sponsors__grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: "24px",
                alignItems: "center",
              }}
            >
              {group.items.map((s) => {
                const logo = (
                  <UDImage
                    src={s.logoPath}
                    alt={s.name}
                    baseVariant="medium"
                    srcsetPreset="responsive"
                    sizes="(max-width: 576px) 45vw, (max-width: 992px) 30vw, 200px"
                    width={200}
                    height={120}
                    className="sponsors__logo"
                    style={{ width: "100%", height: "auto", objectFit: "contain" }}
                  />
                );
                return (
                  <div key={s.id} className="sponsors__item" title={s.name}>
                    {s.website ? (
                      <a href={s.website} target="_blank" rel="noopener noreferrer sponsored" aria-label={s.name}>
                        {logo}
                      </a>
                    ) : (
                      logo
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
