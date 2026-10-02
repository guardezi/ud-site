import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { BackTitle } from "@/components/contact/BackTitle";
import { ContactForm } from "@/components/contact/ContactForm";
import { isEnabled } from "@/lib/feature-flags/server";
import { CONTACT_FORM_FLAG } from "@/lib/contact/schema";
import { buildMetadata } from "@/lib/seo/meta";
import type { Locale } from "@/i18n/config";

// A flag do Remote Config tem cache de 60s no server; revalida a página no mesmo ritmo.
export const revalidate = 60;

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
  const formEnabled = await isEnabled(CONTACT_FORM_FLAG);

  return (
    <section className="contato">
      <div className="wrapper">
        <BackTitle>
          <h1>{t("title")}</h1>
        </BackTitle>
        <div className="contact__content">
          <div className="row align-items-center justify-content-between">
            <div className="col-md-6" data-animate="slide-left">
              <div className="contact-intro">
                <h2 className="contact-title">{t("introTitle")}</h2>
                <p className="contact-description">{t("introDescription")}</p>
              </div>
              <ContactForm enabled={formEnabled} />
            </div>
            <div className="col-md-5" data-animate="slide-right">
              {/* eslint-disable-next-line @next/next/no-img-element -- SVG estático do tema */}
              <img src="/theme/svg/ud-logo.svg" alt={t("logoAlt")} className="contact__logo" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
