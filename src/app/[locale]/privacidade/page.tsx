import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getContentPage } from "@/lib/contentPages/queries";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { buildMetadata } from "@/lib/seo/meta";
import { renderMarkdown } from "@/lib/utils/markdown";
import type { Locale } from "@/i18n/config";

export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacidade" });
  return buildMetadata({
    href: "/privacidade",
    locale,
    title: t("title"),
    description: t("title"),
  });
}

export default async function PrivacidadePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("privacidade");
  const page = await getContentPage("privacidade", locale);

  return (
    <div className="mx-auto max-w-narrow px-4 py-12 lg:px-8 lg:py-16">
      <Breadcrumbs items={[{ label: t("title"), href: "/privacidade" }]} locale={locale} />
      <h1 className="display mb-8 text-4xl text-signal lg:text-5xl">{page?.title ?? t("title")}</h1>
      {page?.body && (
        <article className="prose-ud" dangerouslySetInnerHTML={{ __html: renderMarkdown(page.body) }} />
      )}
    </div>
  );
}
