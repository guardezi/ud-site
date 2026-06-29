"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PRIMARY_NAV, EXTERNAL_LINKS } from "@/lib/routes";

export function MobileNavToggle() {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="lg:hidden inline-flex items-center justify-center rounded border border-rail p-1.5 text-mute hover:text-signal"
        aria-label="Open menu"
      >
        <Menu className="size-4" aria-hidden />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-ink/95 backdrop-blur-sm lg:hidden">
          <div className="flex items-center justify-between border-b border-rail px-4 py-3">
            <span className="display text-xl text-signal">
              ULTIMATE <span className="text-drift">DRIFT</span>
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center rounded border border-rail p-1.5 text-mute hover:text-signal"
              aria-label="Close menu"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
          <nav className="flex flex-col gap-1 px-4 py-6">
            {PRIMARY_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="border-b border-rail py-3 text-sm uppercase tracking-[0.18em] text-signal hover:text-drift"
              >
                {t(item.labelKey)}
              </Link>
            ))}
            <a
              href={EXTERNAL_LINKS.tickets}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center justify-center rounded bg-drift px-4 py-3 text-sm uppercase tracking-[0.18em] font-bold text-ink"
            >
              {t("ingressos")}
            </a>
          </nav>
        </div>
      )}
    </>
  );
}
