import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Mail, Instagram, Youtube, Facebook } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { buildMetadata } from "@/lib/seo/meta";
import type { Locale } from "@/i18n/config";

export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contato" });
  return buildMetadata({
    href: "/contato",
    locale,
    title: t("title"),
    description: t("subtitle"),
  });
}

export default async function ContatoPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contato");

  return (
    <div className="mx-auto max-w-narrow px-4 py-12 lg:px-8 lg:py-16">
      <Breadcrumbs items={[{ label: t("title"), href: "/contato" }]} locale={locale} />

      <header className="mb-10">
        <p className="eyebrow">{t("title")}</p>
        <h1 className="display mt-2 text-4xl text-signal lg:text-5xl">{t("title")}</h1>
        <p className="mt-3 text-mute">{t("subtitle")}</p>
      </header>

      <div className="space-y-6">
        <div className="rounded border border-rail bg-panel/30 p-5">
          <h2 className="eyebrow mb-2">{t("email")}</h2>
          <a href="mailto:contato@ultimatedrift.com.br" className="flex items-center gap-2 text-signal hover:text-drift">
            <Mail className="size-4" aria-hidden />
            contato@ultimatedrift.com.br
          </a>
        </div>

        <div className="rounded border border-rail bg-panel/30 p-5">
          <h2 className="eyebrow mb-3">{t("social")}</h2>
          <div className="flex gap-3">
            <a
              href="https://www.instagram.com/ultimatedriftbr"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="inline-flex size-10 items-center justify-center rounded border border-rail text-mute hover:text-drift hover:border-drift"
            >
              <Instagram className="size-4" aria-hidden />
            </a>
            <a
              href="https://www.youtube.com/@ultimatedrift"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="YouTube"
              className="inline-flex size-10 items-center justify-center rounded border border-rail text-mute hover:text-drift hover:border-drift"
            >
              <Youtube className="size-4" aria-hidden />
            </a>
            <a
              href="https://www.facebook.com/ultimatedriftbr"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="inline-flex size-10 items-center justify-center rounded border border-rail text-mute hover:text-drift hover:border-drift"
            >
              <Facebook className="size-4" aria-hidden />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
