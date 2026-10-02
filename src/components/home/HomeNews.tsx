import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { UDImage } from "@/components/ui/UDImage";
import type { StaticPathname } from "@/lib/routes";
import type { HomeNewsSummary } from "@/lib/news/home-news";

/**
 * "Notícias": destaque grande à esquerda + lista à direita, tag de categoria
 * e botão "Todas as notícias". Classes `index__news*` do tema legado.
 * Dados: collection `news` (`listHomeNews`), mesma de /noticias.
 */
export type HomeNewsItem = {
  slug: string;
  title: string;
  /** Slug da categoria (`noticia`, `historia`…); rótulo via i18n. */
  category: string | null;
  /** Path do Storage da capa. */
  imagePath: string | null;
};

export type HomeNewsData = {
  highlight: HomeNewsItem | null;
  others: HomeNewsItem[];
  allNewsHref: StaticPathname;
};

/** Mais recente vira destaque; as 2 seguintes vão pra coluna da direita. */
export function toHomeNewsData(news: HomeNewsSummary[]): HomeNewsData {
  const items = news.map((n) => ({ slug: n.slug, title: n.title, category: n.category, imagePath: n.coverImagePath }));
  return { highlight: items[0] ?? null, others: items.slice(1, 3), allNewsHref: "/noticias" };
}

function CategoryTag({ slug }: { slug: string | null }) {
  const t = useTranslations("homeSections");
  if (!slug) return null;
  const key = `newsCategory.${slug}`;
  const label = t.has(key) ? t(key) : slug.charAt(0).toUpperCase() + slug.slice(1);
  return <span className="index__news-category">{label}</span>;
}

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
                    <UDImage
                      src={data.highlight.imagePath}
                      alt=""
                      baseVariant="high"
                      sizes="(min-width: 1080px) 780px, 100vw"
                    />
                  </div>
                  <CategoryTag slug={data.highlight.category} />
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
                      <UDImage src={item.imagePath} alt="" baseVariant="medium" sizes="(min-width: 1080px) 300px, 100vw" />
                    </div>
                    <CategoryTag slug={item.category} />
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
