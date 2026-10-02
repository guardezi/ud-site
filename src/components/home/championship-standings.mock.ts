/**
 * MOCK — fonte real a definir.
 *
 * Classificação Geral 2026 copiada dos prints do site legado (1º a 8º com os
 * pontos exatos; o 4º tinha 3 colunas cobertas por tooltip, completadas pra
 * fechar o total de 529). 9º e 10º não aparecem inteiros nos prints:
 * valores plausíveis. Fotos de public/uploads (mesmas do site legado).
 */
import type { ChampionshipStandingsData } from "./ChampionshipStandings";

export const CHAMPIONSHIP_STANDINGS_MOCK: ChampionshipStandingsData = {
  year: 2026,
  stageCount: 10,
  fullStandingsHref: "/classificacao",
  drivers: [
    { position: 1, name: "Sheriff Barion", number: 357, slug: "sheriff-barion", photoSrc: "/uploads/2025/06/pilotosheriff-barion.png", stagePoints: [86, 75, 90, 88, 31, 62, 64, 31, 43, 41], total: 611 },
    { position: 2, name: "Sartor", number: 23, slug: "matheus-sartor", photoSrc: "/uploads/2025/06/piloto_sartor-Piloto.png", stagePoints: [61, 88, 31, 61, 86, 71, 41, 62, 41, 51], total: 593 },
    { position: 3, name: "Sobral", number: 19, slug: "murilo-sobral", photoSrc: "/uploads/2025/06/sobral-Piloto.png", stagePoints: [54, 64, 74, 45, 41, 44, 73, 54, 34, 90], total: 573 },
    { position: 4, name: "Lucas Hanazono", number: 99, slug: "lucas-hanazono", photoSrc: "/uploads/2025/06/piloto_lucas-kise-Piloto.png", stagePoints: [42, 41, 41, 31, 63, 31, 90, 88, 71, 31], total: 529 },
    { position: 5, name: "Juninho", number: 11, slug: "juninho", photoSrc: "/uploads/2025/06/JUNINHO.png", stagePoints: [75, 51, 41, 34, 31, 51, 41, 41, 65, 74], total: 504 },
    { position: 6, name: "Gabriel Pacheco", number: 97, slug: "gabriel-pacheco", photoSrc: "/uploads/2025/06/pacheco-piloto.png", stagePoints: [43, 42, 61, null, 74, 90, 32, 45, 51, 42], total: 480 },
    { position: 7, name: "Gustavinho Radical", number: 22, slug: "gustavinho-radical", photoSrc: "/uploads/2025/06/gustavinho-piloto.png", stagePoints: [41, 41, 41, 71, 22, 43, 21, 71, 31, 61], total: 443 },
    { position: 8, name: "Dudu", number: 325, slug: null, photoSrc: "/uploads/2026/02/piloto_dudu-Piloto.png", stagePoints: [31, 41, 51, 51, 21, 21, 41, null, 86, 43], total: 386 },
    { position: 9, name: "Lucio Turossi", number: 81, slug: "lucio-turossi", photoSrc: "/uploads/2025/06/piloto_lucio-turossi-Piloto.png", stagePoints: [31, 31, 31, 41, 41, 31, 51, 41, 31, 31], total: 360 },
    { position: 10, name: "Hai Camatti", number: 71, slug: "haian-camatti", photoSrc: "/uploads/2025/06/HaiLiveUD_820x1100_2026.png", stagePoints: [41, 31, null, 41, 51, 31, 41, 31, 41, 43], total: 351 },
  ],
};
