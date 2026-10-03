import { Link } from "@/i18n/navigation";
import { UDImage } from "@/components/ui/UDImage";
import type { CategoryPilot } from "@/lib/categorias/pilots";

/**
 * Grade de pilotos no markup da página /pilotos do tema antigo
 * (`drivers__container` + `drivers__rank-driver`). O selo mostra a categoria
 * agrupada (MASTER/ROOKIE); Pro "puro" fica sem selo, como no site antigo.
 */
export function CategoryPilotGrid({
  pilots,
  viewProfile,
  photoAlt,
}: {
  pilots: CategoryPilot[];
  viewProfile: (name: string) => string;
  photoAlt: (name: string) => string;
}) {
  return (
    <div className="drivers__container row">
      {pilots.map((p) => {
        const badge = p.category === "master" || p.category === "rookie" ? p.category.toUpperCase() : null;
        return (
          <div key={p.driverId} className="driver-col col-xl-3 col-lg-4 col-sm-6">
            <Link
              href={{ pathname: "/pilotos/[slug]", params: { slug: p.slug } }}
              className="drivers__rank-driver"
              title={viewProfile(p.name)}
            >
              <div className="drivers__driver">
                <div className="drivers__driver-box">
                  {badge && (
                    <div className="drivers__driver-category" data-category={badge}>
                      {badge}
                    </div>
                  )}
                  <div className="drivers__rank-img-box">
                    <UDImage
                      src={p.photo}
                      alt={photoAlt(p.name)}
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
                      <span className="drivers__rank-number">{p.number ?? "—"}</span>
                    </div>
                    <div className="drivers__driver-name">{p.name}</div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
