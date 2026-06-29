import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { PublicStageHubSummary } from "@/lib/stages/queries";
import { formatDateRange } from "@/lib/format";

export function StageCard({ stage, locale }: { stage: PublicStageHubSummary; locale: string }) {
  return (
    <Link
      href={{ pathname: "/etapas/[slug]", params: { slug: stage.slug } }}
      className="card-ud group block"
    >
      <div className="relative aspect-[16/9] bg-shade">
        {stage.posterImageUrl ? (
          <Image
            src={stage.posterImageUrl}
            alt={stage.name}
            fill
            sizes="(min-width: 1024px) 33vw, 100vw"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-faint text-xs uppercase tracking-wider">
            Etapa
          </div>
        )}
      </div>
      <div className="space-y-2 p-5">
        <p className="eyebrow">{formatDateRange(stage.startDate, stage.endDate, locale)}</p>
        <h3 className="display text-xl text-signal group-hover:text-drift transition-colors">{stage.name}</h3>
      </div>
    </Link>
  );
}
