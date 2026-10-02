"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { HamburgerIcon, CloseIcon, SOCIAL_LINKS } from "@/components/wp-icons";
import { MAIN_NAV } from "./main-nav";

const ITEM_STYLE: React.CSSProperties = {
  display: "block",
  padding: "16px 0",
  color: "#fff",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  textDecoration: "none",
};

export function MobileNavToggle() {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="header__menu ui__display--none ui__display--lg-block"
        aria-label="Abrir menu"
      >
        <HamburgerIcon />
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999,
            background: "#141417",
            color: "#fff",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #3f3f3f" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/theme/img/logo.png" alt="Ultimate Drift" style={{ height: 40, width: "auto" }} />
            <button type="button" onClick={() => setOpen(false)} aria-label="Fechar menu" style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer" }}>
              <CloseIcon />
            </button>
          </div>
          <nav style={{ flex: 1, overflowY: "auto", padding: "12px 20px" }}>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {MAIN_NAV.map((item) => (
                <li key={item.labelKey} style={{ borderBottom: "1px solid #3f3f3f" }}>
                  {item.kind === "internal" ? (
                    <Link href={item.href} onClick={() => setOpen(false)} style={ITEM_STYLE}>
                      {t(item.labelKey)}
                    </Link>
                  ) : (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setOpen(false)}
                      style={item.highlight ? { ...ITEM_STYLE, color: "#54F251" } : ITEM_STYLE}
                    >
                      {t(item.labelKey)}
                    </a>
                  )}
                </li>
              ))}
            </ul>
            <div style={{ marginTop: 30 }}>
              <p style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: 12, color: "#c5c5c5" }}>Nos siga</p>
              <div style={{ display: "flex", gap: 12 }}>
                {SOCIAL_LINKS.map(({ href, label, Icon }) => (
                  <a key={href} href={href} target="_blank" rel="noopener noreferrer" title={`Visitar ${label}`} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 8, border: "1px solid #3f3f3f" }}>
                    <Icon />
                  </a>
                ))}
              </div>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
