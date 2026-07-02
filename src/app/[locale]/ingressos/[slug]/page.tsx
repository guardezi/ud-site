import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getPublishedEventBySlug } from "@/lib/ticketing/queries";
import { buildMetadata } from "@/lib/seo/meta";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { formatDateRange } from "@/lib/format";
import { CheckoutForm, type CheckoutType } from "./CheckoutForm";
import type { Locale } from "@/i18n/config";

export const revalidate = 60;

type PageParams = Promise<{ locale: Locale; slug: string }>;

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { locale, slug } = await params;
  const event = await getPublishedEventBySlug(slug).catch(() => null);
  const t = await getTranslations({ locale, namespace: "ingressos" });
  if (!event) return {};
  return buildMetadata({
    href: "/ingressos/[slug]",
    locale,
    params: { slug },
    title: event.name,
    description: t("catalog.subtitle"),
    image: event.heroImageUrl ?? undefined,
  });
}

export default async function IngressoEventPage({ params }: { params: PageParams }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ingressos");
  const event = await getPublishedEventBySlug(slug);
  if (!event) notFound();

  // Projeta só o que o form client precisa — evita cruzar Date/estoque à toa.
  const types: CheckoutType[] = event.ticketTypes.map((ty) => ({
    id: ty.id,
    name: ty.name,
    description: ty.description,
    lots: ty.lots.map((lot) => ({
      id: lot.id,
      name: lot.name,
      priceCents: lot.priceCents,
      available: lot.available,
      maxPerOrder: lot.maxPerOrder,
    })),
  }));

  return (
    <div className="mx-auto max-w-wide px-4 py-12 lg:px-8 lg:py-16">
      <Breadcrumbs
        items={[
          { label: t("catalog.title"), href: "/ingressos" },
          { label: event.name, href: "/ingressos/[slug]", params: { slug } },
        ]}
        locale={locale}
      />

      <header className="grid gap-6 lg:grid-cols-[1.4fr,1fr]">
        <div>
          {(event.startsAt || event.endsAt) && (
            <p className="eyebrow">{formatDateRange(event.startsAt, event.endsAt, locale)}</p>
          )}
          <h1 className="display mt-2 text-4xl text-signal lg:text-5xl">{event.name}</h1>
          {event.venue && <p className="mt-3 text-mute">{event.venue}</p>}
        </div>
        {event.heroImageUrl && (
          <div className="relative aspect-[16/9] overflow-hidden rounded border border-rail">
            <Image
              src={event.heroImageUrl}
              alt={event.name}
              fill
              priority
              sizes="(min-width: 1024px) 500px, 100vw"
              className="object-cover"
              unoptimized
            />
          </div>
        )}
      </header>

      <div className="mt-10 max-w-2xl">
        {types.length === 0 ? (
          <p className="rounded border border-rail px-4 py-8 text-center text-mute">
            {t("event.unavailable")}
          </p>
        ) : (
          <CheckoutForm eventId={event.id} locale={locale} currency={event.currency} types={types} />
        )}
      </div>
    </div>
  );
}
