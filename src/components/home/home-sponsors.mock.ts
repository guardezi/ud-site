/**
 * MOCK — fonte real a definir. Só os APOIADORES (logos e links do site legado
 * em public/uploads); os patrocinadores vêm do Firestore (listEventSponsors).
 */
import type { SponsorLogo } from "./HomeSponsors";

export const HOME_SUPPORTERS_MOCK: SponsorLogo[] = [
  { name: "Lesotto Transportes", url: "https://lesottotransportes.com", logoSrc: "/uploads/2026/06/LESOTTO_page-0001.jpg" },
  { name: "Zanoello", url: "https://zanoello.com.br/", logoSrc: "/uploads/2026/03/zanoello-1.png" },
  { name: "Silicon Village", url: "https://siliconvillage.dev/", logoSrc: "/uploads/2025/08/Horizontal-com-subtitulo-2.png" },
  { name: "SFI Chips", url: "https://sfichips.com.br/", logoSrc: "/uploads/2025/07/sfi.jpg" },
];
