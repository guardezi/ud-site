"use client";

import { useState } from "react";
import { imageVariant, imageSrcSet, type Variant, type SrcSetVariants } from "@/lib/firebase/image-variants";

type Props = {
  /** Path do Storage (ex: `pilotos/piloto_42.png`) ou URL completa. */
  src: string | null | undefined;
  alt: string;
  /** Variant base servida como `src` (browser escolhe outra do srcset se cabe melhor). */
  baseVariant?: Exclude<Variant, "webp">;
  /** Quais variantes incluir no srcset. Default: `responsive` (small/medium/high). */
  srcsetPreset?: SrcSetVariants;
  /** Atributo `sizes` HTML — guia o browser. */
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
 * `storageImageVariantsOnObjectFinalized` (mesma escala do ud-app).
 *
 * Se o arquivo não existe no Storage (variant nunca gerada) OU a leitura
 * falha (403/404), o `onError` troca pra um placeholder SVG cinza discreto
 * — evita ícone de "imagem quebrada" do browser.
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
  const [failed, setFailed] = useState(false);
  const url = imageVariant(src, baseVariant);

  if (!url || failed) {
    return <Placeholder alt={alt} width={width} height={height} className={className} style={style} />;
  }

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
      onError={() => setFailed(true)}
    />
  );
}

function Placeholder({
  alt,
  width,
  height,
  className,
  style,
}: {
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      role="img"
      aria-label={alt}
      className={className}
      style={{
        width: width ? `${width}px` : "100%",
        height: height ? `${height}px` : "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #1f1f24 0%, #141417 100%)",
        color: "#4b5563",
        ...style,
      }}
    >
      <svg width="30%" height="30%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden style={{ maxWidth: 48, maxHeight: 48, opacity: 0.5 }}>
        <path
          d="M4 16.5V5.5C4 4.67157 4.67157 4 5.5 4H18.5C19.3284 4 20 4.67157 20 5.5V16.5C20 17.3284 19.3284 18 18.5 18H5.5C4.67157 18 4 17.3284 4 16.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <circle cx="9" cy="9" r="1.5" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M20 15L16.5 11.5C15.7 10.7 14.3 10.7 13.5 11.5L6 19"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
