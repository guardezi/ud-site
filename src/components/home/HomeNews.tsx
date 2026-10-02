import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { StaticPathname } from "@/lib/routes";

/**
 * "Notícias": destaque grande à esquerda + lista à direita, tag de categoria
 * e botão "Todas as notícias". Classes `index__news*` do tema legado.
 */
export type HomeNewsItem = {
  slug: string;
  title: string;
  category: string;
  imageSrc: string;
};

export type HomeNewsData = {
  highlight: HomeNewsItem | null;
  others: HomeNewsItem[];
  allNewsHref: StaticPathname;
};

function NewsLink({ item, children }: { item: HomeNewsItem; children: React.ReactNode }) {
  return (
    <Link href={{ pathname: "/noticias/[slug]", params: { slug: item.slug } }} className="index__news-link">
      {children}
    </Link>
  );
}

export function HomeNews({ data }: { data: HomeNewsData }) {
  const t = useTranslations("homeSections");
  if (!data.highlight && data.others.length === 0) return null;

  return (
    <section className="index__news">
      <div className="wrapper">
        <h2 className="ui__title">{t("news")}</h2>
        <div className="index__news-container">
          {data.highlight && (
            <div className="index__news-col-left">
              <div className="index__news-left">
                <NewsLink item={data.highlight}>
                  <div className="index__news-highlight-img">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={data.highlight.imageSrc} alt="" loading="lazy" />
                  </div>
                  <span className="index__news-category">{data.highlight.category}</span>
                  <h3 className="text-[32px] leading-tight">{data.highlight.title}</h3>
                </NewsLink>
              </div>
            </div>
          )}
          <div className="index__news-col-right">
            <div className="index__news-right">
              {data.others.map((item) => (
                <div key={item.slug} className="index__news-small mb-[30px]">
                  <NewsLink item={item}>
                    <div className="index__news-img-small">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.imageSrc} alt="" loading="lazy" />
                    </div>
                    <span className="index__news-category">{item.category}</span>
                    <h3 className="text-[26px] leading-snug">{item.title}</h3>
                  </NewsLink>
                </div>
              ))}
            </div>
          </div>
        </div>
        <Link href={data.allNewsHref} className="index__circuit-calendar button__white">
          {t("allNews")}
        </Link>
      </div>
    </section>
  );
}
