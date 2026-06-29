# Roadmap — Fase 2 (CMS + migração WP + cutover)

> Fase 1 (bootstrap, SEO infra, queries Firestore, páginas) já está em pé. Esta é a sequência pra ligar o site novo no WP histórico e habilitar publicação editorial.

## Dependências por agente

| Agente | Repositório | Trabalho |
|---|---|---|
| Agente A — backoffice | `ud-backoffice` | Implementa o módulo `content/` conforme `docs/UD_BACKOFFICE_CMS_SPEC.md` |
| Agente B — site (este repo) | `ud-site` | Implementa `/api/revalidate`, `scripts/import-wp.mjs`, `scripts/verify-migration.mjs` |
| Humano — infra | n/a | Cria backends App Hosting `ud-site` (HML+PRD), grava secrets, configura DNS no cutover |

Os dois agentes podem trabalhar em paralelo desde que **respeitem o contrato dos schemas Firestore** em `docs/UD_BACKOFFICE_CMS_SPEC.md`.

## Sequência sugerida

### 1. Infra (humano) — antes de qualquer agente

```bash
# HML
firebase apphosting:backends:create --project=juiz-ud-stage --location=us-east4
# prompt: nome `ud-site`, repo guardezi/ud-site, root branch main, AUTO-ROLLOUT off

# PRD
firebase apphosting:backends:create --project=ultimate-drift-production --location=us-east4
# prompt: idem, nome `ud-site`
firebase apphosting:backends:update ud-site --project=ultimate-drift-production --environment=production

# Secrets
firebase apphosting:secrets:set REVALIDATE_SECRET --project juiz-ud-stage
firebase apphosting:secrets:set REVALIDATE_SECRET --project ultimate-drift-production
firebase apphosting:secrets:set GOOGLE_SITE_VERIFICATION --project ultimate-drift-production
firebase apphosting:secrets:set INDEXNOW_KEY --project ultimate-drift-production
# (mesma key gravada no ud-backoffice)
```

GitHub repo `guardezi/ud-site` deve ter os secrets:
- `GCP_SA_KEY_HML` — JSON de SA em `juiz-ud-stage` com Firebase App Hosting Admin + Cloud Build Editor
- `GCP_SA_KEY_PRD` — idem em `ultimate-drift-production`
- `NEXT_PUBLIC_FIREBASE_*_HML` — apenas pra CI buildar PRs (mesmas chaves públicas do `apphosting.yaml`)

GitHub Environments:
- `hml` — sem restrição
- `production` — required reviewers + deployment branches: tags `v*`

### 2. Agente B (este repo) — endpoint revalidate + script import

**Tarefas no `ud-site`:**

#### B.1 `/api/revalidate`

Implementar `src/app/api/revalidate/route.ts` conforme `docs/UD_BACKOFFICE_CMS_SPEC.md` seção "Lado do ud-site". HMAC SHA-256 com `REVALIDATE_SECRET`, `revalidateTag()` pra cada tag recebida.

#### B.2 `scripts/import-wp.mjs`

Implementar conforme `docs/WP_IMPORT_SPEC.md`. Adicionar dev deps:
```bash
pnpm add -D turndown jsdom yargs @google-cloud/storage
```

#### B.3 `scripts/verify-migration.mjs`

Implementar verificação pós-cutover.

#### B.4 `scripts/gen-llms-txt.mjs` (refinamento)

Substituir stub por versão dinâmica que lê Firestore (drivers ativos, próximas etapas, news recentes) e gera `public/llms.txt` no postbuild.

### 3. Agente A (ud-backoffice) — CMS

Tudo descrito em `docs/UD_BACKOFFICE_CMS_SPEC.md`. Critério de pronto idem.

### 4. Smoke test integrado (humano + agentes)

1. Agente A publica uma notícia teste no backoffice HML
2. Backoffice POSTa pra `https://ud-site--juiz-ud-stage.us-east4.hosted.app/api/revalidate` (Agente B já tem que ter implementado)
3. Em <5s a página `/noticias/<slug>` no HML do site mostra a notícia
4. JSON-LD validado em https://validator.schema.org

### 5. Import WP (humano)

Após Agente B entregar `import-wp.mjs`:

```bash
# Dry-run primeiro em HML
node scripts/import-wp.mjs --base https://www.ultimatedrift.com.br --project juiz-ud-stage --dry --limit 10

# Real em HML
node scripts/import-wp.mjs --base https://www.ultimatedrift.com.br --project juiz-ud-stage

# Inspeção visual em next.ultimatedrift.com.br/noticias
# Se OK, repete em PRD
node scripts/import-wp.mjs --base https://www.ultimatedrift.com.br --project ultimate-drift-production
```

`src/lib/legacy-redirects.json` resultante é commitado no repo (não é gerado em runtime).

### 6. Fase 3 + cutover

Já fora do escopo desta fase. Ver plano original em `~/.claude/plans/ticklish-mapping-hennessy.md`.

## Não-objetivos Fase 2

- Bracket visual rico / mapas Disney (Fase 3)
- Feed Atom (Fase 3)
- Cutover de DNS (Fase 4)
- WYSIWYG / TipTap (não — markdown puro é suficiente)
