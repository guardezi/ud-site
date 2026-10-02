/**
 * Rótulos de data/título das etapas no formato do site legado
 * ("16, 17 e 18 de Outubro", "Sexta - 16/10", "11ª e 12ª Etapa"). Datas
 * chegam como dia-calendário "YYYY-MM-DD" (fuso de Brasília) — formatadas
 * em UTC pra não deslocar o dia.
 */

function capitalize(s: string): string {
  return s ? s.charAt(0).toLocaleUpperCase() + s.slice(1) : s;
}

function asUtcDate(day: string): Date {
  return new Date(`${day}T12:00:00Z`);
}

function listFormat(locale: string, items: string[]): string {
  try {
    return new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(items);
  } catch {
    return items.join(", ");
  }
}

/**
 * "16, 17 e 18 de Outubro" / "30 de Setembro e 01 de Outubro" (pt-BR);
 * `monthTemplate` vem do i18n com `{days}` e `{month}`.
 */
export function formatStageDays(days: string[], locale: string, monthTemplate: string): string {
  if (days.length === 0) return "";
  const groups: Array<{ month: string; days: string[] }> = [];
  for (const day of days) {
    const d = asUtcDate(day);
    const month = capitalize(new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(d));
    const dd = day.slice(8, 10);
    const last = groups[groups.length - 1];
    if (last && last.month === month) last.days.push(dd);
    else groups.push({ month, days: [dd] });
  }
  return listFormat(
    locale,
    groups.map((g) => monthTemplate.replace("{days}", listFormat(locale, g.days)).replace("{month}", g.month)),
  );
}

/** "Sexta - 16/10" (pt-BR), "Friday - 10/16" (en-US). */
export function formatScheduleDay(day: string, locale: string): string {
  const d = asUtcDate(day);
  const weekday = capitalize(
    new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }).format(d).replace(/-feira$/i, ""),
  );
  const date = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(d);
  return `${weekday} - ${date}`;
}

/** "11ª e 12ª" (pt/es) ou "11 and 12" (en). */
export function formatStageNumbers(numbers: number[], locale: string): string {
  const suffix = locale.startsWith("en") ? "" : "ª";
  return listFormat(
    locale,
    numbers.map((n) => `${n}${suffix}`),
  );
}
