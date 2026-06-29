"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { HamburgerIcon, CloseIcon, SOCIAL_LINKS } from "@/components/wp-icons";

const NAV: Array<{
  href: "/" | "/pilotos" | "/etapas" | "/classificacao" | "/categorias" | "/noticias" | "/patrocinadores" | "/contato";
  labelKey: string;
}> = [
  { href: "/", labelKey: "home" },
  { href: "/pilotos", labelKey: "pilotos" },
  { href: "/classificacao", labelKey: "classificacao" },
  { href: "/etapas", labelKey: "etapas" },
  { href: "/categorias", labelKey: "categorias" },
  { href: "/noticias", labelKey: "noticias" },
  { href: "/patrocinadores", labelKey: "patrocinadores" },
  { href: "/contato", labelKey: "contato" },
];

const TICKETS_URL = "https://www.tycket.com.br/ultimate-drift-ribeir-o-preto-14-a-16-agosto.html";

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
              {NAV.map((item) => (
                <li key={item.href} style={{ borderBottom: "1px solid #3f3f3f" }}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    style={{ display: "block", padding: "16px 0", color: "#fff", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", textDecoration: "none" }}
                  >
                    {t(item.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
            <a
              href={TICKETS_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              style={{ display: "block", marginTop: 24, padding: "14px 20px", textAlign: "center", background: "#54F251", color: "#000", fontWeight: 700, borderRadius: 5, textTransform: "uppercase", letterSpacing: "0.04em", textDecoration: "none" }}
            >
              {t("ingressos")}
            </a>
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
