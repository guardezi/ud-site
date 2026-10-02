/**
 * Nacionalidade do piloto (`drivers/{id}.nacionalidade`, texto livre) → ISO-3166-1
 * alpha-2. Cópia de `ud-backoffice/src/lib/overlay/nationality.ts`, que por sua vez
 * porta `ud-app/functions/src/utils/nationality.ts` — manter as três alinhadas.
 *
 * Regra: vazio → ""; reconhecido → alpha-2 MAIÚSCULO; não reconhecido → texto original (trim).
 */

// ISO-3166-1 alpha-3 → alpha-2. Lista completa pra não depender de "adivinhar".
const ALPHA3_TO_ALPHA2: Record<string, string> = {
  ABW: "AW", AFG: "AF", AGO: "AO", AIA: "AI", ALA: "AX", ALB: "AL", AND: "AD",
  ARE: "AE", ARG: "AR", ARM: "AM", ASM: "AS", ATA: "AQ", ATF: "TF", ATG: "AG",
  AUS: "AU", AUT: "AT", AZE: "AZ", BDI: "BI", BEL: "BE", BEN: "BJ", BES: "BQ",
  BFA: "BF", BGD: "BD", BGR: "BG", BHR: "BH", BHS: "BS", BIH: "BA", BLM: "BL",
  BLR: "BY", BLZ: "BZ", BMU: "BM", BOL: "BO", BRA: "BR", BRB: "BB", BRN: "BN",
  BTN: "BT", BVT: "BV", BWA: "BW", CAF: "CF", CAN: "CA", CCK: "CC", CHE: "CH",
  CHL: "CL", CHN: "CN", CIV: "CI", CMR: "CM", COD: "CD", COG: "CG", COK: "CK",
  COL: "CO", COM: "KM", CPV: "CV", CRI: "CR", CUB: "CU", CUW: "CW", CXR: "CX",
  CYM: "KY", CYP: "CY", CZE: "CZ", DEU: "DE", DJI: "DJ", DMA: "DM", DNK: "DK",
  DOM: "DO", DZA: "DZ", ECU: "EC", EGY: "EG", ERI: "ER", ESH: "EH", ESP: "ES",
  EST: "EE", ETH: "ET", FIN: "FI", FJI: "FJ", FLK: "FK", FRA: "FR", FRO: "FO",
  FSM: "FM", GAB: "GA", GBR: "GB", GEO: "GE", GGY: "GG", GHA: "GH", GIB: "GI",
  GIN: "GN", GLP: "GP", GMB: "GM", GNB: "GW", GNQ: "GQ", GRC: "GR", GRD: "GD",
  GRL: "GL", GTM: "GT", GUF: "GF", GUM: "GU", GUY: "GY", HKG: "HK", HMD: "HM",
  HND: "HN", HRV: "HR", HTI: "HT", HUN: "HU", IDN: "ID", IMN: "IM", IND: "IN",
  IOT: "IO", IRL: "IE", IRN: "IR", IRQ: "IQ", ISL: "IS", ISR: "IL", ITA: "IT",
  JAM: "JM", JEY: "JE", JOR: "JO", JPN: "JP", KAZ: "KZ", KEN: "KE", KGZ: "KG",
  KHM: "KH", KIR: "KI", KNA: "KN", KOR: "KR", KWT: "KW", LAO: "LA", LBN: "LB",
  LBR: "LR", LBY: "LY", LCA: "LC", LIE: "LI", LKA: "LK", LSO: "LS", LTU: "LT",
  LUX: "LU", LVA: "LV", MAC: "MO", MAF: "MF", MAR: "MA", MCO: "MC", MDA: "MD",
  MDG: "MG", MDV: "MV", MEX: "MX", MHL: "MH", MKD: "MK", MLI: "ML", MLT: "MT",
  MMR: "MM", MNE: "ME", MNG: "MN", MNP: "MP", MOZ: "MZ", MRT: "MR", MSR: "MS",
  MTQ: "MQ", MUS: "MU", MWI: "MW", MYS: "MY", MYT: "YT", NAM: "NA", NCL: "NC",
  NER: "NE", NFK: "NF", NGA: "NG", NIC: "NI", NIU: "NU", NLD: "NL", NOR: "NO",
  NPL: "NP", NRU: "NR", NZL: "NZ", OMN: "OM", PAK: "PK", PAN: "PA", PCN: "PN",
  PER: "PE", PHL: "PH", PLW: "PW", PNG: "PG", POL: "PL", PRI: "PR", PRK: "KP",
  PRT: "PT", PRY: "PY", PSE: "PS", PYF: "PF", QAT: "QA", REU: "RE", ROU: "RO",
  RUS: "RU", RWA: "RW", SAU: "SA", SDN: "SD", SEN: "SN", SGP: "SG", SGS: "GS",
  SHN: "SH", SJM: "SJ", SLB: "SB", SLE: "SL", SLV: "SV", SMR: "SM", SOM: "SO",
  SPM: "PM", SRB: "RS", SSD: "SS", STP: "ST", SUR: "SR", SVK: "SK", SVN: "SI",
  SWE: "SE", SWZ: "SZ", SXM: "SX", SYC: "SC", SYR: "SY", TCA: "TC", TCD: "TD",
  TGO: "TG", THA: "TH", TJK: "TJ", TKL: "TK", TKM: "TM", TLS: "TL", TON: "TO",
  TTO: "TT", TUN: "TN", TUR: "TR", TUV: "TV", TWN: "TW", TZA: "TZ", UGA: "UG",
  UKR: "UA", UMI: "UM", URY: "UY", USA: "US", UZB: "UZ", VAT: "VA", VCT: "VC",
  VEN: "VE", VGB: "VG", VIR: "VI", VNM: "VN", VUT: "VU", WLF: "WF", WSM: "WS",
  YEM: "YE", ZAF: "ZA", ZMB: "ZM", ZWE: "ZW",
};

