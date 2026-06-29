import "server-only";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Renderiza um snapshot HTML cru do tema WordPress legado.
 * Os HTMLs são pré-lidos no module load (readFileSync com paths literais),
 * pra que webpack/turbopack inclua os arquivos no bundle deployado.
 * next.config.ts outputFileTracingIncludes serve como safety net.
 */

const DIR = resolve(process.cwd(), "src/wp-snapshot");

function readOnce(name: string): string {
  try {
    return readFileSync(resolve(DIR, name), "utf8");
  } catch {
    return `<!-- snapshot ${name} indisponível -->`;
  }
}

const SNAPSHOTS: Record<string, string> = {
  "home-main": readOnce("home-main.html"),
  pilotos: readOnce("pilotos.html"),
  classificacao: readOnce("classificacao.html"),
  etapas: readOnce("etapas.html"),
  categorias: readOnce("categorias.html"),
  noticias: readOnce("noticias.html"),
  patrocinadores: readOnce("patrocinadores.html"),
  contato: readOnce("contato.html"),
  "termos-e-condicoes": readOnce("termos-e-condicoes.html"),
};

export function WPPageSnapshot({ slug }: { slug: string }) {
  const html = SNAPSHOTS[slug] ?? `<!-- snapshot ${slug} indisponível -->`;
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
