"use client";

/* eslint-disable @next/next/no-img-element -- cascata de fallback via onError (URLs do Storage, sem loader do next/image) */

import { useState } from "react";

/**
 * Capa do piloto como fundo do topo do perfil — mesma cascata do
 * `DriverCoverImage` do ud-app (lib/components/driver_cover_image.dart):
 * capa própria (`drivers/{id}.capa`) → capa padrão do Remote Config
 * (`defaultDriverCoverUrl`) → nada (topo fica como o tema antigo). Cada
 * candidata que falha ao carregar cai pra próxima.
 */
export function DriverCover({ sources }: { sources: string[] }) {
  const [idx, setIdx] = useState(0);
  const src = sources[idx];
  if (!src) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
      <img
        key={src}
        src={src}
        alt=""
        className="h-full w-full object-cover"
        decoding="async"
        onError={() => setIdx((i) => i + 1)}
      />
      {/* Mesmo degradê do hero do app (bg 0.88 → 0.45), puxado pro fundo do tema. */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#141417e0] to-[#14141773]" />
      <div className="absolute inset-x-0 top-0 h-[200px] bg-gradient-to-b from-[#141417] to-transparent" />
    </div>
  );
}
