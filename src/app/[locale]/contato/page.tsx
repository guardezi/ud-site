import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { BackTitle } from "@/components/contact/BackTitle";
import { ContactForm } from "@/components/contact/ContactForm";
import { CONTACT_EMAIL_TO } from "@/lib/contact/email";
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
                <p className="contact-description">
                  {t.rich("introDescription", {
                    email: CONTACT_EMAIL_TO,
                    mail: (chunks) => <a href={`mailto:${CONTACT_EMAIL_TO}`}>{chunks}</a>,
                  })}
                </p>
              </div>
              <ContactForm />
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
