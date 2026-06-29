"use client";

import Image from "next/image";
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
        className="xl:hidden inline-flex items-center justify-center rounded border border-rail p-1.5 text-signal hover:text-drift hover:border-drift"
        aria-label="Open menu"
      >
        <Menu className="size-5" aria-hidden />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-panel/98 backdrop-blur-sm xl:hidden">
          <div className="flex items-center justify-between border-b border-rail px-4 py-3">
            <Image src="/logo.png" alt="Ultimate Drift" width={140} height={36} className="h-9 w-auto object-contain" />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center rounded border border-rail p-1.5 text-signal hover:text-drift"
              aria-label="Close menu"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <nav className="flex flex-col gap-1 px-4 py-6">
            {PRIMARY_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="border-b border-rail py-3 text-base font-bold uppercase tracking-[0.12em] text-signal hover:text-drift"
              >
                {t(item.labelKey)}
              </Link>
            ))}
            <a
              href={EXTERNAL_LINKS.tickets}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ud mt-6"
            >
              {t("ingressos")}
            </a>
          </nav>
        </div>
      )}
    </>
  );
}
