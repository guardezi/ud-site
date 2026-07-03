# Auditoria de migração ultimatedrift.com.br → ud-site

> Gerada por investigação cross-repo (site vivo × consumers ud-site × producers ud-app/ud-sistema/ud-backoffice). Data: 2026-07-02.

## 1. Resumo executivo

- **A camada de consumo está pronta; o trabalho real é PRODUCERS + seeding.** Os 12 módulos de query do `ud-site` já leem Firestore em SSR. "Virar consumer do Firebase" aqui **não** é escrever mais queries — é (a) garantir *quem escreve* cada collection e (b) *ligar (wire)* consumers já prontos a rotas que hoje caem no snapshot WP.
- **Maior blocker: `sponsors`.** Único dado onde falha a cadeia inteira: consumer órfão (`listSponsors` sem import), **nenhum producer**, collection vazia, `/patrocinadores` em `WPPageSnapshot`.
- **Segundo blocker (alto impacto, baixo esforço): standings.** Dados existem (`publicChampionshipHistory`, CF com sync agendado), mas `StandingsTable`/`TopDriversCard` são **código morto** e `/classificacao` renderiza snapshot. Falta só **fiação**.
- **`/etapas` e `/categorias` continuam em snapshot** mesmo com o detail já live.
- **Buracos sem modelo:** formulário de **contato** e vários **links externos por-evento** (Tycket, Google Forms Curinga, regulamento CBA, portal ao vivo) sem campo canônico.

## 2. Matriz de gap por dado

Status: **LIVE** renderiza Firestore · **WIRING** consumer pronto mas rota usa snapshot/órfão · **SEED** producer existe mas dado depende de import/admin · **SEM PRODUCER** gap total · **SEM MODELO** nem collection existe.

| Dado (página) | Collection | Consumer (ud-site) | Producer | Dados hoje | O que falta |
|---|---|---|---|---|---|
| Top-3 pódio (Home) | `publicChampionshipHistory` | `home/TopDriversCard.tsx` (órfão) | CF `championshipHistorySync.ts` | sim | **WIRING** — montar na home |
| Tabela classificação (Home, `/classificacao`) | `publicChampionshipHistory` (+`settings/publicRound`) | `standings/StandingsTable.tsx` (órfão) | CF sync agendado | sim | **WIRING** — trocar `WPPageSnapshot` |
| Seletor temporada 2025/2026 | `publicChampionshipHistory/{championshipId}` | idem | idem | parcial | **WIRING** + resolver múltiplos championshipId |
| Cards de pilotos `/pilotos` | `drivers` | `lib/drivers` `listPublicDrivers` | CF `driversQueue` | sim | **LIVE** |
| Perfil do piloto | `drivers/{id}` | `pilotos/[slug]` | idem | sim | **LIVE** |
| `/categorias` index | `driftCategories` | módulo só usado no detail | `import-wp.mjs` | sim (2 docs) | **WIRING** — index em snapshot |
| Notícias (Home + `/noticias`) | `news` | `lib/news` `listNews` | `import-wp.mjs` | sim (17 docs) | **LIVE** em /noticias; falta bloco na Home |
| Páginas conteúdo (`/sobre`,`/privacidade`) | `content` | `lib/contentPages` | `import-wp.mjs` | parcial (1/9) | **SEED** — rodar import 3 pág × 3 locales |
| Próximas etapas (Home, `/etapas`) | `stageHubs` | `Hero`/`StagesList` órfãos | ud-backoffice `events/hubs/actions.ts` (manual) | desconhecido | **WIRING + SEED** |
| Timetable / pôster por etapa | `stageHubs.timetable/posterImagePath` | `etapas/[slug]` | idem CMS | desconhecido | **SEED** — admin preenche |
| Circuito (detail) | `circuits/{id}` | `lib/circuits` | ud-backoffice `events/circuits/actions.ts` | desconhecido | **SEED** |
| Qualifying (detail) | `publicQualifyings/{stageId}` | `lib/qualifyings` | CF `publicQualifyingsQueue` | parcial | **LIVE** + empty-state |
| Batalhas/chaveamento (detail) | `publicBattles/{stageId}` | `lib/battles` | CF `publicBattlesQueue` | parcial | **LIVE** + empty-state |
| **Logos patrocinadores** | `sponsors` | `lib/sponsors` **órfão** | **nenhum** | **não** | **SEM PRODUCER** — gap #1 |
| Stats marketing (/patrocinadores) | — | — | — | não | **SEM MODELO** |
| Ingressos `/ingressos` | `ticketEvents`+`ticketTypes`/`lots` | `lib/ticketing` | ud-backoffice `ticketing/actions.ts` | desconhecido | **SEED** ou reconciliar c/ Tycket |
| Links Tycket por etapa | (externo) | — | — | n/a | **SEM MODELO** — campo `ticketUrl` em stageHubs |
| Formulário contato `/contato` | — | — | — | não | **SEM MODELO** — precisa inbox/backend |
| Portal ao vivo / Curinga / regulamento | (externo) | — | — | n/a | **SEM MODELO** — links config/por-round |
| Fantasy ranking | `publicFantasyRanking` | `lib/fantasy` (órfão) | CF `fantasyScoring.ts` | parcial | **WIRING** — sem rota; fora de escopo atual |

