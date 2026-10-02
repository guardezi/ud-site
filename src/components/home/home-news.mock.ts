/**
 * MOCK — fonte real a definir. Notícias do print de referência; imagens do
 * site legado (public/uploads). A foto original do destaque (duas BMWs) não
 * está no repo: usa outra foto de drift da mesma série como substituta.
 */
import type { HomeNewsData } from "./HomeNews";

export const HOME_NEWS_MOCK: HomeNewsData = {
  highlight: {
    slug: "estadio-do-comercial-recebe-etapa-do-brasileiro-de-drift-em-agosto",
    title: "Estádio do Comercial recebe etapa do Brasileiro de Drift em agosto",
    category: "Notícia",
    imageSrc: "/uploads/2026/03/DayballDiorioBernardo-292.jpg",
  },
  others: [
    {
      slug: "ultimate-drift-2026-o-maior-campeonato-de-drift-da-america-latina-retorna-a-londrina",
      title: "ULTIMATE DRIFT 2026: O MAIOR CAMPEONATO DE DRIFT DA AMÉRICA LATINA RETORNA A LONDRINA",
      category: "Notícia",
      imageSrc: "/uploads/2026/05/@DIORIOFOTOGRAFIAS-388-1024x683.jpg",
    },
    {
      slug: "ultimate-drift-vai-realizar-etapa-no-kartodromo-internacional-ao-lado-do-beto-carrero-nos-dias-25-e-26-de-abril",
      title: "Ultimate Drift vai realizar etapa no Kartódromo Internacional ao lado do Beto Carrero nos dias 25 e 26 de abril",
      category: "Notícia",
      imageSrc: "/uploads/2026/03/Dayball-Diorio-Bernardo-4-300x200.jpg",
    },
  ],
  allNewsHref: "/noticias",
};
