import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { StaticPathname } from "@/lib/routes";

/**
 * "Seja um patrocinador": arte única (título, botão "Saiba mais" e colagem de
 * fotos já vêm desenhados na imagem, como no site legado). A imagem inteira
 * é o link. Classes `index__sponsors-top*` do tema legado.
 */
export type SponsorCalloutData = {
  imageSrc: string;
  href: StaticPathname;
};

/** Conteúdo estático (arte institucional do site legado em public/theme). */
export const SPONSOR_CALLOUT: SponsorCalloutData = {
  imageSrc: "/theme/img/index-patrocinadores.png",
  href: "/patrocinadores",
};

export function SponsorCallout({ data }: { data: SponsorCalloutData }) {
  const t = useTranslations("homeSections");
  return (
    <div className="index__sponsors-top">
      <Link href={data.href} className="index__sponsors-top-link" title={t("sponsorCallout")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={data.imageSrc} alt={t("sponsorCallout")} className="index__sponsors-top-img" />
      </Link>
    </div>
  );
}
