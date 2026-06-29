import type { PublicStageHubSummary } from "@/lib/stages/queries";
import { StageCard } from "./StageCard";

export function StagesList({ stages, locale }: { stages: PublicStageHubSummary[]; locale: string }) {
  if (stages.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {stages.map((s) => (
        <StageCard key={s.id} stage={s} locale={locale} />
      ))}
    </div>
  );
}
