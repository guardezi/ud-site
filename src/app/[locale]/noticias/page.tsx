import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { listNews } from "@/lib/news/queries";
import { buildMetadata } from "@/lib/seo/meta";
import { UDImage } from "@/components/ui/UDImage";
import { ChevronIcon } from "@/components/noticias/ChevronIcon";
import type { Locale } from "@/i18n/config";

export const revalidate = 60;

/** Mesmo tamanho de página do arquivo do WP (6 cards, 3 por linha). */
const PAGE_SIZE = 6;
/** O WP corta o título do card em 47 caracteres + "...". */
const TITLE_MAX = 47;

type PageProps = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "noticias" });
  return buildMetadata({
    href: "/noticias",
    locale,
    title: t("title"),
    description: t("subtitle"),
  });
}

export default async function NoticiasPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const { page: pageStr } = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations("noticias");
  const requested = Math.max(1, Math.floor(Number(pageStr ?? "1")) || 1);
  const { items, total } = await listNews({ locale, limit: PAGE_SIZE, offset: (requested - 1) * PAGE_SIZE });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requested, totalPages);

  const categoryLabel = (slug: string | null) =>
    slug ? (t.has(`categories.${slug}`) ? t(`categories.${slug}`) : slug) : null;

  return (
    <section className="news">
      <div className="wrapper">
        <Link href="/" className="ui__title" data-animate="slide-bottom">
          <ChevronIcon className="ui__icon" width={15} height={27} />
          <h1 className="">{t("title")}</h1>
        </Link>

        {items.length === 0 ? (
          <p style={{ padding: "60px 0", textAlign: "center", color: "#9b9b9b" }}>{t("empty")}</p>
        ) : (
          <>
            <div className="news-content row">
              {items.map((n) => {
                const category = categoryLabel(n.category);
                return (
                  <div key={n.id} className="col-md-4" data-animate="slide-bottom">
                    <div className="news__small">
                      <Link
                        href={{ pathname: "/noticias/[slug]", params: { slug: n.slug } }}
                        className="news__link"
                      >
                        <div className="news__img-small">
                          {n.coverImagePath ? (
                            <UDImage
                              src={n.coverImagePath}
                              alt=""
                              baseVariant="small"
                              srcsetPreset="responsive"
                              sizes="(max-width: 300px) 100vw, 300px"
                              width={300}
                              height={200}
                            />
                          ) : (
                            <div style={{ width: "100%", aspectRatio: "3/2", background: "#1f1f24" }} />
                          )}
                        </div>
                        {category && <span className="news__category">{category}</span>}
                        <h3 title={n.title}>{truncate(n.title, TITLE_MAX)}</h3>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <Pagination page={page} totalPages={totalPages} labels={{ prev: t("prev"), next: t("next") }} />
            )}
          </>
        )}
      </div>
    </section>
  );
}

function pageHref(p: number) {
  // Página 1 sem query (canônica), igual ao WP (/noticias/ vs /noticias/page/N/).
  return (p === 1 ? { pathname: "/noticias" } : { pathname: "/noticias", query: { page: String(p) } }) as never;
}

function Pagination({
  page,
  totalPages,
  labels,
}: {
  page: number;
  totalPages: number;
  labels: { prev: string; next: string };
}) {
  return (
    <div className="pagination" data-animate="slide-bottom">
      {page > 1 && (
        <Link href={pageHref(page - 1)} className="prev page-numbers" aria-label={labels.prev}>
          <ChevronIcon className="pagination__prev" width={5} height={17} />
        </Link>
      )}
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) =>
        p === page ? (
          <span key={p} aria-current="page" className="page-numbers current">
            {p}
          </span>
        ) : (
          <Link key={p} href={pageHref(p)} className="page-numbers">
            {p}
          </Link>
        ),
      )}
      {page < totalPages && (
        <Link href={pageHref(page + 1)} className="next page-numbers" aria-label={labels.next}>
          <ChevronIcon className="pagination__next" width={10} height={17} />
        </Link>
      )}
    </div>
  );
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n) + "...";
}