const VALID_ALPHA2 = new Set(Object.values(ALPHA3_TO_ALPHA2));

// Códigos de 3 letras NÃO-ISO comuns em cronometragem / feeds de automobilismo
// (padrão IOC / FIFA) que divergem do alpha-3 — ex.: "GER", "SUI", "URU", "PAR".
const ALPHA3_ALIASES: Record<string, string> = {
  GER: "DE", SUI: "CH", NED: "NL", POR: "PT", DEN: "DK", RSA: "ZA",
  CRO: "HR", GRE: "GR", SLO: "SI", URU: "UY", PAR: "PY", CHI: "CL",
  CRC: "CR", PUR: "PR", ESA: "SV", GUA: "GT", HON: "HN", NCA: "NI",
  ENG: "GB", SCO: "GB", WAL: "GB", NIR: "GB", NGR: "NG", PHI: "PH",
  INA: "ID", MAS: "MY", SIN: "SG", TPE: "TW", KSA: "SA", UAE: "AE",
  BUL: "BG", LAT: "LV",
};

// Nome do país OU gentílico → alpha-2 (pt-BR / en / es). Chaves comparadas já
// normalizadas: minúsculas, sem acento, hífen/underscore viram espaço.
const NAME_TO_ALPHA2: Record<string, string> = {
  "brasil": "BR", "brazil": "BR", "brasileiro": "BR", "brasileira": "BR",
  "argentina": "AR", "argentino": "AR",
  "uruguai": "UY", "uruguay": "UY", "uruguaio": "UY", "uruguaia": "UY",
  "paraguai": "PY", "paraguay": "PY", "paraguaio": "PY", "paraguaia": "PY",
  "chile": "CL", "chileno": "CL", "chilena": "CL",
  "bolivia": "BO", "boliviano": "BO", "boliviana": "BO",
  "peru": "PE", "peruano": "PE", "peruana": "PE",
  "colombia": "CO", "colombiano": "CO", "colombiana": "CO",
  "venezuela": "VE", "venezuelano": "VE", "venezuelana": "VE",
  "equador": "EC", "ecuador": "EC", "equatoriano": "EC", "equatoriana": "EC",
  "estados unidos": "US", "estados unidos da america": "US",
  "united states": "US", "united states of america": "US", "usa": "US",
  "eua": "US", "americano": "US", "americana": "US", "american": "US",
  "norte americano": "US", "norte americana": "US", "estadunidense": "US",
  "canada": "CA", "canadense": "CA", "canadian": "CA", "canadiense": "CA",
  "mexico": "MX", "mexicano": "MX", "mexicana": "MX", "mexican": "MX",
  "portugal": "PT", "portugues": "PT", "portuguesa": "PT", "portuguese": "PT",
  "espanha": "ES", "spain": "ES", "espana": "ES", "espanhol": "ES",
  "espanhola": "ES", "spanish": "ES",
  "franca": "FR", "france": "FR", "francia": "FR", "frances": "FR",
  "francesa": "FR", "french": "FR",
  "alemanha": "DE", "germany": "DE", "alemania": "DE", "alemao": "DE",
  "alema": "DE", "german": "DE",
  "italia": "IT", "italy": "IT", "italiano": "IT", "italiana": "IT",
  "italian": "IT",
  "reino unido": "GB", "united kingdom": "GB", "uk": "GB", "inglaterra": "GB",
  "england": "GB", "gra bretanha": "GB", "great britain": "GB", "britanico": "GB",
  "britanica": "GB", "british": "GB", "ingles": "GB", "inglesa": "GB",
  "english": "GB", "escoces": "GB", "escocesa": "GB", "scottish": "GB",
  "gales": "GB", "galesa": "GB", "welsh": "GB",
  "irlanda": "IE", "ireland": "IE", "irlandes": "IE", "irlandesa": "IE",
  "irish": "IE",
  "holanda": "NL", "paises baixos": "NL", "netherlands": "NL", "holland": "NL",
  "holandes": "NL", "holandesa": "NL", "neerlandes": "NL", "neerlandesa": "NL",
  "dutch": "NL",
  "belgica": "BE", "belgium": "BE", "belga": "BE", "belgian": "BE",
  "suica": "CH", "switzerland": "CH", "suiza": "CH", "suico": "CH",
  "swiss": "CH",
  "austria": "AT", "austriaco": "AT", "austriaca": "AT", "austrian": "AT",
  "suecia": "SE", "sweden": "SE", "sueco": "SE", "sueca": "SE", "swedish": "SE",
  "noruega": "NO", "norway": "NO", "noruegues": "NO", "norueguesa": "NO",
  "norwegian": "NO",
  "finlandia": "FI", "finland": "FI", "finlandes": "FI", "finlandesa": "FI",
  "finnish": "FI",
  "dinamarca": "DK", "denmark": "DK", "dinamarques": "DK", "dinamarquesa": "DK",
  "danish": "DK",
  "polonia": "PL", "poland": "PL", "polones": "PL", "polonesa": "PL",
  "polaco": "PL", "polaca": "PL", "polish": "PL",
  "russia": "RU", "russo": "RU", "russa": "RU", "russian": "RU",
  "japao": "JP", "japan": "JP", "japon": "JP", "japones": "JP",
  "japonesa": "JP", "japanese": "JP",
  "coreia do sul": "KR", "south korea": "KR", "korea": "KR", "coreano": "KR",
  "coreana": "KR", "sul coreano": "KR", "sul coreana": "KR", "korean": "KR",
  "south korean": "KR",
  "china": "CN", "chines": "CN", "chinesa": "CN", "chinese": "CN",
  "australia": "AU", "australiano": "AU", "australiana": "AU",
  "australian": "AU",
  "nova zelandia": "NZ", "new zealand": "NZ", "neozelandes": "NZ",
  "neozelandesa": "NZ", "new zealander": "NZ",
  "africa do sul": "ZA", "south africa": "ZA", "sul africano": "ZA",
  "sul africana": "ZA", "south african": "ZA",
  "emirados arabes unidos": "AE", "united arab emirates": "AE", "uae": "AE",
  "emiradense": "AE", "emirati": "AE",
  "catar": "QA", "qatar": "QA", "catariano": "QA", "catariana": "QA",
  "qatari": "QA",
};

