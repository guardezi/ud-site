/**
 * Seta verde do tema WP (mesmo path usado no título "voltar" e na paginação
 * de wp-content/themes/ultimate-drift). Copiada literal pra fidelidade visual.
 */
const PATH =
  "M13.5208 26.7703C13.8818 27.1025 14.4396 27.0692 14.7678 26.7039C15.096 26.3386 15.0632 25.774 14.7022 25.4419L2.00202 13.8182C1.67385 13.5193 1.67385 13.0875 2.00202 12.7886L14.7022 1.5634C15.0632 1.23129 15.096 0.666705 14.8006 0.301387C14.4725 -0.0639308 13.9146 -0.0971413 13.5536 0.201755L0.853422 11.4602C-0.262355 12.4565 -0.295172 14.1171 0.820606 15.1466L13.5208 26.7703Z";

export function ChevronIcon({ className, width, height }: { className: string; width: number; height: number }) {
  return (
    <svg className={className} width={width} height={height} viewBox="0 0 15 27" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d={PATH} fill="#54F251" />
    </svg>
  );
}
