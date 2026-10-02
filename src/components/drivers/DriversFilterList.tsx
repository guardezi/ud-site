"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { UDImage } from "@/components/ui/UDImage";

export type DriverListItem = {
  id: number;
  slug: string;
  apelido: string;
  numero: number | null;
  fotoPath: string | null;
  /** Só MASTER/ROOKIE ganham selo (o tema antigo não tem selo pra PRO). */
  badge: "MASTER" | "ROOKIE" | null;
};

/**
 * Grade de pilotos + busca por apelido/número — mesmo comportamento do
 * `#filtro-piloto` do tema antigo (filtra no client por substring).
 */
export function DriversFilterList({
  drivers,
  labels,
}: {
  drivers: DriverListItem[];
  labels: { search: string; placeholder: string; noResults: string; viewProfile: string; photoAlt: string };
}) {
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const visible = term
    ? drivers.filter((d) => d.apelido.toLowerCase().includes(term) || String(d.numero ?? "").includes(term))
    : drivers;

  return (
    <>
      <div className="drivers__filter" data-animate="slide-left">
        <label htmlFor="filtro-piloto" className="driver__label">
          {labels.search}
        </label>
        <input
          className="driver__input w-full max-w-[400px] rounded-[10px] border border-[#54f251] bg-transparent px-[10px] py-[12px] text-[15px] text-white placeholder:text-[#8a8a8a]"
          name="filtro-piloto"
          type="text"
          id="filtro-piloto"
          placeholder={labels.placeholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoComplete="off"
        />
      </div>

      <div className="drivers__container row">
        {visible.length === 0 ? (
          <p style={{ padding: "60px 0", textAlign: "center", color: "#9b9b9b" }}>{labels.noResults}</p>
        ) : (
          visible.map((d) => (
            <div
              key={d.id}
              className="driver-col col-xl-3 col-lg-4 col-sm-6"
              data-apelido={d.apelido}
              data-numero={d.numero ?? ""}
            >
              <Link
                href={{ pathname: "/pilotos/[slug]", params: { slug: d.slug } }}
                className="drivers__rank-driver"
                title={labels.viewProfile.replace("{name}", d.apelido)}
              >
                <div className="drivers__driver">
                  <div className="drivers__driver-box">
                    {d.badge && (
                      <div className="drivers__driver-category" data-category={d.badge}>
                        {d.badge}
                      </div>
                    )}
                    <div className="drivers__rank-img-box">
                      <UDImage
                        src={d.fotoPath}
                        alt={labels.photoAlt.replace("{name}", d.apelido)}
                        baseVariant="small"
                        srcsetPreset="compact"
                        sizes="(max-width: 576px) 100vw, (max-width: 992px) 50vw, 300px"
                        width={220}
                        height={220}
                        className="drivers__rank-driver-img"
                      />
                    </div>
                    <div className="drivers__rank-bottom">
                      <div className="drivers__rank-number-box">
                        <span className="drivers__rank-number">{d.numero ?? "—"}</span>
                      </div>
                      <div className="drivers__driver-name">{d.apelido}</div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))
        )}
      </div>
    </>
  );
}
