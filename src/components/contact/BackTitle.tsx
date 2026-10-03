"use client";

import type { MouseEvent, ReactNode } from "react";
import { Link } from "@/i18n/navigation";

/**
 * Título com seta de voltar do tema legado. No WP era
 * `href="javascript:history.back()"` (React bloqueia `javascript:`): aqui volta
 * no histórico quando existe e cai na Home quando a página foi aberta direto.
 */
export function BackTitle({ children }: { children: ReactNode }) {
  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    if (window.history.length > 1) {
      e.preventDefault();
      window.history.back();
    }
  }
  return (
    <Link href="/" className="ui__title" data-animate="slide-bottom" onClick={onClick}>
      <svg className="ui__icon" width="15" height="27" viewBox="0 0 15 27" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path
          d="M13.5208 26.7703C13.8818 27.1025 14.4396 27.0692 14.7678 26.7039C15.096 26.3386 15.0632 25.774 14.7022 25.4419L2.00202 13.8182C1.67385 13.5193 1.67385 13.0875 2.00202 12.7886L14.7022 1.5634C15.0632 1.23129 15.096 0.666705 14.8006 0.301387C14.4725 -0.0639308 13.9146 -0.0971413 13.5536 0.201755L0.853422 11.4602C-0.262355 12.4565 -0.295172 14.1171 0.820606 15.1466L13.5208 26.7703Z"
          fill="#54F251"
        />
      </svg>
      {children}
    </Link>
  );
}
