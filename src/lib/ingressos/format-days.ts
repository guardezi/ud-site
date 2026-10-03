/**
 * Datas da etapa no formato do site legado: "16, 17 e 18 de Outubro"
 * (pt-BR), "October 16, 17 and 18" (en), "16, 17 y 18 de Octubre" (es).
 *
 * As datas de `events` são gravadas como meia-noite em Brasília — formata
 * sempre em America/Sao_Paulo pra não escorregar um dia no servidor (UTC).
 * Eventos longos (> 5 dias) ou em meses diferentes viram intervalo.
 */
const TZ = "America/Sao_Paulo";
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_LISTED_DAYS = 5;

function part(d: Date, locale: string, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(locale, { timeZone: TZ, ...opts }).format(d);
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toLocaleUpperCase() + s.slice(1) : s;
}

function list(items: string[], locale: string): string {
  try {
    return new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(items);
  } catch {
    return items.join(", ");
  }
}

export function formatEventDays(start: Date | null, end: Date | null, locale: string): string {
  const s = start ?? end;
  const e = end ?? start;
  if (!s || !e) return "";
  const isEn = locale.startsWith("en");
  const month = (d: Date) => capitalize(part(d, locale, { month: "long" }));
  const day = (d: Date) => part(d, locale, { day: "numeric" });
  const sameMonth = part(s, locale, { month: "numeric", year: "numeric" }) === part(e, locale, { month: "numeric", year: "numeric" });
  const span = Math.round((e.getTime() - s.getTime()) / DAY_MS);

  if (sameMonth && span >= 0 && span < MAX_LISTED_DAYS) {
    const days: string[] = [];
    for (let i = 0; i <= span; i++) days.push(day(new Date(s.getTime() + i * DAY_MS)));
    const unique = [...new Set(days)];
    return isEn ? `${month(s)} ${list(unique, locale)}` : `${list(unique, locale)} de ${month(s)}`;
  }
  if (isEn) return `${month(s)} ${day(s)} – ${month(e)} ${day(e)}`;
  const joiner = locale.startsWith("es") ? "al" : "a";
  return `${day(s)} de ${month(s)} ${joiner} ${day(e)} de ${month(e)}`;
}
