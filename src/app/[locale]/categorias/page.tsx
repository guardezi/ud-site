import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link, getPathname } from "@/i18n/navigation";
import { BackTitle } from "@/components/categorias/BackTitle";
import { CATEGORIES } from "@/components/categorias/categories";
import { buildMetadata } from "@/lib/seo/meta";
import type { Locale } from "@/i18n/config";

// Conteúdo institucional fixo (i18n + arte do tema) — não lê Firestore.
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

const ArrowIcon = () => (
  <svg
    className="ui__icon"
    width="15"
    height="27"
    viewBox="0 0 15 27"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    <path
      d="M13.5208 26.7703C13.8818 27.1025 14.4396 27.0692 14.7678 26.7039C15.096 26.3386 15.0632 25.774 14.7022 25.4419L2.00202 13.8182C1.67385 13.5193 1.67385 13.0875 2.00202 12.7886L14.7022 1.5634C15.0632 1.23129 15.096 0.666705 14.8006 0.301387C14.4725 -0.0639308 13.9146 -0.0971413 13.5536 0.201755L0.853422 11.4602C-0.262355 12.4565 -0.295172 14.1171 0.820606 15.1466L13.5208 26.7703Z"
      fill="#54F251"
    />
  </svg>
);

export default async function CategoriasPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("categorias");

  return (
    <section className="category">
      <div className="wrapper">
        <BackTitle fallbackHref={getPathname({ href: "/", locale })}>{t("title")}</BackTitle>

        {CATEGORIES.map((c, i) => {
          // Zigue-zague do layout legado: no desktop a 2ª categoria (Master)
          // fica com a imagem à direita.
          const flipped = i % 2 === 1;
          return (
            <div key={c.slug} className="category__content" id={c.slug}>
              <div className="row align-items-center">
                <div className={flipped ? "col-md-6 order-md-2" : "col-md-6"}>
                  <div className="category__left" data-animate="slide-left">
                    <div className={`category__img-box category__${c.slug}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={c.image} alt="" className="category__img" />
                      <h2 className="category__label">{c.label}</h2>
                    </div>
                  </div>
                </div>
                <div className={flipped ? "col-md-6 order-md-1" : "col-md-6"}>
                  <div className="category__right" data-animate="slide-right">
                    <p className="category__text">{t(`items.${c.slug}`)}</p>
                    <Link
                      href={
                        c.classificationFilter
                          ? { pathname: "/classificacao", query: { categoria: c.classificationFilter } }
                          : "/classificacao"
                      }
                      className="category__link"
                    >
                      <ArrowIcon />
                      <span>{t("classification")}</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
