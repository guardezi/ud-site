import "server-only";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

/**
 * Renderiza o snapshot HTML do main da home do WP via dangerouslySetInnerHTML.
 *
 * O HTML preserva markup .index__, .etapa-card, etc. — todos estilizados via
 * /theme/css/bundle.min.css (linkado no [locale]/layout.tsx).
 *
 * Plugando dados dinâmicos: faz string-replace em placeholders antes de
 * renderizar. Ver função `hydrate()` abaixo. Fase 1: dados estáticos do
 * WP atual (ranking, próximas etapas hardcoded no snapshot). Fase 2:
 * sobrescrever esses blocos com dados frescos do Firestore.
 */

export async function WPHomeSnapshot() {
  const path = resolve(process.cwd(), "src/wp-snapshot/home-main.html");
  let html: string;
  try {
    html = await readFile(path, "utf8");
  } catch {
    html = "<!-- snapshot indisponível -->";
  }
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
