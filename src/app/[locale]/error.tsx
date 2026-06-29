"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("common");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-narrow flex-col items-center justify-center px-4 py-24 text-center">
      <p className="eyebrow">500</p>
      <h1 className="display mt-4 text-4xl text-signal lg:text-5xl">{t("error")}</h1>
      <button
        type="button"
        onClick={reset}
        className="mt-8 inline-flex items-center rounded bg-drift px-5 py-3 text-sm uppercase tracking-[0.18em] font-bold text-ink hover:bg-driftDeep"
      >
        {t("errorRetry")}
      </button>
    </div>
  );
}
