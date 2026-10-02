import { useTranslations } from "next-intl";

/**
 * "Patrocinadores" + "Apoiadores": grades de logos em fundo claro.
 * Classes `index__sponsors*` do tema legado.
 */
export type SponsorLogo = {
  name: string;
  url: string;
  logoSrc: string;
};

export type HomeSponsorsData = {
  sponsors: SponsorLogo[];
  supporters: SponsorLogo[];
};

function LogoGrid({ items, label }: { items: SponsorLogo[]; label: (name: string) => string }) {
  return (
    <div className="index__sponsors-container">
      {items.map((s) => (
        <div key={s.name} className="index__sponsors-item">
          <a href={s.url} title={label(s.name)} className="index__sponsors-link" target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img width={200} height={200} src={s.logoSrc} alt={s.name} className="index__sponsors-img" loading="lazy" />
          </a>
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
