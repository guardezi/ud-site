import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { listNews } from "@/lib/news/queries";
import { buildMetadata } from "@/lib/seo/meta";
import type { Locale } from "@/i18n/config";

export const revalidate = 60;

const PAGE_SIZE = 12;

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
  const page = Math.max(1, Number(pageStr ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const { items } = await listNews({ locale, limit: PAGE_SIZE, offset });

  // Total real pra paginação: fetch sem offset/limit baixo
  const { total: estimated } = await listNews({ locale, limit: 100, offset: 0 });
  const totalPages = Math.max(1, Math.ceil(estimated / PAGE_SIZE));

  return (
    <section className="news">
      <div className="wrapper">
        <div className="ui__title" data-animate="slide-bottom">
          <h1 className="">{t("title")}</h1>
        </div>

        {items.length === 0 ? (
          <p style={{ padding: "60px 0", textAlign: "center", color: "#9b9b9b" }}>{t("empty")}</p>
        ) : (
          <>
            <div className="news-content row">
              {items.map((n) => (
                <div key={n.id} className="col-md-4" data-animate="slide-bottom">
                  <div className="news__small">
                    <Link
                      href={{ pathname: "/noticias/[slug]", params: { slug: n.slug } }}
                      className="news__link"
                    >
                      <div className="news__img-small">
                        {n.coverImageUrl ? (
                          <img
                            width={300}
                            height={200}
                            src={n.coverImageUrl}
                            alt={n.title}
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div style={{ width: "100%", aspectRatio: "3/2", background: "#1f1f24" }} />
                        )}
                      </div>
                      {n.category && <span className="news__category">{n.category}</span>}
                      <h3>{truncate(n.title, 60)}</h3>
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="pagination" data-animate="slide-bottom">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <PaginationLink key={p} page={p} currentPage={page} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function PaginationLink({ page, currentPage }: { page: number; currentPage: number }) {
  if (page === currentPage) {
    return (
      <span aria-current="page" className="page-numbers current">
        {page}
      </span>
    );
  }
  return (
    <Link
      href={page === 1 ? { pathname: "/noticias" } : { pathname: "/noticias", query: { page: String(page) } } as never}
      className="page-numbers"
    >
      {page}
    </Link>
  );
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n).trimEnd() + "...";
}
