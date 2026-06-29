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
export function renderMarkdown(source: string): string {
  const walkTokens = (token: { type: string; href?: string }) => {
    if (token.type === "image" && token.href && STORAGE_PATH_PATTERN.test(token.href)) {
      const resolved = imageMedium(token.href);
      if (resolved) token.href = resolved;
    }
  };
  marked.use({ walkTokens });
  return marked.parse(source) as string;
}
