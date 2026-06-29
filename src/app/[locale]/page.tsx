import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { WPHomeSnapshot } from "@/components/home/WPHomeSnapshot";
import { buildMetadata } from "@/lib/seo/meta";
import type { Locale } from "@/i18n/config";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "brand" });
  return buildMetadata({
    href: "/",
    locale,
    title: `${t("name")} — ${t("tagline")}`,
    description: t("shortDescription"),
  });
}

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <WPHomeSnapshot />;
}
