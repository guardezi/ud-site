# ud-site

Site público do Ultimate Drift — Next.js 16 SSR no Firebase App Hosting, consumindo Firestore. Substitui o WordPress legado em `www.ultimatedrift.com.br`.

Stack:
- Next.js 16 App Router (React 19 Server Components)
- Tailwind v4
- next-intl 4 (pt-BR default sem prefix, en-US e es-ES com prefix)
- Firebase Admin SDK (server-side queries)
- Firebase App Hosting (Cloud Run gerenciado)

Objetivos: rankear #1 no Google e ser citável por LLMs (ChatGPT search, Perplexity, Claude web).

## Dev local

```bash
cd ud-site
pnpm install
cp .env.example .env.local   # preencher credenciais
pnpm dev                     # http://localhost:3000
pnpm typecheck
pnpm lint
pnpm build
```

`GOOGLE_APPLICATION_CREDENTIALS` aponta para um JSON de service account com permissão Firestore + Storage read no projeto desejado.

## Deploy

- PR → `ci-ud-site` workflow valida lint/typecheck/build
- push em `main` → `deploy-hml-ud-site` faz rollout em `juiz-ud-stage`
- tag `v*` → `deploy-prd-ud-site` faz rollout em `ultimate-drift-production` (gate manual)

Setup one-shot por backend está documentado no topo de cada workflow.

## Estrutura

```
src/
├── app/[locale]/       páginas públicas (Next App Router)
├── components/         layout, UI, SEO, módulos
├── i18n/               next-intl routing + messages
├── lib/                queries Firestore, SEO helpers, utils
│   ├── firebase/       admin/client/image-variants
│   ├── seo/            meta, jsonld, hreflang, canonical
│   └── <module>/       queries.ts por feature
└── middleware.ts       i18n + legacy 301s
public/
├── llms.txt            índice pra LLM crawl
├── legacy-redirects.json   tabela de 301 do WP
└── opengraph-default.png   fallback OG
scripts/
├── import-wp.mjs       migração WordPress → Firestore
└── gen-llms-txt.mjs    regenera llms.txt no postbuild
```

## Conteúdo editorial

Notícias, sponsors, drift categories e páginas estáticas (sobre/termos/privacidade) são editados no `ud-backoffice` (módulo `content/`). Mudanças disparam revalidate on-demand via `/api/revalidate` (HMAC).

## Docs

- [`docs/UD_BACKOFFICE_CMS_SPEC.md`](./docs/UD_BACKOFFICE_CMS_SPEC.md) — contrato pra outro agente implementar o CMS dentro do `ud-backoffice` (collections, server actions, UI, HMAC revalidate, IndexNow).
- [`docs/WP_IMPORT_SPEC.md`](./docs/WP_IMPORT_SPEC.md) — algoritmo do `scripts/import-wp.mjs` (WordPress REST → Firestore + Storage, preservando slugs e gerando `legacy-redirects.json`).
- [`docs/PHASE2_ROADMAP.md`](./docs/PHASE2_ROADMAP.md) — sequência de trabalho Fase 2: ordem dos agentes, setup de App Hosting/secrets, smoke test integrado.

## Fase 1 — status

| Pronto | Item |
|---|---|
| ✅ | Bootstrap Next.js 16 + Tailwind v4 + next-intl 4 (`as-needed`) |
| ✅ | App Hosting `apphosting.yaml` + `apphosting.production.yaml` (PRD warm) |
| ✅ | Workflows GHA `ci`, `deploy-hml`, `deploy-prd` |
| ✅ | i18n com pathnames traduzidos (pt-BR default sem prefix) |
| ✅ | SEO infra (`sitemap.ts`, `robots.ts`, `manifest.ts`, JSON-LD, meta builder, canonical, hreflang) |
| ✅ | LLM robots allow explícito (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot) |
| ✅ | `public/llms.txt` estático |
| ✅ | Queries server-side fault-tolerant pra drivers/stages/circuits/championship/qualifyings/battles/fantasy |
| ✅ | Stubs server-side pra news/sponsors/categories/contentPages (consumidos pelo CMS Fase 2) |
| ✅ | 17 páginas em 3 locales = 51 rotas SSG/ISR |
| ✅ | `middleware.ts` com lookup de `legacy-redirects.json` antes do roteamento |
| ⏳ | `/api/revalidate` (Fase 2 — Agente B) |
| ⏳ | `scripts/import-wp.mjs` (Fase 2 — Agente B) |
| ⏳ | CMS no `ud-backoffice` (Fase 2 — Agente A) |
| ⏳ | Backends App Hosting (Fase 2 — humano) |
| ⏳ | Cutover DNS (Fase 4 — humano) |
