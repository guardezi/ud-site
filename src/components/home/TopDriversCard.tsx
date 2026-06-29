import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { StandingEntry } from "@/lib/championship/queries";

export function TopDriversCard({ entries }: { entries: StandingEntry[] }) {
  const t = useTranslations("home");
  if (entries.length === 0) return null;

  const top = entries.slice(0, 5);
  return (
    <section className="rounded border border-rail bg-panel/30">
      <div className="border-b border-rail px-4 py-3">
        <h2 className="eyebrow text-drift">{t("topDrivers")}</h2>
      </div>
      <ul className="divide-y divide-rail">
        {top.map((e) => (
          <li key={`${e.position}-${e.driverId ?? e.driverName}`} className="flex items-center gap-3 px-4 py-3">
            <span className="data w-6 text-mute">{e.position}.</span>
            <span className="flex-1 text-signal">{e.driverNickname ?? e.driverName}</span>
            <span className="data font-bold text-drift">{e.points}</span>
          </li>
        ))}
      </ul>
      <div className="border-t border-rail px-4 py-3 text-right">
        <Link href="/classificacao" className="text-xs uppercase tracking-[0.18em] text-mute hover:text-drift">
          {t("viewAllStandings")} →
        </Link>
      </div>
    </section>
  );
}
