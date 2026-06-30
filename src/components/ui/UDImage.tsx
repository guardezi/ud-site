import { imageVariant, imageSrcSet, type Variant, type SrcSetVariants } from "@/lib/firebase/image-variants";

type Props = {
  /** Path do Storage (ex: `pilotos/piloto_42.png`) ou URL completa. */
  src: string | null | undefined;
  alt: string;
  /** Variant base servida como `src` (browser escolhe outra do srcset se cabe melhor). */
  baseVariant?: Exclude<Variant, "webp">;
  /** Quais variantes incluir no srcset. Default: `responsive` (small/medium/high). */
  srcsetPreset?: SrcSetVariants;
  /** Atributo `sizes` HTML — guia o browser. Default: `100vw` (browser usa o menor que cabe). */
  sizes?: string;
  width?: number;
  height?: number;
  className?: string;
  /** `lazy` por default; `eager` pra above-the-fold. */
  loading?: "lazy" | "eager";
  fetchPriority?: "high" | "low" | "auto";
  decoding?: "async" | "sync" | "auto";
  /** Inline style passthrough — útil pra preencher container. */
  style?: React.CSSProperties;
};

/**
 * Renderiza `<img>` consumindo as variantes WebP geradas pela CF
 * `storageImageVariantsOnObjectFinalized` (mesma escala do ud-app):
 * thumb 200, small 400, medium 800, high 1920.
 *
 * O browser escolhe a melhor combinação (viewport × DPR × sizes) dentro do srcset.
 */
export function UDImage({
  src,
  alt,
  baseVariant = "medium",
  srcsetPreset = "responsive",
  sizes,
  width,
  height,
  className,
  loading = "lazy",
  fetchPriority,
  decoding = "async",
  style,
}: Props) {
  const url = imageVariant(src, baseVariant);
  if (!url) return null;
  const srcSet = imageSrcSet(src, srcsetPreset);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      srcSet={srcSet ?? undefined}
      sizes={sizes}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={loading}
      fetchPriority={fetchPriority}
      decoding={decoding}
      style={style}
    />
  );
}
