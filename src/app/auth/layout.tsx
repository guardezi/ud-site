import "../globals.css";
import type { Metadata } from "next";
import { PT_Sans } from "next/font/google";

/**
 * Layout próprio das páginas de ação de auth do Firebase (reset de senha,
 * verificação de e-mail). Fica FORA do `[locale]` de propósito: não leva o
 * header/footer do site, é uma página focada e sem chrome. Fornece o
 * `<html>`/`<body>` (o root layout é pass-through) com o tema da marca.
 *
 * Excluída do middleware next-intl (ver `middleware.ts`) — não é rota
 * localizada; o idioma vem do parâmetro `lang` que o Firebase anexa.
 */
const ptSans = PT_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-pt-sans",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Ultimate Drift",
  robots: { index: false, follow: false },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={ptSans.variable}>
      <body className="min-h-screen text-signal antialiased">{children}</body>
    </html>
  );
}
