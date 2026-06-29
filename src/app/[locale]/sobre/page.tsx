import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getContentPage } from "@/lib/contentPages/queries";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { buildMetadata } from "@/lib/seo/meta";
import { renderMarkdown } from "@/lib/utils/markdown";
import type { Locale } from "@/i18n/config";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "sobre" });
  return buildMetadata({
    href: "/sobre",
    locale,
    title: t("title"),
    description: t("subtitle"),
  });
}

export default async function SobrePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("sobre");
  const page = await getContentPage("sobre", locale);

  return (
    <div className="mx-auto max-w-narrow px-4 py-12 lg:px-8 lg:py-16">
      <Breadcrumbs items={[{ label: t("title"), href: "/sobre" }]} locale={locale} />
      <header className="mb-10">
        <p className="eyebrow">{t("title")}</p>
        <h1 className="display mt-2 text-4xl text-signal lg:text-5xl">{page?.title ?? t("title")}</h1>
        {!page && <p className="mt-3 text-mute">{t("subtitle")}</p>}
      </header>
      {page?.body && (
        <article
          className="prose-ud"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(page.body) }}
        />
      )}
    </div>
  );
}
