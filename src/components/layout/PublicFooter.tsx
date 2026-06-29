import { useTranslations } from "next-intl";
import { Instagram, Youtube, Facebook } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { EXTERNAL_LINKS } from "@/lib/routes";

const SOCIAL = [
  { href: "https://www.instagram.com/ultimatedriftbr", label: "Instagram", icon: Instagram },
  { href: "https://www.youtube.com/@ultimatedrift", label: "YouTube", icon: Youtube },
  { href: "https://www.facebook.com/ultimatedriftbr", label: "Facebook", icon: Facebook },
] as const;

export function PublicFooter() {
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");
  const tBrand = useTranslations("brand");
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-rail bg-panel/40">
      <div className="mx-auto max-w-wide px-4 py-12 lg:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <span className="display text-xl text-signal">
              ULTIMATE <span className="text-drift">DRIFT</span>
            </span>
            <p className="mt-3 text-sm text-mute max-w-md">
              {tBrand("shortDescription")}
            </p>
          </div>

          <nav aria-label="Footer" className="flex flex-col gap-2">
            <Link href="/sobre" className="text-sm text-mute hover:text-signal">
              {tNav("home")}
            </Link>
            <Link href="/termos" className="text-sm text-mute hover:text-signal">
              {t("termos")}
            </Link>
            <Link href="/privacidade" className="text-sm text-mute hover:text-signal">
              {t("privacidade")}
            </Link>
            <a
              href={EXTERNAL_LINKS.regulation}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-mute hover:text-signal"
            >
              {t("regulamento")}
            </a>
          </nav>

          <div>
            <p className="eyebrow mb-3">{t("followUs")}</p>
            <div className="flex gap-3">
              {SOCIAL.map(({ href, label, icon: Icon }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="inline-flex size-9 items-center justify-center rounded border border-rail text-mute hover:text-drift hover:border-drift"
                >
                  <Icon className="size-4" aria-hidden />
                </a>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-10 border-t border-rail pt-6 text-xs uppercase tracking-[0.18em] text-faint">
          © {year} Ultimate Drift. {t("rights")}
        </p>
      </div>
    </footer>
  );
}