## 3. Novas necessidades para importar o site

### (a) Producers novos a construir
1. **Producer de `sponsors` — NÃO EXISTE (gap #1).** Nada escreve. Precisa CMS no ud-backoffice (§b) OU writer no import-wp (§c).
2. **Destino do formulário de contato — NÃO EXISTE.** Server action (ud-site) ou callable (ud-app/functions) gravando `contactMessages/{id}` + e-mail.
3. **(Opcional) Bridge de links externos** — estender schema de `stageHubs` (`ticketUrl`, `wildcardFormUrl`, `regulationUrl`, `liveUrl`); writer já existe.

> `drivers`, `publicChampionshipHistory`, `publicQualifyings`, `publicBattles`, `publicFantasyRanking` **já têm producer CF ativo** — não inventar producers novos.

### (b) CMS faltando no ud-backoffice
1. **`sponsors` CMS** — planejado (`UD_BACKOFFICE_CMS_SPEC.md`), não construído. Schema alvo `{name, logoPath, website, tier, order}`.
2. **Editor de `content`** — só import-wp popula hoje.
3. **Editor de `news`** — consumer live, mas sem CMS; só entra via import.
4. **Já existem (só confirmar uso):** `stageHubs`, `circuits`, `ticketing` — gap é conteúdo criado por admin, não código.

### (c) Scripts de import one-shot
1. **Rodar `import-wp.mjs` p/ `content`** — 1 de 9 docs; faltam sobre/privacidade × locales.
2. **Adicionar writer de `sponsors`** ao import (atalho ao CMS).
3. **Confirmar/rerodar** import de news/driftCategories no projeto-alvo.

### (d) MySQL → Firestore (pontes já existem)
- `drivers`, standings (pull REST + sync agendado), qualifying/battles — **pontes vivas**, só validar cobertura e `championshipId`. Categorias são taxonomia de conteúdo, **não** MySQL.

## 4. Sequência priorizada

**Fase 0 — Fiação (dados já existem, máxima alavancagem, dias):**
1. **Ligar standings** — `StandingsTable` em `/classificacao` + `TopDriversCard` na Home.
2. **Ligar `/categorias` index** — consumir `listDriftCategories`.
3. **Ligar `/etapas` index** — `StagesList`/`Hero` (depende da Fase 1).

**Fase 1 — Seeding (producer/CMS já existem, dias–1sem):**
4. **Popular `stageHubs`** (6 etapas + timetable + pôster) e **estender schema** c/ links externos.
5. **Popular `circuits`**.
6. **Completar import de `content`**.

**Fase 2 — Sponsors (o blocker de producer, 1–2 sem, paralelo):**
7. **CMS `sponsors`** (ou writer no import-wp) → **ligar `/patrocinadores`**.

**Fase 3 — Buracos sem modelo (decisão de produto):**
8. Formulário de contato (`contactMessages`).
9. Decisão Tycket: checkout nativo vs. link externo.
10. Fantasy: entra no site público?

## 5. Riscos / incógnitas

- **`stageHubs`/`circuits`/`ticketEvents` = dados `unknown`** — dependem de admin criar manual; detail pode virar empty-state. **Verificar no projeto-alvo antes do cutover.**
- **`sponsors`** = zero producer + zero dados + snapshot. Blocker mais concreto.
- **`content` só 1/9 docs** — /sobre e /privacidade sem corpo até import rodar.
- **Reconciliação Tycket vs. ticketing nativo** — módulo de checkout completo mas nunca populado; expor catálogo vazio + linkar Tycket é incoerente.
- **Standings multi-temporada** — validar se há doc por temporada e como o toggle mapeia championshipId.
- **Campos de `circuits` parseados mas não consumidos** (`qualifyMap`, `faqs`, `lat/lng`) — dead code ou feature incompleta.
- **SEO/DNS cutover fora do escopo** — limpar `wp-snapshot` órfãos já substituídos; planejar redirects 301 e paridade de metadados separadamente (não auditado).
