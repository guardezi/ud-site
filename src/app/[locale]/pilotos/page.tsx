import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { listPublicDrivers } from "@/lib/drivers/queries";
import { JsonLd } from "@/components/seo/JsonLd";
import { itemListLd } from "@/lib/seo/jsonld";
import { canonical } from "@/lib/seo/canonical";
import { buildMetadata } from "@/lib/seo/meta";
import type { Locale } from "@/i18n/config";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pilotos" });
  return buildMetadata({
    href: "/pilotos",
    locale,
    title: t("title"),
    description: t("subtitle"),
  });
}

const CATEGORY_LABEL = (s: string | null) => (s ?? "").toUpperCase();

export default async function PilotosPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pilotos");
  const drivers = await listPublicDrivers();

  const ld = itemListLd({
    name: t("title"),
    url: canonical("/pilotos", locale),
    items: drivers.map((d) => ({
      name: d.apelido,
      url: canonical("/pilotos/[slug]", locale, { slug: d.slug }),
      image: d.fotoUrl,
    })),
  });

  return (
    <section className="drivers">
      <div className="wrapper">
        <div className="ui__title" data-animate="slide-bottom">
          <h1 className="">{t("title")}</h1>
        </div>

        <div className="drivers__container row">
          {drivers.length === 0 ? (
            <p style={{ padding: "60px 0", textAlign: "center", color: "#9b9b9b" }}>{t("noResults")}</p>
          ) : (
            drivers.map((d) => {
              const cat = CATEGORY_LABEL(d.category);
              return (
                <div
                  key={d.id}
                  className="driver-col col-xl-3 col-lg-4 col-sm-6"
                  data-apelido={d.apelido}
                  data-numero={d.numero ?? ""}
                  data-animate="slide-left"
                >
                  <Link
                    href={{ pathname: "/pilotos/[slug]", params: { slug: d.slug } }}
                    className="drivers__rank-driver"
                    title={`Ver perfil de ${d.apelido}`}
                  >
                    <div className="drivers__driver">
                      <div className="drivers__driver-box">
                        {cat && (
                          <div className="drivers__driver-category" data-category={cat}>
                            {cat}
                          </div>
                        )}
                        <div className="drivers__rank-img-box">
                          {d.fotoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              width={220}
                              height={220}
                              src={d.fotoUrl}
                              alt={`Imagem representativa de ${d.apelido}`}
                              className="drivers__rank-driver-img"
                              loading="lazy"
                            />
                          ) : null}
                        </div>
                        <div className="drivers__rank-bottom">
                          <div className="drivers__rank-number-box">
                            <span className="drivers__rank-number">{d.numero ?? "—"}</span>
                          </div>
                          <div className="drivers__driver-name">{d.apelido}</div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })
          )}
        </div>
      </div>
      <JsonLd data={ld} />
    </section>
  );
}
