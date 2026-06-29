import type { PublicDriverSummary } from "@/lib/drivers/queries";
import { DriverCard } from "./DriverCard";

export function DriverGrid({ drivers }: { drivers: PublicDriverSummary[] }) {
  if (drivers.length === 0) {
    return <p className="text-mute text-sm">—</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {drivers.map((d) => (
        <DriverCard key={d.id} driver={d} />
      ))}
    </div>
  );
}
