import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LiveSignalIcon, SOCIAL_LINKS } from "@/components/wp-icons";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { MobileNavToggle } from "./MobileNavToggle";

const NAV: Array<{
  href: "/" | "/pilotos" | "/etapas" | "/classificacao" | "/categorias" | "/noticias" | "/patrocinadores" | "/contato";
  labelKey: string;
}> = [
  { href: "/", labelKey: "home" },
  { href: "/pilotos", labelKey: "pilotos" },
  { href: "/classificacao", labelKey: "classificacao" },
  { href: "/etapas", labelKey: "etapas" },
  { href: "/categorias", labelKey: "categorias" },
  { href: "/noticias", labelKey: "noticias" },
  { href: "/patrocinadores", labelKey: "patrocinadores" },
  { href: "/contato", labelKey: "contato" },
];

const TICKETS_URL = "https://www.tycket.com.br/ultimate-drift-ribeir-o-preto-14-a-16-agosto.html";
const WILDCARD_URL = "https://forms.gle/64JUaXQJJCBfiVV99";
const LIVE_URL = "http://portal.drift.siliconvillage.cafe";

export function PublicHeader() {
  const t = useTranslations("nav");

  return (
    <header className="header">
      <div className="header__top">
        <div className="wrapper">
          <div className="header__top-box">
            <div className="header__top-left">
              <a href={LIVE_URL} className="header__top-live" target="_blank" rel="noopener noreferrer">
                <LiveSignalIcon />
                <span className="ui__display--md-none">Acompanhe em tempo real</span>
                <span className="ui__display--none ui__display--md-block">Ao vivo</span>
              </a>
            </div>
            <div className="header__top-right" style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <LocaleSwitcher />
              <div className="header__social ui__display--lg-none">
                <span className="header__top-right-label">Nos siga</span>
                <div className="header__social-items">
                  {SOCIAL_LINKS.map(({ href, label, className, Icon }) => (
                    <a
                      key={href}
                      href={href}
                      title={`Visitar ${label}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`header__social ${className}`}
                    >
                      <Icon />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="header__bottom">
        <div className="wrapper">
          <div className="row justify-content-between align-items-center">
            <div className="col-10 col-lg-4">
              <Link href="/" className="header__logo-box">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/theme/img/logo.png" alt="Logo Ultimate Drift" className="header__logo" />
              </Link>
            </div>
            <div className="col-2 col-lg-8">
              <nav className="nav__menu">
                <ul className="nav__list">
                  {NAV.map((item) => (
                    <li key={item.href} className="nav__item">
                      <Link href={item.href} className="nav__btn">
                        {t(item.labelKey)}
                      </Link>
                    </li>
                  ))}
                  <li className="nav__item">
                    <a href={TICKETS_URL} className="nav__btn nav__sponsor" target="_blank" rel="noopener noreferrer">
                      {t("ingressos")}
                    </a>
                  </li>
                  <li className="nav__item">
                    <a href={WILDCARD_URL} className="nav__btn" target="_blank" rel="noopener noreferrer">
                      {t("inscricaoCuringa")}
                    </a>
                  </li>
                </ul>
                <div className="header__social ui__display--none ui__display--lg-flex">
                  <span className="header__top-right-label">Nos siga</span>
                  <div className="header__social-items">
                    {SOCIAL_LINKS.map(({ href, label, className, Icon }) => (
                      <a
                        key={href}
                        href={href}
                        title={`Visitar ${label}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`header__social ${className}`}
                      >
                        <Icon />
                      </a>
                    ))}
                  </div>
                </div>
              </nav>
              <MobileNavToggle />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
