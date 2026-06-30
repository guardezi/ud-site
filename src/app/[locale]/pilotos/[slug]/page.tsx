import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getDriverBySlug, listPublicDrivers } from "@/lib/drivers/queries";
import { JsonLd } from "@/components/seo/JsonLd";
import { personLd } from "@/lib/seo/jsonld";
import { canonical } from "@/lib/seo/canonical";
import { buildMetadata } from "@/lib/seo/meta";
import { InstagramIcon, YouTubeIcon, FacebookIcon, TikTokIcon } from "@/components/wp-icons";
import type { Locale } from "@/i18n/config";

export const revalidate = 86400;

export async function generateStaticParams() {
  const drivers = await listPublicDrivers().catch(() => []);
  return drivers.map((d) => ({ slug: d.slug }));
}

type PageParams = Promise<{ locale: Locale; slug: string }>;

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { locale, slug } = await params;
  const driver = await getDriverBySlug(slug).catch(() => null);
  if (!driver) return {};
  const description = (driver.bio?.slice(0, 155) ?? "").trim() || `${driver.apelido} é piloto do Ultimate Drift.`;
  return buildMetadata({
    href: "/pilotos/[slug]",
    locale,
    params: { slug },
    title: `${driver.apelido}${driver.numero ? ` #${driver.numero}` : ""}`,
    description,
    image: driver.heroFotoUrl ?? driver.fotoUrl ?? undefined,
  });
}

