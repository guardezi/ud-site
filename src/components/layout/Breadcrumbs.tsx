import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { AppPathname } from "@/i18n/routing";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbLd } from "@/lib/seo/jsonld";
import { canonical } from "@/lib/seo/canonical";
import type { Locale } from "@/i18n/config";

export type CrumbItem = {
  label: string;
  href: AppPathname;
  params?: Record<string, string>;
};

type Props = {
  items: CrumbItem[];
  locale: Locale;
};

export function Breadcrumbs({ items, locale }: Props) {
  const t = useTranslations("breadcrumbs");

  const ldItems = [
    { name: t("home"), url: canonical("/", locale) },
    ...items.map((c) => ({ name: c.label, url: canonical(c.href, locale, c.params) })),
  ];

  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-4 text-xs">
        <ol className="flex flex-wrap items-center gap-1 text-mute">
          <li>
            <Link href="/" className="hover:text-signal uppercase tracking-[0.18em]">
              {t("home")}
            </Link>
          </li>
          {items.map((c, index) => {
            const isLast = index === items.length - 1;
            return (
              <li key={`${c.href}-${index}`} className="flex items-center gap-1">
                <ChevronRight className="size-3 text-faint" aria-hidden />
                {isLast ? (
                  <span className="text-signal uppercase tracking-[0.18em]">{c.label}</span>
                ) : (
                  <Link
                    href={{ pathname: c.href, params: c.params } as never}
                    className="hover:text-signal uppercase tracking-[0.18em]"
                  >
                    {c.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <JsonLd data={breadcrumbLd(ldItems)} />
    </>
  );
}
