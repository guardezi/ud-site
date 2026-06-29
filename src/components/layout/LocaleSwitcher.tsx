"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { ChevronDown, Globe } from "lucide-react";
import { LOCALES, type Locale, localeShort } from "@/i18n/config";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils/cn";

export function LocaleSwitcher() {
  const t = useTranslations("nav");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  const change = (next: Locale) => {
    setOpen(false);
    startTransition(() => {
      // pathname é tipado mas pode incluir rotas dinâmicas; o router resolve
      // params já preenchidos automaticamente quando passamos só o pathname.
      router.replace(pathname as never, { locale: next });
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded border border-rail px-2.5 py-1 text-xs uppercase tracking-wider text-mute hover:text-signal hover:border-drift transition-colors"
        aria-label={t("language")}
        aria-expanded={open}
      >
        <Globe className="size-3.5" aria-hidden />
        <span>{localeShort(locale)}</span>
        <ChevronDown className="size-3" aria-hidden />
      </button>
      {open && (
        <ul
          role="menu"
          className="absolute right-0 top-full mt-1 z-50 min-w-[8rem] rounded border border-rail bg-panel shadow-xl"
        >
          {LOCALES.map((l) => (
            <li key={l}>
              <button
                type="button"
                onClick={() => change(l)}
                className={cn(
                  "block w-full px-3 py-2 text-left text-xs uppercase tracking-wider",
                  l === locale ? "text-drift" : "text-mute hover:text-signal hover:bg-rail",
                )}
              >
                {localeShort(l)} · {l}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
