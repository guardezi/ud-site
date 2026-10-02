import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LiveSignalIcon, SOCIAL_LINKS } from "@/components/wp-icons";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { MobileNavToggle } from "./MobileNavToggle";
import { MAIN_NAV } from "./main-nav";

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
                  {MAIN_NAV.map((item) => (
                    <li key={item.labelKey} className="nav__item">
                      {item.kind === "internal" ? (
                        <Link href={item.href} className="nav__btn">
                          {t(item.labelKey)}
                        </Link>
                      ) : (
                        <a
                          href={item.href}
                          className={item.highlight ? "nav__btn nav__sponsor" : "nav__btn"}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {t(item.labelKey)}
                        </a>
                      )}
                    </li>
                  ))}
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
