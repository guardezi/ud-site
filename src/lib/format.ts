/**
 * Helpers de formatação compartilhados. Usam Intl nativo do Node/browser.
 *
 * IMPORTANTE: `unstable_cache` do Next serializa retornos em JSON. Date vira
 * string ISO no consumer mesmo que o tipo TS diga Date. Estas funções aceitam
 * `Date | string | number` e fazem coerce defensivo.
 */

type DateLike = Date | string | number | null | undefined;

function toDate(v: DateLike): Date | null {
  if (v == null) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  // Pode ser um plain object `{ seconds, nanoseconds }` que sobreviveu serialization
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    const seconds = typeof o.seconds === "number" ? o.seconds : typeof o._seconds === "number" ? o._seconds : null;
    if (seconds != null) {
      const d = new Date(seconds * 1000);
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }
  return null;
}

export function formatDate(date: DateLike, locale: string, opts?: Intl.DateTimeFormatOptions): string {
  const d = toDate(date);
  if (!d) return "";
  return new Intl.DateTimeFormat(locale, opts ?? { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

export function formatDateRange(start: DateLike, end: DateLike, locale: string): string {
  const s = toDate(start);
  const e = toDate(end);
  if (!s && !e) return "";
  if (s && e) {
    const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
    if (sameMonth) {
      const day = (d: Date) => new Intl.DateTimeFormat(locale, { day: "2-digit" }).format(d);
      const monthYear = new Intl.DateTimeFormat(locale, { month: "short", year: "numeric" }).format(e);
      return `${day(s)}–${day(e)} ${monthYear}`;
    }
    return `${formatDate(s, locale)} → ${formatDate(e, locale)}`;
  }
  return formatDate(s ?? e, locale);
}

export function formatNumber(n: number | null | undefined, locale: string): string {
  if (n == null) return "";
  return new Intl.NumberFormat(locale).format(n);
}

/** Tempo em ms a partir de qualquer shape, ou null. Usado em filtros/ordenação. */
export function dateLikeMs(v: DateLike): number | null {
  const d = toDate(v);
  return d ? d.getTime() : null;
}
