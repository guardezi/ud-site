/**
 * Helpers de formatação compartilhados. Usam Intl nativo do Node/browser
 * com locale dinâmico — sem libs externas.
 */
export function formatDate(date: Date | null | undefined, locale: string, opts?: Intl.DateTimeFormatOptions): string {
  if (!date) return "";
  return new Intl.DateTimeFormat(locale, opts ?? { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export function formatDateRange(start: Date | null | undefined, end: Date | null | undefined, locale: string): string {
  if (!start && !end) return "";
  if (start && end) {
    const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
    if (sameMonth) {
      const day = (d: Date) => new Intl.DateTimeFormat(locale, { day: "2-digit" }).format(d);
      const monthYear = new Intl.DateTimeFormat(locale, { month: "short", year: "numeric" }).format(end);
      return `${day(start)}–${day(end)} ${monthYear}`;
    }
    return `${formatDate(start, locale)} → ${formatDate(end, locale)}`;
  }
  return formatDate(start ?? end, locale);
}

export function formatNumber(n: number | null | undefined, locale: string): string {
  if (n == null) return "";
  return new Intl.NumberFormat(locale).format(n);
}
