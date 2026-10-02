"use client";

import { useRouter } from "@/i18n/navigation";
import type { ReactNode } from "react";

/**
 * Título com seta "voltar" do tema legado (`.ui__title` + ícone verde). No
 * WordPress era `href="javascript:history.back()"`; aqui volta no histórico
 * e, sem histórico (acesso direto), cai em `fallbackHref`.
 */
export function BackTitle({
  children,
  fallbackHref,
  backLabel,
}: {
  children: ReactNode;
  fallbackHref: "/etapas" | "/";
  backLabel: string;
}) {
  const router = useRouter();
  return (
    <a
      href="#"
      className="ui__title"
      aria-label={backLabel}
      onClick={(e) => {
        e.preventDefault();
        if (window.history.length > 1) router.back();
        else router.push(fallbackHref);
      }}
    >
      <svg className="ui__icon" width="15" height="27" viewBox="0 0 15 27" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path
          d="M13.5208 26.7703C13.8818 27.1025 14.4396 27.0692 14.7678 26.7039C15.096 26.3386 15.0632 25.774 14.7022 25.4419L2.00202 13.8182C1.67385 13.5193 1.67385 13.0875 2.00202 12.7886L14.7022 1.5634C15.0632 1.23129 15.096 0.666705 14.8006 0.301387C14.4725 -0.0639308 13.9146 -0.0971413 13.5536 0.201755L0.853422 11.4602C-0.262355 12.4565 -0.295172 14.1171 0.820606 15.1466L13.5208 26.7703Z"
          fill="#54F251"
        />
      </svg>
      <h1>{children}</h1>
    </a>
  );
}
