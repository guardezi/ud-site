/**
 * Rótulos de data no formato do site legado:
 * - intervalo da etapa: "16, 17 e 18 de Outubro" (pt/es) / "October 16, 17 and 18" (en);
 * - dia do cronograma: "Sexta - 16/10".
 *
 * Datas de etapa (stageHubs) e dias do cronograma (YYYY-MM-DD) são datas de
 * calendário gravadas em UTC; formatar sempre com timeZone UTC.
 */

const capitalize = (s: string) => (s ? s[0]!.toUpperCase() + s.slice(1) : s);

function fmt(locale: string, opts: Intl.DateTimeFormatOptions, d: Date): string {
  try {
    return new Intl.DateTimeFormat(locale, { ...opts, timeZone: "UTC" }).format(d);
  } catch {
    return new Intl.DateTimeFormat("pt-BR", { ...opts, timeZone: "UTC" }).format(d);
  }
}

function listFormat(locale: string, items: string[]): string {
  try {
    return new Intl.ListFormat(locale, { type: "conjunction" }).format(items);
  } catch {
    return items.join(", ");
  }
}

/** "16, 17 e 18 de Outubro"; meses diferentes → "30 de Setembro a 2 de Outubro" no formato do Intl. */
export function stageDatesLabel(start: Date | null, end: Date | null, locale: string): string {
  const s = start ?? end;
  if (!s) return "";
  const e = end && start && end.getTime() >= start.getTime() ? end : s;
  const days: Date[] = [];
  for (let t = s.getTime(); t <= e.getTime() && days.length < 10; t += 24 * 60 * 60 * 1000) {
    days.push(new Date(t));
  }
  const sameMonth = s.getUTCMonth() === e.getUTCMonth() && s.getUTCFullYear() === e.getUTCFullYear();
  if (!sameMonth) {
    const a = fmt(locale, { day: "numeric", month: "long" }, s);
    const b = fmt(locale, { day: "numeric", month: "long" }, e);
    return `${a} – ${b}`;
  }
  const month = capitalize(fmt(locale, { month: "long" }, s));
  const list = listFormat(locale, days.map((d) => String(d.getUTCDate())));
  return locale.startsWith("en") ? `${month} ${list}` : `${list} de ${month}`;
}

/** "Sexta - 16/10" a partir de "YYYY-MM-DD". */
export function scheduleDayLabel(day: string, locale: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return day;
  const weekday = capitalize(fmt(locale, { weekday: "long" }, d).replace(/-feira$/i, ""));
  const dm = fmt(locale, { day: "2-digit", month: "2-digit" }, d);
  return `${weekday} - ${dm}`;
}
