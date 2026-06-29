import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PRIMARY_NAV, EXTERNAL_LINKS } from "@/lib/routes";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { MobileNavToggle } from "./MobileNavToggle";

export function PublicHeader() {
  const t = useTranslations("nav");

  return (
    <header className="sticky top-0 z-40 border-b border-rail bg-ink/95 backdrop-blur supports-[backdrop-filter]:bg-ink/80">
      <div className="mx-auto flex max-w-wide items-center justify-between gap-6 px-4 py-3 lg:px-8">
        <Link href="/" className="display text-xl text-signal tracking-tight">
          ULTIMATE <span className="text-drift">DRIFT</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-5" aria-label="Primary">
          {PRIMARY_NAV.slice(1).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-xs uppercase tracking-[0.18em] text-mute hover:text-signal transition-colors"
            >
              {t(item.labelKey)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href={EXTERNAL_LINKS.tickets}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-flex items-center rounded bg-drift px-3 py-1.5 text-xs uppercase tracking-[0.18em] font-bold text-ink hover:bg-driftDeep transition-colors"
          >
            {t("ingressos")}
          </a>
          <LocaleSwitcher />
          <MobileNavToggle />
        </div>
      </div>
    </header>
  );
}
