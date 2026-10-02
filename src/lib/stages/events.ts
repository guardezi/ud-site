import "server-only";
import { unstable_cache } from "next/cache";
import { adminDb } from "@/lib/firebase/admin";
import { getCircuitById, type PublicCircuit } from "@/lib/circuits/queries";
import { getCurrentChampionshipId } from "@/lib/championship/queries";
import { num, str, tsToDate } from "@/lib/firestore-utils";
import { slugify } from "@/lib/utils/slug";

/**
 * "Etapas" do site = fim de semana de evento, como no WordPress legado
 * ("1ª e 2ª Etapa – Mega Space (Santa Luzia - MG)"). Não existe um doc único
 * pra isso no Firestore; o card/página é montado juntando 3 fontes, todas
 * as mesmas que o ud-app/ud-backoffice usam:
 *
 * 1. `championships/{cid}/stages/{stageId}` — etapas oficiais do campeonato
 *    vigente (`settings/publicRound.championshipId`), publicadas pelo
 *    ud-sistema (Pub/Sub → functions do ud-app). Campos: `date`, `city`,
 *    `stageNumber`, `status` ("deletada" = descartada). É a espinha da lista:
 *    etapas consecutivas na mesma cidade (≤ 3 dias) formam um fim de semana.
 * 2. `stageHubs/{id}` — módulo "Eventos" do ud-backoffice (/events/[id]),
 *    um hub por etapa, ligado por `stageId`: `circuitId`, `posterImagePath`,
 *    `liveUrl`, `regulationUrl`, `wildcardFormUrl`, `startDate`/`endDate`.
 *    O app lê o hub do mesmo jeito (`EventHubService.getHubByStageId`).
 * 3. `events/{id}` — aba Ingressos do app (CreateTicketService): arte de venda
 *    (`imageUrl`), link de compra (`linkUrl`, `isSelling`), `place`, datas.
 *    NÃO há vínculo explícito com etapa/hub: o casamento é por sobreposição
 *    de datas (± 2 dias). Evento sem etapa casada (ex. etapa futura que o
 *    ud-sistema ainda não criou) vira um fim de semana próprio.
 *
 * O cronograma vem de `championships/{cid}/stages/{sid}/schedule` (fonte
 * nova do app/backoffice), só itens com `audience` contendo "publico". O
 * campo `stageHubs.timetable` é legado (o backoffice nem edita mais).
 */

const TZ = "America/Sao_Paulo";
const DAY_MS = 24 * 60 * 60 * 1000;

export type StageEventSummary = {
  /** Chave estável interna (não exposta em URL). */
  key: string;
  slug: string;
  championshipId: number | null;
  /** Números das etapas do campeonato (ex. [9, 10]); vazio se só existe o evento de ingresso. */
  stageNumbers: number[];
  stageIds: number[];
  /** Dias exibidos (YYYY-MM-DD, fuso de Brasília), do primeiro ao último. */
  days: string[];
  startDay: string | null;
  endDay: string | null;
  /** "Piracicaba - SP" — cidade do circuito, senão `events.place`, senão `stages.city`. */
  city: string | null;
  /** Nome do circuito (`circuits.name`), quando o hub aponta um. */
  venue: string | null;
  /** Arte: `events.imageUrl` (arte de venda), senão `stageHubs.posterImagePath`. Path do Storage ou URL. */
  artPath: string | null;
  /** Link de compra externo (`events.linkUrl`) só com `isSelling` e etapa não encerrada. */
  ticketUrl: string | null;
  isUpcoming: boolean;
  circuitId: string | null;
  liveUrl: string | null;
  regulationUrl: string | null;
  wildcardFormUrl: string | null;
};

export type StageScheduleItem = {
  time: string;
  endTime: string | null;
  description: string;
  location: string | null;
  longDescription: string | null;
  externalUrl: string | null;
  category: string;
};

