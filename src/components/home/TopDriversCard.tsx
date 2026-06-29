import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { StandingEntry } from "@/lib/championship/queries";

export function TopDriversCard({ entries }: { entries: StandingEntry[] }) {
  const t = useTranslations("home");
  if (entries.length === 0) return null;

  const top = entries.slice(0, 5);
  return (
    <section className="card-ud">
      <div className="px-5 py-4 border-b border-rail">
        <h2 className="eyebrow">{t("topDrivers")}</h2>
      </div>
      <ul className="divide-y divide-rail">
        {top.map((e) => (
          <li key={`${e.position}-${e.driverId ?? e.driverName}`} className="flex items-center gap-3 px-5 py-3">
            <span className="data w-8 text-faint font-bold">{e.position}.</span>
            <span className="flex-1 text-signal font-bold">{e.driverNickname ?? e.driverName}</span>
            <span className="data font-bold text-drift">{e.points}</span>
          </li>
        ))}
      </ul>
      <div className="px-5 py-3 text-right border-t border-rail">
        <Link href="/classificacao" className="text-xs uppercase font-bold tracking-[0.12em] text-mute hover:text-drift">
          {t("viewAllStandings")} →
        </Link>
      </div>
    </section>
  );
}
