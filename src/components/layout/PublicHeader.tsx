import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PRIMARY_NAV, EXTERNAL_LINKS } from "@/lib/routes";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { MobileNavToggle } from "./MobileNavToggle";

export function PublicHeader() {
  const t = useTranslations("nav");

  return (
    <header className="fixed top-0 left-0 z-40 w-full bg-panel text-signal">
      <div className="mx-auto flex max-w-wide items-center justify-between gap-6 px-4 py-3 lg:px-8">
        <Link href="/" aria-label="Ultimate Drift" className="flex shrink-0 items-center">
          <Image
            src="/logo.png"
            alt="Ultimate Drift"
            width={180}
            height={48}
            priority
            className="h-12 w-auto object-contain"
          />
        </Link>

        <nav className="hidden xl:flex items-center gap-5" aria-label="Primary">
          {PRIMARY_NAV.slice(1).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-bold uppercase tracking-[0.12em] text-signal hover:text-drift transition-colors"
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
            className="btn-ud hidden md:inline-flex h-10 px-4 text-sm uppercase"
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
