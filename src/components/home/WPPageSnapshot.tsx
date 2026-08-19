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

/** Origem dos assets do WordPress legado (imagens em /uploads e /theme). */
const WP_ORIGIN = (process.env.NEXT_PUBLIC_WP_ASSET_ORIGIN ?? "https://www.ultimatedrift.com.br").replace(/\/+$/, "");

/**
 * Os snapshots referenciam assets com paths root-relativos (`/uploads/...`,
 * `/theme/...`) que resolviam contra a origem do WordPress. Servidos pelo
 * domínio do site novo, dão 404 e todas as imagens quebram. Reescreve só esses
 * dois prefixos (em `src`, `srcset`, etc.) pra URL absoluta do WP.
 *
 * Paths de navegação (`/pilotos/`, `/etapas/`, `/noticias/`) NÃO são tocados —
 * essas rotas existem no site novo. O boundary (aspas/espaço/`(`) evita
 * prefixar URLs já absolutas e reescreve cada entrada de `srcset`.
 */
function absolutizeAssets(html: string): string {
  return html.replace(/(["'\s(])\/(uploads|theme)\//g, `$1${WP_ORIGIN}/$2/`);
}

function readOnce(name: string): string {
  try {
    return absolutizeAssets(readFileSync(resolve(DIR, name), "utf8"));
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
