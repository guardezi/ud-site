import { marked } from "marked";
import { imageMedium } from "@/lib/firebase/image-variants";

marked.setOptions({
  gfm: true,
  breaks: false,
});

const STORAGE_PATH_PATTERN = /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_./-]+\.(jpg|jpeg|png|webp|gif|avif)$/i;

/**
 * Renderiza markdown para HTML. Resolve referências a paths de Storage (ex:
 * `news/foo/img.jpg`) pra URLs públicas WebP via image-variants. URLs HTTP(S)
 * passam intactas.
 */
// Registrado uma única vez: `marked.use` acumula extensões a cada chamada.
marked.use({
  walkTokens(token) {
    if (token.type === "image" && token.href && STORAGE_PATH_PATTERN.test(token.href)) {
      const resolved = imageMedium(token.href);
      if (resolved) token.href = resolved;
    }
  },
});

export function renderMarkdown(source: string): string {
  return marked.parse(source) as string;
}
