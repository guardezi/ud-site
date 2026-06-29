import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Instagram, Youtube, Facebook, Globe2 } from "lucide-react";
import { getDriverBySlug, listPublicDrivers } from "@/lib/drivers/queries";
import { buildMetadata } from "@/lib/seo/meta";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { personLd } from "@/lib/seo/jsonld";
import { canonical } from "@/lib/seo/canonical";
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
  const t = await getTranslations("pilotos.profile");
  const tPil = await getTranslations("pilotos");
  const driver = await getDriverBySlug(slug);
  if (!driver) notFound();

  const social: Array<{ href: string; label: string; icon: typeof Instagram }> = [];
  if (driver.social.instagram) social.push({ href: driver.social.instagram, label: "Instagram", icon: Instagram });
  if (driver.social.youtube) social.push({ href: driver.social.youtube, label: "YouTube", icon: Youtube });
  if (driver.social.facebook) social.push({ href: driver.social.facebook, label: "Facebook", icon: Facebook });
  if (driver.social.site) social.push({ href: driver.social.site, label: "Site", icon: Globe2 });

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
    <div className="mx-auto max-w-wide px-4 py-12 lg:px-8 lg:py-16">
      <Breadcrumbs
        items={[
          { label: tPil("title"), href: "/pilotos" },
          { label: driver.apelido, href: "/pilotos/[slug]", params: { slug } },
        ]}
        locale={locale}
      />

      <header className="grid gap-8 lg:grid-cols-[1fr,300px]">
        <div>
          {driver.numero != null && (
            <p className="data text-6xl text-drift lg:text-7xl">#{driver.numero}</p>
          )}
          <h1 className="display mt-2 text-5xl text-signal lg:text-6xl">{driver.apelido}</h1>
          {driver.nome !== driver.apelido && <p className="mt-1 text-mute">{driver.nome}</p>}
          <p className="mt-3 text-sm uppercase tracking-[0.18em] text-mute">
            {driver.category}
            {driver.city && (
              <span>
                {driver.category ? " · " : ""}
                {driver.city}
                {driver.state ? `/${driver.state}` : ""}
              </span>
            )}
          </p>
          {social.length > 0 && (
            <div className="mt-6 flex gap-3">
              {social.map(({ href, label, icon: Icon }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="inline-flex size-10 items-center justify-center rounded border border-rail text-mute hover:text-drift hover:border-drift"
                >
                  <Icon className="size-4" aria-hidden />
                </a>
              ))}
            </div>
          )}
        </div>

        {driver.fotoUrl && (
          <div className="relative aspect-square overflow-hidden rounded border border-rail">
            <Image src={driver.fotoUrl} alt={driver.apelido} fill priority sizes="300px" className="object-cover" unoptimized />
          </div>
        )}
      </header>

      {driver.bio && (
        <section className="mt-12">
          <h2 className="eyebrow mb-3">{t("bio")}</h2>
          <p className="max-w-3xl whitespace-pre-line text-signal/90">{driver.bio}</p>
        </section>
      )}

      {driver.cars.length > 0 && (
        <section className="mt-12">
          <h2 className="eyebrow mb-4">{t("cars")}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {driver.cars.map((car, index) => (
              <article key={index} className="rounded border border-rail bg-panel/30 p-4">
                {car.fotoUrl && (
                  <div className="relative mb-3 aspect-[16/9] overflow-hidden rounded">
                    <Image src={car.fotoUrl} alt={car.modelo ?? "Carro"} fill sizes="600px" className="object-cover" unoptimized />
                  </div>
                )}
                <h3 className="display text-xl text-signal">
                  {[car.marca, car.modelo].filter(Boolean).join(" ") || "—"}
                </h3>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs uppercase tracking-wider text-mute">
                  {car.ano && (
                    <div>
                      <dt>Ano</dt>
                      <dd className="data text-signal">{car.ano}</dd>
                    </div>
                  )}
                  {car.potencia && (
                    <div>
                      <dt>Potência</dt>
                      <dd className="data text-signal">{car.potencia} HP</dd>
                    </div>
                  )}
                  {car.motor && (
                    <div className="col-span-2">
                      <dt>Motor</dt>
                      <dd className="text-signal">{car.motor}</dd>
                    </div>
                  )}
                  {car.preparador && (
                    <div className="col-span-2">
                      <dt>Preparador</dt>
                      <dd className="text-signal">{car.preparador}</dd>
                    </div>
                  )}
                </dl>
              </article>
            ))}
          </div>
        </section>
      )}

      {driver.sponsors.length > 0 && (
        <section className="mt-12">
          <h2 className="eyebrow mb-4">{t("sponsors")}</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {driver.sponsors.map((s, i) => (
              <div key={i} className="rounded border border-rail bg-panel/30 p-3 text-center">
                {s.fotoUrl && (
                  <div className="relative mx-auto mb-2 aspect-video">
                    <Image src={s.fotoUrl} alt={s.nome} fill sizes="200px" className="object-contain" unoptimized />
                  </div>
                )}
                <p className="text-sm text-signal">{s.nome}</p>
                {s.tipo && <p className="text-xs uppercase tracking-wider text-mute">{s.tipo}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      <JsonLd data={ld} />
    </div>
  );
}