export type StageScheduleDay = { day: string; items: StageScheduleItem[] };

export type StageEventDetail = StageEventSummary & {
  circuit: PublicCircuit | null;
  schedule: StageScheduleDay[];
};

// ---------------------------------------------------------------------------
// Helpers de data (tudo em dia-calendário de Brasília, "YYYY-MM-DD")
// ---------------------------------------------------------------------------

const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });

function toDay(d: Date | null): string | null {
  return d ? dayFmt.format(d) : null;
}

function dayToMs(day: string): number {
  return Date.parse(`${day}T00:00:00Z`);
}

function addDays(day: string, n: number): string {
  return new Date(dayToMs(day) + n * DAY_MS).toISOString().slice(0, 10);
}

function dayDiff(a: string, b: string): number {
  return Math.round((dayToMs(b) - dayToMs(a)) / DAY_MS);
}

function daysBetween(start: string, end: string): string[] {
  const out: string[] = [];
  const n = Math.min(Math.max(dayDiff(start, end), 0), 10);
  for (let i = 0; i <= n; i++) out.push(addDays(start, i));
  return out;
}

function todayBrt(): string {
  return dayFmt.format(new Date());
}

/** "Nova Santa Rita - RS" / "Nova Santa Rita" → "nova-santa-rita" (sem UF). */
function cityKey(city: string | null): string {
  if (!city) return "";
  return slugify(city.split(/\s+-\s+|\//)[0] ?? city);
}

// ---------------------------------------------------------------------------
// Leitura bruta
// ---------------------------------------------------------------------------

type RawStage = { stageId: number; stageNumber: number | null; day: string; city: string | null };
type RawHub = {
  id: string;
  stageId: number | null;
  championshipId: number | null;
  circuitId: string | null;
  posterImagePath: string | null;
  startDay: string | null;
  endDay: string | null;
  liveUrl: string | null;
  regulationUrl: string | null;
  wildcardFormUrl: string | null;
};
type RawEvent = {
  id: string;
  place: string | null;
  startDay: string | null;
  endDay: string | null;
  imagePath: string | null;
  linkUrl: string | null;
  isSelling: boolean;
};

async function readStages(championshipId: number): Promise<RawStage[]> {
  const snap = await adminDb.collection("championships").doc(String(championshipId)).collection("stages").get();
  const out: RawStage[] = [];
  for (const doc of snap.docs) {
    const d = doc.data() as Record<string, unknown>;
    const status = (str(d.status) ?? "").toLowerCase();
    if (status === "deletada") continue;
    const day = toDay(tsToDate(d.date));
    const stageId = num(d.stageId) ?? num(doc.id);
    if (!day || stageId == null) continue;
    out.push({ stageId, stageNumber: num(d.stageNumber), day, city: str(d.city) });
  }
  return out.sort((a, b) => a.day.localeCompare(b.day) || (a.stageNumber ?? 0) - (b.stageNumber ?? 0));
}

async function readHubs(): Promise<RawHub[]> {
  const snap = await adminDb.collection("stageHubs").limit(300).get();
  return snap.docs.map((doc) => {
    const d = doc.data() as Record<string, unknown>;
    return {
      id: doc.id,
      stageId: num(d.stageId),
      championshipId: num(d.championshipId),
      circuitId: str(d.circuitId),
      posterImagePath: str(d.posterImagePath),
      startDay: toDay(tsToDate(d.startDate)),
      endDay: toDay(tsToDate(d.endDate)),
      liveUrl: str(d.liveUrl),
      regulationUrl: str(d.regulationUrl),
      wildcardFormUrl: str(d.wildcardFormUrl),
    };
  });
}

async function readEvents(): Promise<RawEvent[]> {
  const snap = await adminDb.collection("events").limit(300).get();
  return snap.docs.map((doc) => {
    const d = doc.data() as Record<string, unknown>;
    return {
      id: doc.id,
      place: str(d.place),
      startDay: toDay(tsToDate(d.startDate)),
      endDay: toDay(tsToDate(d.endDate)) ?? toDay(tsToDate(d.startDate)),
      imagePath: str(d.imageUrl),
      linkUrl: str(d.linkUrl),
      isSelling: d.isSelling === true,
    };
  });
}

// ---------------------------------------------------------------------------
// Agrupamento
// ---------------------------------------------------------------------------

type Group = {
  stages: RawStage[];
  hubs: RawHub[];
  event: RawEvent | null;
};

function groupRange(g: Group): [string, string] | null {
  const days: string[] = [];
  for (const s of g.stages) days.push(s.day);
  for (const h of g.hubs) {
    if (h.startDay) days.push(h.startDay);
    if (h.endDay) days.push(h.endDay);
  }
  if (g.event?.startDay) days.push(g.event.startDay);
  if (g.event?.endDay) days.push(g.event.endDay);
  if (days.length === 0) return null;
  days.sort();
  return [days[0]!, days[days.length - 1]!];
}

function overlaps(range: [string, string] | null, start: string | null, end: string | null, slack: number): boolean {
  if (!range || !start) return false;
  const e = end ?? start;
  return start <= addDays(range[1], slack) && e >= addDays(range[0], -slack);
}

function groupCityKey(g: Group): string {
  return cityKey(g.stages[0]?.city ?? g.event?.place ?? null);
}

function ordinalPrefix(nums: number[]): string {
  if (nums.length === 0) return "etapa";
  return `${nums.map((n) => `${n}a`).join("-e-")}-etapa`;
}

async function buildSummaries(): Promise<StageEventSummary[]> {
  const championshipId = await getCurrentChampionshipId();
  if (championshipId == null) return [];

  const [stages, hubs, events] = await Promise.all([readStages(championshipId), readHubs(), readEvents()]);

  // 1. Etapas consecutivas na mesma cidade (até 3 dias de distância) = um fim de semana.
  const groups: Group[] = [];
  for (const s of stages) {
    const last = groups[groups.length - 1];
    const prev = last?.stages[last.stages.length - 1];
    if (last && prev && cityKey(prev.city) === cityKey(s.city) && dayDiff(prev.day, s.day) <= 3) {
      last.stages.push(s);
    } else {
      groups.push({ stages: [s], hubs: [], event: null });
    }
  }

  // 2. Hubs do backoffice pelo stageId (mesmo vínculo do app). Hub do campeonato
  //    sem etapa correspondente (etapa ainda não criada) vira grupo próprio.
  const byStageId = new Map<number, Group>();
  for (const g of groups) for (const s of g.stages) byStageId.set(s.stageId, g);
  for (const h of hubs) {
    const g = h.stageId != null ? byStageId.get(h.stageId) : undefined;
    if (g) g.hubs.push(h);
    else if (h.championshipId === championshipId) {
      const hit = groups.find((x) => overlaps(groupRange(x), h.startDay, h.endDay, 0));
      if (hit) hit.hubs.push(h);
      else groups.push({ stages: [], hubs: [h], event: null });
    }
  }

  // 3. Eventos de ingresso por sobreposição de datas (± 2 dias); em empate,
  //    prefere o de mesma cidade. Sem par, vira fim de semana próprio se for
  //    do mesmo ano do campeonato.
  const seasonYear = stages[0]?.day.slice(0, 4) ?? todayBrt().slice(0, 4);
  const sortedEvents = [...events].sort((a, b) => (a.startDay ?? "").localeCompare(b.startDay ?? ""));
  for (const ev of sortedEvents) {
    if (!ev.startDay) continue;
    const candidates = groups.filter((g) => !g.event && overlaps(groupRange(g), ev.startDay, ev.endDay, 2));
    const sameCity = candidates.find((g) => groupCityKey(g) && groupCityKey(g) === cityKey(ev.place));
    const hit = sameCity ?? candidates[0];
    if (hit) hit.event = ev;
    else if (ev.startDay.slice(0, 4) === seasonYear) groups.push({ stages: [], hubs: [], event: ev });
  }

  // Circuitos referenciados pelos hubs (poucos; cada um com cache próprio).
  const circuitIds = [...new Set(groups.flatMap((g) => g.hubs.map((h) => h.circuitId)).filter((x): x is string => !!x))];
  const circuits = new Map<string, PublicCircuit>();
  await Promise.all(
    circuitIds.map(async (id) => {
      const c = await getCircuitById(id);
      if (c) circuits.set(id, c);
    }),
  );

  const today = todayBrt();
  const out: StageEventSummary[] = [];
  const usedSlugs = new Set<string>();

  for (const g of groups) {
    const first = <T,>(pick: (h: RawHub) => T | null): T | null => {
      for (const h of g.hubs) {
        const v = pick(h);
        if (v) return v;
      }
      return null;
    };

    const circuitId = first((h) => h.circuitId);
    const circuit = circuitId ? circuits.get(circuitId) ?? null : null;

    // Datas exibidas: as do evento de ingresso (datas de público), senão as do
    // hub, senão o intervalo das etapas.
    let startDay: string | null = null;
    let endDay: string | null = null;
    if (g.event?.startDay) {
      startDay = g.event.startDay;
      endDay = g.event.endDay ?? g.event.startDay;
    } else if (g.hubs.some((h) => h.startDay)) {
      const starts = g.hubs.map((h) => h.startDay).filter((x): x is string => !!x).sort();
      const ends = g.hubs.map((h) => h.endDay ?? h.startDay).filter((x): x is string => !!x).sort();
      startDay = starts[0] ?? null;
      endDay = ends[ends.length - 1] ?? startDay;
    } else if (g.stages.length) {
      startDay = g.stages[0]!.day;
      endDay = g.stages[g.stages.length - 1]!.day;
    }
    if (!startDay) continue;
    endDay = endDay && endDay >= startDay ? endDay : startDay;

    const stageNumbers = g.stages.map((s) => s.stageNumber).filter((n): n is number => n != null);
    const city = circuit?.city ?? g.event?.place ?? g.stages[0]?.city ?? null;
    const venue = circuit?.name || null;
    const isUpcoming = endDay >= today;

    let slug = [ordinalPrefix(stageNumbers), slugify([venue, city].filter(Boolean).join(" "))].filter(Boolean).join("-");
    if (usedSlugs.has(slug)) slug = `${slug}-${startDay}`;
    usedSlugs.add(slug);

    out.push({
      key: g.stages[0] ? `stage-${g.stages[0].stageId}` : g.hubs[0] ? `hub-${g.hubs[0].id}` : `event-${g.event?.id}`,
      slug,
      championshipId,
      stageNumbers,
      stageIds: g.stages.map((s) => s.stageId),
      days: daysBetween(startDay, endDay),
      startDay,
      endDay,
      city,
      venue,
      artPath: g.event?.imagePath ?? first((h) => h.posterImagePath),
      ticketUrl: isUpcoming && g.event?.isSelling ? g.event.linkUrl : null,
      isUpcoming,
      circuitId,
      liveUrl: first((h) => h.liveUrl),
      regulationUrl: first((h) => h.regulationUrl),
      wildcardFormUrl: first((h) => h.wildcardFormUrl),
    });
  }

  return out.sort((a, b) => (a.startDay ?? "").localeCompare(b.startDay ?? ""));
}

/**
 * Fins de semana de etapa do campeonato vigente, em ordem cronológica.
 * Falha de leitura NÃO é cacheada (lança dentro do cache → retorna []).
 */
export async function listStageEvents(): Promise<StageEventSummary[]> {
  try {
    return await cachedSummaries();
  } catch (e) {
    console.error("[stages] listStageEvents failed:", e);
    return [];
  }
}

const cachedSummaries = unstable_cache(buildSummaries, ["public-stage-events-v1"], {
  revalidate: 600,
  tags: ["stages", "events", "circuits"],
});

/**
 * Resolve o slug. Além do slug canônico aceita os slugs do WordPress legado
 * ("7a-e-8a-etapa-estadio-palma-travassos-ribeirao-preto-sp") e slugs que
 * mudaram (ex. "etapa-piracicaba-sp" depois que o ud-sistema cria as etapas):
 * 1) mesmos números de etapa + mesma cidade; 2) única etapa da temporada
 * naquela cidade. Retorna `canonical: false` pra página redirecionar.
 */
export async function resolveStageEventSlug(
  slug: string,
): Promise<{ summary: StageEventSummary; canonical: boolean } | null> {
  const list = await listStageEvents();
  const exact = list.find((s) => s.slug === slug);
  if (exact) return { summary: exact, canonical: true };

  const m = /^((?:\d+a-e-)*\d+a)-etapa/.exec(slug);
  const nums = m ? m[1]!.split("-e-").map((x) => Number.parseInt(x, 10)) : [];
  const inCity = list.filter((s) => {
    const key = cityKey(s.city);
    return key && slug.includes(key);
  });
  const byNums = nums.length
    ? inCity.find((s) => s.stageNumbers.length === nums.length && s.stageNumbers.every((n, i) => n === nums[i]))
    : undefined;
  const hit = byNums ?? (inCity.length === 1 ? inCity[0] : undefined);
  return hit ? { summary: hit, canonical: false } : null;
}

async function readSchedule(championshipId: number, stageIds: number[]): Promise<StageScheduleDay[]> {
  const seen = new Set<string>();
  const items: Array<StageScheduleItem & { day: string }> = [];
  for (const stageId of stageIds) {
    const snap = await adminDb
      .collection("championships")
      .doc(String(championshipId))
      .collection("stages")
      .doc(String(stageId))
      .collection("schedule")
      .where("audience", "array-contains", "publico")
      .get();
    for (const doc of snap.docs) {
      const d = doc.data() as Record<string, unknown>;
      const day = str(d.day);
      const time = str(d.time);
      const description = str(d.description);
      if (!day || !time || !description) continue;
      // As etapas de um mesmo fim de semana costumam ter o cronograma
      // duplicado (um por etapa) — deduplica por dia + hora + descrição.
      const key = `${day}|${time}|${description.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        day,
        time,
        endTime: str(d.endTime),
        description,
        location: str(d.location),
        longDescription: str(d.longDescription),
        externalUrl: str(d.externalUrl),
        category: str(d.category) ?? "EVENT",
      });
    }
  }
  items.sort((a, b) => a.day.localeCompare(b.day) || a.time.localeCompare(b.time));
  const days: StageScheduleDay[] = [];
  for (const { day, ...item } of items) {
    const last = days[days.length - 1];
    if (last && last.day === day) last.items.push(item);
    else days.push({ day, items: [item] });
  }
  return days;
}

export async function getStageEventDetail(summary: StageEventSummary): Promise<StageEventDetail> {
  const [circuit, schedule] = await Promise.all([
    summary.circuitId ? getCircuitById(summary.circuitId) : Promise.resolve(null),
    summary.championshipId != null && summary.stageIds.length
      ? unstable_cache(
          () => readSchedule(summary.championshipId!, summary.stageIds),
          [`stage-schedule-${summary.championshipId}-${summary.stageIds.join("-")}`],
          { revalidate: 300, tags: ["stages"] },
        )().catch((e) => {
          console.error("[stages] schedule failed:", e);
          return [] as StageScheduleDay[];
        })
      : Promise.resolve([] as StageScheduleDay[]),
  ]);
  return { ...summary, circuit, schedule };
}
