import { useTranslations } from "next-intl";

/**
 * "ULTIMATE DRIFT APP!": checklist, badges das lojas e mockup do celular.
 * Classes `index__app`, `features`, `mockup`, `index__app-*` do tema legado.
 * Textos fixos em i18n (`homeSections.app*`); links/imagens por props.
 */
export type AppPromoData = {
  playStoreUrl: string;
  appStoreUrl: string;
  playStoreBadgeSrc: string;
  appStoreBadgeSrc: string;
  mockupSrc: string;
};

export function AppPromo({ data }: { data: AppPromoData }) {
  const t = useTranslations("homeSections");
  const features = t.raw("appFeatures") as string[];

  return (
    <section className="index__app">
      <div className="wrapper">
        <div className="row justify-content-center align-items-center">
          <div className="col-md-5">
            <div className="features">
              <h2 style={{ fontSize: "2.5rem", fontWeight: 700, color: "#d0ffb0", marginBottom: 10 }}>{t("appTitle")}</h2>
              <p className="subtitle">{t("appSubtitle")}</p>
              <ul>
                {features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <div className="index__app-links">
                <a href={data.playStoreUrl} className="index__app-link" target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={data.playStoreBadgeSrc} alt="Google Play" className="index__app-logo" />
                </a>
                <a href={data.appStoreUrl} className="index__app-link" target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={data.appStoreBadgeSrc} alt="App Store" className="index__app-logo" />
                </a>
              </div>
            </div>
          </div>
          <div className="col-md-5">
            <div className="mockup">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.mockupSrc} alt={t("appMockupAlt")} loading="lazy" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
