/**
 * 404 top-level — renderizado quando uma URL fora do segment `[locale]`
 * não bate com nada (ex: /favicon.ico inexistente, /random.png).
 * Não usa i18n/translations pra evitar locale undefined crashing
 * Intl.DateTimeFormat downstream.
 */
import Link from "next/link";

export default function GlobalNotFound() {
  return (
    <html lang="pt-BR">
      <body
        style={{
          background: "#313137",
          color: "#ffffff",
          fontFamily: "system-ui, -apple-system, sans-serif",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <p style={{ color: "#54F251", fontWeight: 700, letterSpacing: "0.16em", fontSize: "0.75rem", textTransform: "uppercase" }}>
          404
        </p>
        <h1 style={{ fontSize: "2.5rem", fontWeight: 700, margin: "0.5rem 0 0" }}>
          Página não encontrada
        </h1>
        <p style={{ color: "#c5c5c5", marginTop: "0.75rem", maxWidth: "32rem" }}>
          A página que você procurou pode ter sido movida ou nunca existiu.
        </p>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: "2rem",
            padding: "0 1.25rem",
            height: "50px",
            background: "#54F251",
            color: "#000",
            borderRadius: "5px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.02em",
            textDecoration: "none",
          }}
        >
          Voltar pra home
        </Link>
      </body>
    </html>
  );
}
