import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("common");
  return (
    <div className="mx-auto flex max-w-narrow flex-col items-center justify-center px-4 py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="display mt-4 text-4xl text-signal lg:text-5xl">{t("notFoundTitle")}</h1>
      <p className="mt-3 max-w-md text-mute">{t("notFoundSubtitle")}</p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center rounded bg-drift px-5 py-3 text-sm uppercase tracking-[0.18em] font-bold text-ink hover:bg-driftDeep"
      >
        {t("backToHome")}
      </Link>
    </div>
  );
}
