import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { PublicStageHubSummary } from "@/lib/stages/queries";
import { formatDateRange } from "@/lib/format";

type Props = {
  nextStage: PublicStageHubSummary | null;
  locale: string;
};

export function Hero({ nextStage, locale }: Props) {
  const t = useTranslations("home");

  return (
    <section className="relative overflow-hidden border-b border-rail bg-ink">
      {nextStage?.posterImageUrl && (
        <div aria-hidden className="absolute inset-0 -z-10">
          <Image
            src={nextStage.posterImageUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-30"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/80 to-ink/30" />
        </div>
      )}
      <div className="mx-auto max-w-wide px-4 py-20 lg:px-8 lg:py-28">
        <p className="eyebrow">{t("heroEyebrow")}</p>
        <h1 className="display mt-3 max-w-3xl text-4xl text-signal lg:text-6xl">
          {t("heroTitle")}
        </h1>
        <p className="mt-4 max-w-2xl text-base text-mute lg:text-lg">{t("heroSubtitle")}</p>

        {nextStage && (
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            <Link
              href={{ pathname: "/etapas/[slug]", params: { slug: nextStage.slug } }}
              className="inline-flex items-center justify-center rounded bg-drift px-5 py-3 text-sm uppercase tracking-[0.18em] font-bold text-ink hover:bg-driftDeep"
            >
              {t("heroCta")}
            </Link>
            <p className="text-sm text-mute">
              <span className="eyebrow inline-block mr-2 text-mute">{t("nextStage")}</span>
              <span className="text-signal font-medium">{nextStage.name}</span>
              {nextStage.startDate && (
                <span className="text-mute"> · {formatDateRange(nextStage.startDate, nextStage.endDate, locale)}</span>
              )}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