/**
 * Normaliza `raw` pra ISO-3166-1 alpha-2 MAIÚSCULO quando reconhece. `""` só pra
 * entrada vazia / não-string; texto não reconhecido volta como veio (trim).
 * Idempotente pra alpha-2.
 */
export function normalizeNationality(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (trimmed === "") return "";

  const key = trimmed
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const upper = key.toUpperCase();

  if (/^[A-Z]{2}$/.test(upper) && VALID_ALPHA2.has(upper)) return upper;
  if (/^[A-Z]{3}$/.test(upper)) {
    if (ALPHA3_TO_ALPHA2[upper]) return ALPHA3_TO_ALPHA2[upper];
    if (ALPHA3_ALIASES[upper]) return ALPHA3_ALIASES[upper];
  }
  if (NAME_TO_ALPHA2[key]) return NAME_TO_ALPHA2[key];

  return trimmed;
}


/** SVG da bandeira em `public/flags` (set do backoffice, flag-icons 4x3), ou `null`. */
export function flagSrc(code: string | null | undefined): string | null {
  return code && /^[A-Z]{2}$/.test(code) && FLAGS.has(code) ? `/flags/${code.toLowerCase()}.svg` : null;
}
const FLAGS = new Set("AE AR AT AU BE BG BO BR CA CH CL CN CO CR CZ DE DK DO EC ES FI FR GB GR GT HN HR ID IE IL IN IT JP KR LV MA MX MY NG NI NL NO NZ PA PE PH PL PR PT PY QA RU SA SE SG SI SV TH TW UA US UY VE ZA".split(" "));
