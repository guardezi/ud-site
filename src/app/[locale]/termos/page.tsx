import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { WPPageSnapshot } from "@/components/home/WPPageSnapshot";
import { buildMetadata } from "@/lib/seo/meta";
import type { Locale } from "@/i18n/config";

export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "termos" });
  return buildMetadata({
    href: "/termos",
    locale,
    title: t("title"),
    description: t("title"),
  });
}

export default async function TermosPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <WPPageSnapshot slug="termos-e-condicoes" />;
}
