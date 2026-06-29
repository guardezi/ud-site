import { useTranslations } from "next-intl";
import type { StandingEntry } from "@/lib/championship/queries";

export function StandingsTable({ entries }: { entries: StandingEntry[] }) {
  const t = useTranslations("classificacao");
  if (entries.length === 0) {
    return <p className="text-mute text-sm">{t("empty")}</p>;
  }
  return (
    <div className="overflow-x-auto rounded border border-rail">
      <table className="w-full text-sm">
        <thead className="bg-panel text-xs uppercase tracking-wider text-mute">
          <tr>
            <th className="px-3 py-2 text-left">{t("position")}</th>
            <th className="px-3 py-2 text-left">{t("driver")}</th>
            <th className="px-3 py-2 text-right">{t("points")}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={`${e.position}-${e.driverId ?? e.driverName}`} className="border-t border-rail">
              <td className="px-3 py-2 text-mute data">{e.position}.</td>
              <td className="px-3 py-2 text-signal">
                <span className="font-medium">{e.driverNickname ?? e.driverName}</span>
                {e.driverNickname && (
                  <span className="block text-xs text-mute">{e.driverName}</span>
                )}
              </td>
              <td className="px-3 py-2 text-right data font-bold text-drift">{e.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
