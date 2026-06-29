import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { PublicDriverSummary } from "@/lib/drivers/queries";

export function DriverCard({ driver }: { driver: PublicDriverSummary }) {
  return (
    <Link
      href={{ pathname: "/pilotos/[slug]", params: { slug: driver.slug } }}
      className="card-ud group block"
    >
      <div className="relative aspect-square bg-shade">
        {driver.fotoUrl ? (
          <Image
            src={driver.fotoUrl}
            alt={`${driver.apelido} — piloto Ultimate Drift`}
            fill
            sizes="(min-width: 1024px) 240px, (min-width: 768px) 33vw, 50vw"
            className="object-cover transition-transform group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-faint text-xs uppercase tracking-wider">
            Sem foto
          </div>
        )}
        {driver.numero != null && (
          <span className="absolute left-3 top-3 inline-flex items-center justify-center rounded bg-panel/90 px-2.5 py-1 text-sm font-bold text-drift backdrop-blur">
            #{driver.numero}
          </span>
        )}
      </div>
      <div className="space-y-1 p-4">
        <h3 className="display text-base text-signal group-hover:text-drift transition-colors">{driver.apelido}</h3>
        <p className="text-xs uppercase tracking-wider text-mute">
          {driver.category ?? driver.city ?? "Piloto"}
        </p>
      </div>
    </Link>
  );
}
