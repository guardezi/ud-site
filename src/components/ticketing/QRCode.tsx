import "server-only";
import { encodeQrToMatrix, type Ecc } from "./qr-encoder";

type Props = {
  /** Conteúdo a codificar — no ticketing, o `qrToken` do ingresso emitido. */
  value: string;
  /** Lado do SVG em px (default 220). O QR é sempre quadrado. */
  size?: number;
  /** Quiet zone em módulos (default 4, mínimo do padrão pra scan confiável). */
  margin?: number;
  /** Nível de correção de erro (default M). */
  ecc?: Ecc;
  className?: string;
  /** Rótulo acessível do QR. */
  title?: string;
};

/**
 * Renderiza um QR Code como SVG puro, no server, a partir de `value`.
 *
 * Sem dependência externa: usa o encoder próprio em `qr-encoder.ts` (adaptação
 * do algoritmo de referência de QR, domínio público). Um único `<path>` com
 * todos os módulos escuros mantém o SVG compacto; `shape-rendering="crispEdges"`
 * garante bordas nítidas em qualquer escala. Fundo branco + quiet zone tornam o
 * código scaneável mesmo sobre o tema escuro do site.
 *
 * Não há segredo envolvido — o token já é público pro dono do pedido (é o que
 * vira o QR do ingresso). A assinatura/validação do token vive só nas Cloud
 * Functions (CONTRACTS.md §2).
 */
export function QRCode({ value, size = 220, margin = 4, ecc = "M", className, title }: Props) {
  const matrix = encodeQrToMatrix(value, ecc);
  const count = matrix.length;
  const dim = count + margin * 2;

  // Constrói o path unificado: um "M x y h1 v1 h-1 z" por módulo escuro.
  let d = "";
  for (let y = 0; y < count; y++) {
    for (let x = 0; x < count; x++) {
      if (matrix[y]![x]) {
        d += `M${x + margin} ${y + margin}h1v1h-1z`;
      }
    }
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={`0 0 ${dim} ${dim}`}
      shapeRendering="crispEdges"
      className={className}
      role="img"
      aria-label={title ?? "QR Code"}
    >
      {title ? <title>{title}</title> : null}
      <rect width={dim} height={dim} fill="#ffffff" />
      <path d={d} fill="#000000" />
    </svg>
  );
}
