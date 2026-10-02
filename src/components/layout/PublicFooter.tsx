import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SOCIAL_LINKS } from "@/components/wp-icons";
import { TICKETS_URL, type MainNavItem } from "./main-nav";

// Mesma ordem relativa do menu principal (main-nav.ts). Inscrição Curinga não
// fazia parte do footer e continua de fora; /termos é extra do
// footer e fica no fim da coluna, com o rótulo "Termos e Condições"
// (footer.termos), como no site legado.
const FOOTER_LEFT: MainNavItem[] = [
  { kind: "internal", href: "/", labelKey: "home" },
  { kind: "external", href: TICKETS_URL, labelKey: "ingressos" },
  { kind: "internal", href: "/pilotos", labelKey: "pilotos" },
  { kind: "internal", href: "/classificacao", labelKey: "classificacao" },
  { kind: "internal", href: "/etapas", labelKey: "etapas" },
  { kind: "internal", href: "/termos", labelKey: "termos" },
];

const FOOTER_RIGHT: Array<{
  href: "/categorias" | "/noticias" | "/patrocinadores" | "/contato";
  labelKey: string;
}> = [
  { href: "/categorias", labelKey: "categorias" },
  { href: "/noticias", labelKey: "noticias" },
  { href: "/patrocinadores", labelKey: "patrocinadores" },
  { href: "/contato", labelKey: "contato" },
];

const REGULAMENTO_URL = "https://www.cba.org.br/campeonato/downloads/250/459";
const PLAY_STORE = "https://play.google.com/store/apps/details?id=br.com.ultimatedrift.app";
const APP_STORE = "https://apps.apple.com/us/app/ultimate-drift-app/id6737285909";

export function PublicFooter() {
  const tNav = useTranslations("nav");
  const tFooter = useTranslations("footer");
  // `termos` mora no namespace footer; o resto vem de nav.
  const leftLabel = (key: string) => (key === "termos" ? tFooter("termos") : tNav(key));

  return (
    <footer className="footer">
      <div className="wrapper">
        <div className="footer__top">
          <div className="row justify-content-center align-items-center">
            <div className="col-xl-4">
              <Link href="/" className="footer__logo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  width="280"
                  height="112"
                  src="/theme/img/logo-footer.png"
                  alt="Logo Ultimate Drift"
                  className="footer__logo-img"
                  loading="lazy"
                />
              </Link>
            </div>

            <div className="col-md-2">
              <ul className="footer__nav-list">
                {FOOTER_LEFT.map((item) => (
                  <li key={item.labelKey} className="nav__item">
                    {item.kind === "internal" ? (
                      <Link href={item.href} className="nav__btn">
                        {leftLabel(item.labelKey)}
                      </Link>
                    ) : (
                      <a href={item.href} className="nav__btn" target="_blank" rel="noopener noreferrer">
                        {leftLabel(item.labelKey)}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="col-md-2">
              <ul className="footer__nav-list">
                {FOOTER_RIGHT.map((item) => (
                  <li key={item.href} className="nav__item">
                    <Link href={item.href} className="nav__btn">
                      {tNav(item.labelKey)}
                    </Link>
                  </li>
                ))}
                <li className="nav__item">
                  <a href={REGULAMENTO_URL} target="_blank" rel="noopener noreferrer" className="nav__btn">
                    {tFooter("regulamento")}
                  </a>
                </li>
              </ul>
            </div>

            <div className="col-xl-3">
              <span className="footer__top-right-label">{tFooter("followUs")}</span>
              <div className="footer__social-box">
                {SOCIAL_LINKS.map(({ href, label, className, Icon }) => (
                  <a
                    key={href}
                    href={href}
                    title={`Visitar ${label}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`footer__social ${className.replace("header__", "footer__")}`}
                  >
                    <Icon />
                  </a>
                ))}
              </div>
              <div className="index__app-links">
                <a href={PLAY_STORE} className="index__app-link" target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/theme/img/play-store.png" alt="Google Play" className="index__app-logo" />
                </a>
                <a href={APP_STORE} className="index__app-link" target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/theme/img/app-store.png" alt="App Store" className="index__app-logo" />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="footer__bottom">
          <p>
            Ultimate Drift &copy; - {new Date().getFullYear()} Campeonato Brasileiro de Drift. {tFooter("rights")} Desenvolvido por{" "}
            <a
              href="https://api.whatsapp.com/send/?phone=5514998979211&text&type=phone_number&app_absent=0"
              className="footer__dev"
              target="_blank"
              rel="noopener noreferrer"
            >
              Long-On
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
