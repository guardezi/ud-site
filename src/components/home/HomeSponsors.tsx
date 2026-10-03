import { useTranslations } from "next-intl";
import { UDImage } from "@/components/ui/UDImage";
import type { EventSponsor } from "@/lib/sponsors/queries";

/**
 * "Patrocinadores" + "Apoiadores": grades de logos em fundo claro.
 * Classes `index__sponsors*` do tema legado.
 *
 * Patrocinadores = `listEventSponsors` (`patrocinadores` com patrocinaEvento,
 * tipo "patrocinador" quando houver); Apoiadores = `listEventSupporters`
 * (`tipoPatrocinioEvento == "apoiador"`). Bloco sem itens não aparece.
 */
export type SponsorLogo = {
  name: string;
  /** Site (nova aba); sem site, o logo não é link. */
  url: string | null;
  /**
   * Logo: path do Storage (variante WebP via UDImage) ou caminho local de
   * `public/` (começa com "/"). Sem logo, mostra o nome.
   */
  logoSrc: string | null;
};

/** Patrocinador do evento (Firestore) → item da grade. */
export function eventSponsorToLogo(s: EventSponsor): SponsorLogo {
  return { name: s.name, url: s.website, logoSrc: s.logoPath };
}

function Logo({ item }: { item: SponsorLogo }) {
  if (!item.logoSrc) {
    return <span className="block text-center text-lg font-bold text-[#343443]">{item.name}</span>;
  }
  if (item.logoSrc.startsWith("/")) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img width={200} height={200} src={item.logoSrc} alt={item.name} className="index__sponsors-img" loading="lazy" />;
  }
  return (
    <UDImage
      src={item.logoSrc}
      alt={item.name}
      baseVariant="small"
      srcsetPreset="compact"
      sizes="160px"
      width={200}
      height={200}
      className="index__sponsors-img"
    />
  );
}

export type HomeSponsorsData = {
  sponsors: SponsorLogo[];
  supporters: SponsorLogo[];
};

function LogoGrid({ items, label }: { items: SponsorLogo[]; label: (name: string) => string }) {
  return (
    <div className="index__sponsors-container">
      {items.map((s) => (
        <div key={s.name} className="index__sponsors-item">
          {s.url ? (
            <a href={s.url} title={label(s.name)} className="index__sponsors-link" target="_blank" rel="noopener noreferrer">
              <Logo item={s} />
            </a>
          ) : (
            <div className="index__sponsors-link">
              <Logo item={s} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function HomeSponsors({ data }: { data: HomeSponsorsData }) {
  const t = useTranslations("homeSections");
  const label = (name: string) => t("visit", { name });
  if (data.sponsors.length === 0 && data.supporters.length === 0) return null;

  return (
    <section className="index__sponsors" id="patrocinadores">
      <div className="wrapper">
        {data.sponsors.length > 0 && (
          <>
            <h2 className="ui__title black">{t("sponsors")}</h2>
            <LogoGrid items={data.sponsors} label={label} />
          </>
        )}
        {data.supporters.length > 0 && (
          <>
            <h2 className="ui__title black">{t("supporters")}</h2>
            <LogoGrid items={data.supporters} label={label} />
          </>
        )}
      </div>
    </section>
  );
}
