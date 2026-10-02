/**
 * MOCK — fonte real a definir.
 *
 * Dados fixos da seção "Próxima etapa" da home (NextStageSchedule), copiados
 * da referência do site legado (etapa de Piracicaba, out/2026). Quando a fonte
 * for definida (provavelmente `stageHubs.timetable` + `circuits` + `events`),
 * trocar este objeto por uma query que devolva o mesmo tipo.
 */
import type { NextStageScheduleData } from "./NextStageSchedule";

const YOUTUBE_URL = "https://www.youtube.com/@UltimateDriftbr";
const RACER = { name: "RACER Brasil", url: "https://www.racerbrasil.com/", logoSrc: "/theme/img/racer-logo.png" };

export const NEXT_STAGE_SCHEDULE_MOCK: NextStageScheduleData = {
  datesLabel: "16, 17 e 18 de Outubro",
  city: "Piracicaba - SP",
  venue: "ECPA - PIRACICABA",
  days: [
    {
      label: "Sexta - 16/10",
      items: [{ startTime: "15:00", title: "Qualificação", live: { url: YOUTUBE_URL } }],
    },
    {
      label: "Sábado - 17/10",
      items: [
        { startTime: "10:00", title: "Abertura dos portões" },
        { startTime: "10:00", title: "Pré Batalhas + TOP 32", live: { url: YOUTUBE_URL } },
        { startTime: "13:00", endTime: "14:30", title: "Grid Experience" },
        {
          startTime: "13:00",
          endTime: "14:30",
          title: "Apresentação dos pilotos + TOP 16",
          live: { url: YOUTUBE_URL, broadcaster: RACER },
        },
        { startTime: "17:00", title: "Podium" },
      ],
    },
    {
      label: "Domingo - 18/10",
      items: [
        { startTime: "07:00", title: "Qualificação" },
        { startTime: "10:00", title: "Abertura dos portões" },
        { startTime: "10:00", title: "Pré Batalhas + TOP 32", live: { url: YOUTUBE_URL } },
        { startTime: "13:00", endTime: "14:30", title: "Grid Experience" },
        {
          startTime: "13:00",
          endTime: "14:30",
          title: "Apresentação dos pilotos + TOP 16",
          live: { url: YOUTUBE_URL, broadcaster: RACER },
        },
        { startTime: "17:00", title: "Podium" },
      ],
    },
  ],
  ticketUrl: "https://www.tycket.com.br/ultimate-drift-piracicaba-17-e-18-outubro-final-campeonato.html",
  moreInfoHref: "/etapas",
};
