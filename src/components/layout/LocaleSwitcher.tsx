"use client";

import { useLocale } from "next-intl";
import { useState, useRef, useEffect, useTransition } from "react";
import { LOCALES, type Locale } from "@/i18n/config";
import { usePathname, useRouter } from "@/i18n/navigation";

const FLAG_BY_LOCALE: Record<Locale, { src: string; label: string }> = {
  "pt-BR": { src: "/theme/svg/br-flag.svg", label: "Português" },
  "en-US": { src: "/theme/svg/us-flag.svg", label: "English" },
  "es-ES": { src: "/theme/svg/es-flag.svg", label: "Español" },
};

export function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const change = (next: Locale) => {
    if (next === locale) {
      setOpen(false);
      return;
    }
    setOpen(false);
    startTransition(() => {
      router.replace(pathname as never, { locale: next });
    });
  };

  const current = FLAG_BY_LOCALE[locale];

  return (
    <div
      ref={ref}
      style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Idioma atual: ${current.label}. Clique para mudar.`}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: "pointer",
          color: "#fff",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.src}
          alt={current.label}
          width={32}
          height={22}
          style={{ display: "block", borderRadius: 3, objectFit: "cover" }}
          loading="lazy"
        />
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden>
          <path d="M1 1L5 5L9 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul
          role="menu"
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 6,
            padding: "4px 0",
            minWidth: 150,
            background: "#141417",
            border: "1px solid #3f3f3f",
            borderRadius: 4,
            listStyle: "none",
            zIndex: 9999,
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          }}
        >
          {LOCALES.map((l) => {
            const f = FLAG_BY_LOCALE[l];
            const active = l === locale;
            return (
              <li key={l} role="none">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => change(l)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "10px 14px",
                    background: "transparent",
                    border: "none",
                    color: active ? "#54F251" : "#fff",
                    fontWeight: active ? 700 : 400,
                    fontSize: 14,
                    cursor: active ? "default" : "pointer",
                    textAlign: "left",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={f.src}
                    alt=""
                    width={26}
                    height={18}
                    style={{ borderRadius: 2, objectFit: "cover", flexShrink: 0 }}
                  />
                  <span>{f.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
