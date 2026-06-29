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
  const t = await getTranslations({ locale, namespace: "categorias" });
  return buildMetadata({
    href: "/categorias",
    locale,
    title: t("title"),
    description: t("subtitle"),
  });
}

export default async function CategoriasPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <WPPageSnapshot slug="categorias" />;
}
