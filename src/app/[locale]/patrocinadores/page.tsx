import type { Metadata } from "next";
import type { ReactNode } from "react";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BackArrow, CheckItem } from "@/components/sponsors/SponsorsUi";
import { buildMetadata } from "@/lib/seo/meta";
import type { Locale } from "@/i18n/config";

/**
 * "Seja um patrocinador" — mesma página do site legado
 * (ultimatedrift.com.br/patrocinadores): conteúdo institucional fixo (i18n
 * `patrocinadores.*`) com as classes `sponsors__*` do tema.
 *
 * O formulário "Conte com a gente" do legado (nome da empresa, email,
 * telefone, CNPJ → e-mail via admin-ajax do WordPress) ficou de fora até
 * definirmos pra onde o lead vai — ver PR.
 */
export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "patrocinadores" });
  return buildMetadata({
    href: "/patrocinadores",
    locale,
    title: t("title"),
    description: t("subtitle"),
  });
}

const green = (chunks: ReactNode) => <span className="text--green">{chunks}</span>;

export default async function PatrocinadoresPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("patrocinadores");
  const imageAlt = t("imageAlt");

  return (
    <section className="sponsors">
      <div className="wrapper">
        <Link href="/" className="ui__title" aria-label={t("back")}>
          <BackArrow />
          <h1>{t("title")}</h1>
        </Link>
        <div className="sponsors__content">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/theme/img/logo-light2.png" alt="" className="sponsors__bg" />

          <div className="row align-items-center justify-content-between">
            <div className="col-lg-5">
              <h2 className="sponsors__title">{t.rich("heroTitle", { green })}</h2>
            </div>
            <div className="col-lg-6">
              <p className="sponsors__text">{t("heroText")}</p>
            </div>

            <div className="col-12">
              <h2 className="sponsors__title-center">{t("whyTitle")}</h2>
            </div>
            <div className="col-lg-6">
              <p className="sponsors__text">{t("whyText")}</p>
              <h3 className="sponsors__items-title">{t("reachTitle")}</h3>
              {(["reach1", "reach2", "reach3", "reach4", "reach5"] as const).map((k) => (
                <CheckItem key={k}>{t.rich(k, { green })}</CheckItem>
              ))}
            </div>
            <div className="col-lg-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/theme/img/sponsors-1.png" alt={imageAlt} className="sponsors__img" />
            </div>
            <div className="col-12">
              <p className="sponsors__text-center">
                {t("broadcastText")}
                <br />
                <span className="text--green">{t("broadcastHighlight")}</span>
              </p>
            </div>

            <div className="col-12">
              <h2 className="sponsors__title-center">{t("partnershipTitle")}</h2>
            </div>
            <div className="col-md-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/theme/img/sponsors-2.png" alt={imageAlt} className="sponsors__img" />
            </div>
            <div className="col-md-6">
              <div className="sponsors__items-title">{t("partnershipIntro")}</div>
              <div className="sponsors__items-highlight text--green">{t("annualTitle")}</div>
              <div className="sponsors__items-title">{t("annualText")}</div>
              {(["annual1", "annual2", "annual3", "annual4"] as const).map((k) => (
                <CheckItem key={k}>
                  <span className="text--green">{t(k)}</span>
                </CheckItem>
              ))}
            </div>
            <div className="col-md-6">
              <div className="sponsors__items-highlight text--yellow">{t("stageTitle")}</div>
              <div className="sponsors__items-title">{t("stageText")}</div>
              {(["stage1", "stage2", "stage3", "stage4"] as const).map((k) => (
                <CheckItem key={k} tone="yellow">
                  <span className="text--yellow">{t(k)}</span>
                </CheckItem>
              ))}
            </div>
            <div className="col-md-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/theme/img/sponsors-3.png" alt={imageAlt} className="sponsors__img" />
            </div>

            <div className="col-md-6">
              <h2 className="sponsors__big-title">{t.rich("impactTitle", { green })}</h2>
            </div>
            <div className="col-md-5">
              <p className="sponsors__text sponsors__bottom-text">{t("impactText")}</p>
            </div>

            <div className="col-12">
              <div className="ui__title">
                <h2>{t("contactTitle")}</h2>
              </div>
            </div>
            <div className="col-md-6">
              <div className="sponsors__text">
                {t("contactText")}
                <br />
                {t("contactClosing")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