export default async function DriverPage({ params }: { params: PageParams }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const driver = await getDriverBySlug(slug);
  if (!driver) notFound();
  const tPil = await getTranslations("pilotos.profile");

  // Carro principal (com `principal: true` ou o primeiro)
  const mainCar = driver.cars.find((c) => c.principal) ?? driver.cars[0] ?? null;

  const social: Array<{ href: string; label: string; Icon: typeof InstagramIcon }> = [];
  if (driver.social.instagram) social.push({ href: driver.social.instagram, label: "Instagram", Icon: InstagramIcon });
  if (driver.social.youtube) social.push({ href: driver.social.youtube, label: "YouTube", Icon: YouTubeIcon });
  if (driver.social.facebook) social.push({ href: driver.social.facebook, label: "Facebook", Icon: FacebookIcon });
  if (driver.social.twitter) social.push({ href: driver.social.twitter, label: "Twitter", Icon: TikTokIcon });

  const ld = personLd({
    name: driver.nome,
    alternateName: driver.apelido,
    url: canonical("/pilotos/[slug]", locale, { slug }),
    image: driver.heroFotoUrl ?? driver.fotoUrl ?? null,
    description: driver.bio,
    nationality: driver.country ?? "Brasil",
    sameAs: [driver.social.instagram, driver.social.youtube, driver.social.facebook, driver.social.site].filter(
      (s): s is string => !!s,
    ),
  });

  return (
    <section className="driver">
      <div className="wrapper">
        <Link href="/pilotos" className="ui__title" data-animate="slide-bottom">
          <svg className="ui__icon" width="15" height="27" viewBox="0 0 15 27" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M13.5208 26.7703C13.8818 27.1025 14.4396 27.0692 14.7678 26.7039C15.096 26.3386 15.0632 25.774 14.7022 25.4419L2.00202 13.8182C1.67385 13.5193 1.67385 13.0875 2.00202 12.7886L14.7022 1.5634C15.0632 1.23129 15.096 0.666705 14.8006 0.301387C14.4725 -0.0639308 13.9146 -0.0971413 13.5536 0.201755L0.853422 11.4602C-0.262355 12.4565 -0.295172 14.1171 0.820606 15.1466L13.5208 26.7703Z"
              fill="#54F251"
            />
          </svg>
          <h1>{driver.apelido}</h1>
        </Link>
      </div>

      <div className="driver__top">
        <div className="wrapper">
          <div className="driver__top-container">
            <div className="driver__top-left" data-animate="slide-left">
              {driver.numero != null && <div className="driver__number">{driver.numero}</div>}
              {mainCar && (
                <>
                  {(mainCar.marca || mainCar.modelo) && (
                    <div className="driver__left-item">
                      <strong>Carro: </strong>
                      <span>{[mainCar.marca, mainCar.modelo].filter(Boolean).join(" ").toUpperCase()}</span>
                    </div>
                  )}
                  {mainCar.motor && (
                    <div className="driver__left-item">
                      <strong>Motor: </strong>
                      <span>{mainCar.motor}</span>
                    </div>
                  )}
                  {mainCar.potencia != null && (
                    <div className="driver__left-item">
                      <strong>Potência: </strong>
                      <span>{mainCar.potencia}CV</span>
                    </div>
                  )}
                  {mainCar.preparador && (
                    <div className="driver__left-item">
                      <strong>Preparador: </strong>
                      <span>{mainCar.preparador}</span>
                    </div>
                  )}
                </>
              )}
              {driver.category && (
                <div className="driver__left-item">
                  <strong>Categoria: </strong>
                  <span>{driver.category}</span>
                </div>
              )}
            </div>
            <div className="driver__top-right" data-animate="slide-right">
              <div className="driver__top-box-img">
                {driver.fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    width={494}
                    height={484}
                    src={driver.heroFotoUrl ?? driver.fotoUrl}
                    alt={`Imagem de ${driver.apelido}`}
                    className="driver__img"
                  />
                ) : null}
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
                    <h2 className="driver__bottom-title">{tPil("bio")}</h2>
                    <p className="driver__bottom-text" style={{ whiteSpace: "pre-line" }}>
                      {driver.bio}
                    </p>
                  </div>
                )}

                {driver.cars.length > 0 && (
                  <div className="driver__bottom-item">
                    <h2 className="driver__bottom-title">{tPil("cars")}</h2>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
                      {driver.cars.map((car, i) => (
                        <article key={i} style={{ background: "#1f1f24", borderRadius: "16px 6px 16px 6px", overflow: "hidden" }}>
                          {car.fotoUrl && (
                            <div style={{ position: "relative", aspectRatio: "16/9", background: "#0a0a0b" }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={car.fotoUrl} alt={car.modelo ?? "Carro"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            </div>
                          )}
                          <div style={{ padding: 12 }}>
                            <p style={{ fontWeight: 700, color: "#fff", margin: 0 }}>
                              {[car.marca, car.modelo].filter(Boolean).join(" ") || "—"}
                            </p>
                            <div style={{ marginTop: 6, fontSize: 12, color: "#c5c5c5", display: "grid", gap: 2 }}>
                              {car.ano != null && <span>{car.ano}</span>}
                              {car.potencia != null && <span>{car.potencia} HP</span>}
                              {car.motor && <span>{car.motor}</span>}
                              {car.preparador && <span>Prep: {car.preparador}</span>}
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="driver__bottom-right">
                <div className="driver__bottom-item">
                  <h2 className="driver__bottom-title">INFORMAÇÕES PESSOAIS</h2>
                  <p className="driver__bottom-text">
                    <strong>Nome: </strong> {driver.nome}
                  </p>
                  {driver.apelido !== driver.nome && (
                    <p className="driver__bottom-text">
                      <strong>Apelido: </strong> {driver.apelido}
                    </p>
                  )}
                  {driver.naturalidade && (
                    <p className="driver__bottom-text">
                      <strong>Naturalidade: </strong> {driver.naturalidade}
                    </p>
                  )}
                  {(driver.city || driver.state) && (
                    <p className="driver__bottom-text">
                      <strong>Localidade: </strong>
                      {[driver.city, driver.state].filter(Boolean).join(" / ")}
                    </p>
                  )}
                  {driver.country && (
                    <p className="driver__bottom-text">
                      <strong>País: </strong> {driver.country}
                    </p>
                  )}
                </div>

                {driver.sponsors.length > 0 && (
                  <div className="driver__bottom-item">
                    <h2 className="driver__bottom-title">{tPil("sponsors").toUpperCase()}</h2>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 12 }}>
                      {driver.sponsors.map((s, i) => (
                        <a
                          key={i}
                          href={s.site ?? "#"}
                          target={s.site ? "_blank" : undefined}
                          rel={s.site ? "noopener noreferrer" : undefined}
                          style={{ background: "#1f1f24", borderRadius: 8, padding: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, color: "#fff" }}
                        >
                          {s.fotoUrl && (
                            <div style={{ position: "relative", width: "100%", aspectRatio: "16/9" }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={s.fotoUrl} alt={s.nome} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                            </div>
                          )}
                          <span style={{ fontSize: 12, textAlign: "center" }}>{s.nome}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {social.length > 0 && (
                  <div className="driver__bottom-item">
                    <h2 className="driver__bottom-title">SOCIAL</h2>
                    {social.map(({ href, label, Icon }) => (
                      <a
                        key={href}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="driver__social"
                        style={{ display: "inline-flex", alignItems: "center", gap: 10, marginRight: 12 }}
                      >
                        <Icon />
                        <span className="driver__social-text">{label}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <JsonLd data={ld} />
    </section>
  );
}
