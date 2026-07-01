# Spec — Módulo CMS `content/` no `ud-backoffice`

> Documento a ser entregue ao agente que vai implementar o CMS no repositório
> `ud-backoffice` existente. Autocontido: agente lê esse arquivo e sabe
> exatamente o que criar, onde, com qual shape e como validar.
>
> **Repositório alvo**: `/Users/guardezi/Developer/ultimate/ud-backoffice/`
> (Next.js 16 + Firebase Admin + Tailwind v4 + next-intl 4 + App Hosting).
> Nunca criar repo/projeto novo. Espelhar padrões já existentes.

## Contexto — o que já está no ar

Existe um site público `ud-site` (repositório separado: `guardezi/ud-site`,
deployado em `https://ud-site--juiz-ud-stage.us-east4.hosted.app/`, futura
`www.ultimatedrift.com.br`) que já lê e renderiza as seguintes collections
Firestore em SSR:

- **`news/{slugBase}-{locale}`** — 17 docs já populados via
  `scripts/import-wp.mjs` (importados do WordPress legado). Consumido em
  `/noticias` (lista, 12 por página) e `/noticias/[slug]` (detalhe).
- **`driftCategories/{id}`** — 2 docs (`historia`, `noticia`) importados do WP.
  Ainda sem UI que consuma diretamente, mas o site tem `/categorias/[slug]`
  pronto pra receber conteúdo.
- **`content/{slug}-{locale}`** — 1 doc (`termos-pt-BR`). Consumido em
  `/termos`, `/sobre`, `/privacidade`.
- **`sponsors/{id}`** — 0 docs. Consumido em `/patrocinadores` (hoje serve
  snapshot HTML estático do WP como fallback).

O site tem um endpoint `POST /api/revalidate` protegido por **HMAC-SHA256**
que o backoffice deve chamar sempre que publicar/editar/arquivar conteúdo
pra invalidar os `unstable_cache` tags. Ver seção "API contract" abaixo.

O site também aceita **IndexNow ping** — quando uma notícia é publicada,
avisa Bing/Yandex/IA crawlers na hora. A key vive em `INDEXNOW_KEY` e o
arquivo de posse do domínio já está em `public/<KEY>.txt` no `ud-site`.

## Escopo — o que criar no `ud-backoffice`

Novo grupo `(dashboard)/content/` com 4 sub-rotas:

- **`news/`** — CRUD editorial das notícias (título, corpo markdown, capa,
  autor, categoria, tags, data de publicação, SEO overrides, locale)
- **`sponsors/`** — CRUD dos patrocinadores globais (nome, logo, site,
  tier, ordem)
- **`categories/`** — CRUD das drift categories (slug, nome, descrição,
  regras)
- **`pages/`** — Editor das 3 páginas estáticas × 3 locales = 9 docs fixos
  (sobre / termos / privacidade em pt-BR, en-US, es-ES)

Toda action deve:

1. Validar `requireRole(['admin','mkt','editor'])`
2. Grava/atualiza Firestore
3. Chama `revalidateSite(tags)` (HMAC → ud-site)
4. Se for publicação de notícia: também chama `pingIndexNow(urls)`
5. `revalidatePath` da própria rota do backoffice (`/content/news`, etc.)

## Schemas Firestore (fonte de verdade)

Manter estes shapes IDÊNTICOS ao que o `ud-site` já espera. Se mudar aqui,
quebra o site.

### `news/{slugBase}-{locale}`

Doc ID = `${slugBase}-${locale}` (ex: `campeoes-brasileiros-da-temporada-2025-pt-BR`).

O campo `slug` é gravado igual ao `slugBase` porque o site consulta por
`where("slug", "==", slug)` — grave os dois.

```ts
// ud-backoffice/src/lib/news/schema.ts
import { z } from "zod";

export const NEWS_LOCALES = ["pt-BR", "en-US", "es-ES"] as const;
export const NEWS_STATUSES = ["draft", "scheduled", "published", "archived"] as const;

export const newsInputSchema = z.object({
  slugBase: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/),
  locale: z.enum(NEWS_LOCALES),
  title: z.string().min(1).max(200),
  excerpt: z.string().max(400).default(""),
  body: z.string().max(50_000).default(""), // markdown
  coverImagePath: z.string().nullable().default(null),
  author: z.string().max(120).default(""),
  category: z.string().max(80).default(""),  // slug da drift category
  tags: z.array(z.string().max(50)).default([]),
  publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}/).nullable().default(null),
  status: z.enum(NEWS_STATUSES).default("draft"),
  seo: z.object({
    title: z.string().max(80).default(""),
    description: z.string().max(180).default(""),
    ogImagePath: z.string().nullable().default(null),
    canonical: z.string().url().nullable().default(null),
  }).default({}),
  // Preserva referência ao WordPress legado quando o doc veio do import-wp.
  wpId: z.number().int().positive().nullable().default(null),
  wpLink: z.string().url().nullable().default(null),
});
```

**Campos escritos automaticamente (não expor no form)**:
`slug` (= `slugBase`), `updatedAt` (`FieldValue.serverTimestamp()`),
`updatedBy` (session.uid), `importedAt` (só quando vem do WP).

**Índices compostos Firestore já criados no HML** (`juiz-ud-stage`):
- `(status ASC, locale ASC, publishedAt DESC)` — lista pública paginada
- `(wpId ASC, locale ASC)` — dedupe do import-wp

Se o CMS adicionar filtro por categoria ou por autor, criar índice
correspondente antes.

**Storage path da capa**: `news/{slugBase}-{locale}/cover-{stamp}.{ext}`.
A Cloud Function `storageImageVariantsOnObjectFinalized` (que vive em
`ud-app/functions`) gera automaticamente `_thumb.webp`, `_small.webp`,
`_medium.webp`, `_high.webp`. O `ud-site` consome via componente
`UDImage` (usa srcset com todas as variantes).

### `sponsors/{id}`

```ts
export const SPONSOR_TIERS = ["title", "official", "supporter", "media"] as const;

export const sponsorInputSchema = z.object({
  name: z.string().min(1).max(120),
  logoPath: z.string().nullable().default(null), // Storage: sponsors/{id}/logo-{stamp}.{ext}
  website: z.string().url().nullable().default(null),
  tier: z.enum(SPONSOR_TIERS).default("supporter"),
  order: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});
```

Doc ID = auto-id. Ordenação no site é por `order ASC`.

### `driftCategories/{id}`

```ts
export const driftCategoryInputSchema = z.object({
  slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(80),
  description: z.string().max(2000).default(""),
  icon: z.string().nullable().default(null), // Storage path opcional
  rules: z.string().max(10_000).default(""), // markdown
  order: z.number().int().min(0).default(0),
});
```

Doc ID = auto-id. `slug` é o identificador nas URLs (`/categorias/{slug}`).

O import-wp já criou 2 categorias (`historia` e `noticia`); complementar
com `iniciacao`, `pro`, `wildcard` etc. conforme o regulamento.

### `content/{slug}-{locale}`

```ts
export const CONTENT_PAGE_SLUGS = ["sobre", "termos", "privacidade"] as const;

export const contentPageInputSchema = z.object({
  slug: z.enum(CONTENT_PAGE_SLUGS),
  locale: z.enum(NEWS_LOCALES),
  title: z.string().min(1).max(200),
  body: z.string().max(50_000).default(""), // markdown
  seo: z.object({
    title: z.string().max(80).default(""),
    description: z.string().max(180).default(""),
  }).default({}),
});
```

Doc ID = `${slug}-${locale}`. UI mostra grid 3×3 = 9 cards.

## Estrutura de arquivos no `ud-backoffice`

```
ud-backoffice/src/app/(dashboard)/content/
├── layout.tsx                # gate requireRole(['admin','mkt','editor'])
├── page.tsx                  # dashboard: contadores (drafts, publicadas, agendadas)
├── news/
│   ├── page.tsx              # DataTable: title, status, publishedAt, locale, author
│   ├── new/page.tsx          # form criação
│   └── [id]/page.tsx         # form edição
├── sponsors/
│   ├── page.tsx
│   ├── new/page.tsx
│   └── [id]/page.tsx
├── categories/               # driftCategories
│   ├── page.tsx
│   ├── new/page.tsx
│   └── [id]/page.tsx
└── pages/                    # sobre/termos/privacidade × 3 locales
    ├── page.tsx              # grid 3×3 clicável
    └── [docId]/page.tsx      # editor pra 1 slug + locale

ud-backoffice/src/lib/
├── news/
│   ├── schema.ts             # Zod (ver acima)
│   ├── queries.ts            # server-only: listNews(filters,cursor), getNewsById, slugAvailable
│   └── actions.ts            # server actions: create/update/publish/archive/delete
├── sponsors/{schema,queries,actions}.ts
├── driftCategories/{schema,queries,actions}.ts
├── contentPages/{schema,queries,actions}.ts
├── revalidate-site.ts        # POST HMAC → ud-site /api/revalidate
└── indexnow.ts               # POST → api.indexnow.org (Bing/Yandex/IA)
```

Reutilizar sem duplicar:

- **Auth guard**: `import { requireRole } from "@/lib/auth/guards"` — já
  existe (`admin | cba | juiz | narrador | editor | mkt | piloto`). Adicionar
  `'editor'` ao array em `content/layout.tsx`.
- **Firestore admin**: `import { adminDb } from "@/lib/firebase/admin"`.
- **Server actions com Zod**: seguir padrão de
  `ud-backoffice/src/lib/raffles/actions.ts` (validate + admin op +
  revalidatePath + redirect).
- **DataTable, Pagination, Input, Button, PageHeader**: já em
  `ud-backoffice/src/components/ui/`.
- **Upload de imagem**: reusar `storage-client.ts` + `image-cropper` +
  padrão de `raffles` e `notifications`.
- **Sidebar/nav**: adicionar item "Conteúdo" apontando pra
  `/content` entre "Aprovações" e "Notificações". Icon: `FileText` de
  `lucide-react`.

## `lib/revalidate-site.ts` — contrato HMAC

```ts
import "server-only";
import crypto from "node:crypto";

const SITE_URL = process.env.UD_SITE_URL ?? "https://www.ultimatedrift.com.br";
const SECRET = process.env.REVALIDATE_SECRET ?? "";

export async function revalidateSite(tags: string[]): Promise<void> {
  if (!SECRET || tags.length === 0) return;
  const body = JSON.stringify({ tags, ts: Date.now() });
  const sig = crypto.createHmac("sha256", SECRET).update(body).digest("hex");
  try {
    const res = await fetch(`${SITE_URL}/api/revalidate`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-ud-signature": sig },
      body,
    });
    if (!res.ok) console.warn(`[revalidate-site] ${res.status} ${await res.text()}`);
  } catch (err) {
    console.warn("[revalidate-site] failed", err);
  }
}
```

**Tags que o ud-site conhece** (chame com o(s) apropriado(s)):

| Action | Tags |
|---|---|
| `publishNews`, `archiveNews`, `deleteNews` | `["news", "news:{slugBase}"]` |
| `saveSponsor`, `deleteSponsor` | `["sponsors"]` |
| `saveCategory`, `deleteCategory` | `["categories", "category:{slug}"]` |
| `saveContentPage` | `["content", "content:{slug}"]` |

O endpoint do site aceita qualquer array de strings; tags desconhecidas
são ignoradas silenciosamente. Não trava.

**Skew check**: o site rejeita requisições com `ts` mais velho que 5 min
(anti-replay). `Date.now()` no backoffice funciona porque ambos os lados
usam UTC do runtime.

**Secret configurado**:
- `juiz-ud-stage`: já gravado (usar mesmo valor no backoffice HML)
- `ultimate-drift-production`: ainda não configurado — humano fará
- Valor está em `/tmp/ud-revalidate-secret.txt` (arquivo local do dev que
  rodou este trabalho; se agente não tiver acesso, pedir).

Configurar no `ud-backoffice` (HML):
```bash
firebase apphosting:secrets:set REVALIDATE_SECRET --project juiz-ud-stage
# cola o valor do /tmp/ud-revalidate-secret.txt
```
Depois adicionar em `ud-backoffice/apphosting.yaml`:
```yaml
env:
  - variable: REVALIDATE_SECRET
    secret: REVALIDATE_SECRET
    availability: [RUNTIME]
  - variable: UD_SITE_URL
    value: https://ud-site--juiz-ud-stage.us-east4.hosted.app
    availability: [BUILD, RUNTIME]
```
E o equivalente em `apphosting.production.yaml`.

## `lib/indexnow.ts` — ping Bing/Yandex/IA

```ts
import "server-only";

const KEY = process.env.INDEXNOW_KEY ?? "";
const HOST = process.env.NEXT_PUBLIC_UD_HOST ?? "www.ultimatedrift.com.br";

export async function pingIndexNow(urls: string[]): Promise<void> {
  if (!KEY || urls.length === 0) return;
  try {
    await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        host: HOST,
        key: KEY,
        keyLocation: `https://${HOST}/${KEY}.txt`,
        urlList: urls,
      }),
    });
  } catch (err) {
    console.warn("[indexnow] failed", err);
  }
}
```

**Key**: `a7fd57bfd7ae48cf6e14661c4e4e5db5` (já configurada no HML;
arquivo `public/a7fd57bfd7ae48cf6e14661c4e4e5db5.txt` já commitado no
`ud-site`). Adicionar como secret no backoffice:
```bash
firebase apphosting:secrets:set INDEXNOW_KEY --project juiz-ud-stage
# valor: a7fd57bfd7ae48cf6e14661c4e4e5db5
```

Chamar em `publishNews`:
```ts
await pingIndexNow([`https://${HOST}/noticias/${slugBase}`]);
```

## UX esperada por página

Todas as páginas usam layout `(dashboard)` do backoffice (sidebar +
PageHeader + tokens Tailwind v4). Nada novo em design system.

### `content/news/page.tsx` (lista)

- `PageHeader` com título "Conteúdo · Notícias", botão "Nova notícia"
- Filtros no topo: status (select), locale (select), busca por título
- `DataTable`:
  | Cover (thumb 40px) | Título | Locale (chip) | Status (badge) | Data | Autor | Actions |
- Ações inline: Editar, Publicar/Arquivar (dependendo do status), Excluir
- Paginação server-side com cursor (padrão do backoffice)

### `content/news/new/page.tsx` e `[id]/page.tsx` (editor)

Layout 2 colunas:

**Esquerda (60%)**:
- Title
- Slug (auto-gerado do title, editável, validação de unicidade via
  `slugAvailable`)
- Excerpt (textarea 3 linhas)
- Body (textarea grande, min 400px, com preview server-side em tab
  paralelo — botão "Preview" alterna). Renderização do preview usa
  `marked` (mesma lib do `ud-site/src/lib/utils/markdown.ts`).

**Direita (40%)**:
- **Cover**: upload via componente existente do backoffice, salva em
  `news/{slugBase}-{locale}/cover-{stamp}.{ext}`. Preview em thumb.
- Locale (select — cria doc `{slugBase}-{locale}` independente por idioma;
  o mesmo `slugBase` pode ter 3 versões)
- Status (select: draft/scheduled/published/archived)
- publishedAt (date input, obrigatório se status = scheduled ou published)
- Author (text)
- Category (select preenchido de `listDriftCategories()`)
- Tags (chip input separado por vírgula)
- Collapse "SEO overrides":
  - title (fallback: title do post)
  - description (fallback: excerpt)
  - ogImagePath (upload separado ou reusa cover)
  - canonical (URL)

**Botões**:
- "Salvar rascunho" → `status: 'draft'`
- "Publicar" → `status: 'published'` + `publishedAt = today se null`

**Ao publicar**:
1. `adminDb.collection("news").doc(docId).set(payload, {merge: true})`
2. `await revalidateSite(["news", `news:${slugBase}`])`
3. `await pingIndexNow([`https://<host>/noticias/${slugBase}`])`
4. `revalidatePath("/content/news")`
5. `redirect("/content/news")`

### `content/sponsors/*`

- Lista simples ordenada por `order`, com toggle `isActive`
- Form: name, website, tier (select), order (number), upload de logo
  (transparent PNG preferido; path `sponsors/{id}/logo-{stamp}.{ext}`)
- Preview do logo grande no form

### `content/categories/*`

- Lista + form básico
- `slug` gerado do name, editável, único
- `description` (textarea curta)
- `rules` (textarea markdown longa — regulamento da categoria)
- `icon` (upload opcional)

### `content/pages/*`

- `page.tsx` = grid 3×3 (sobre / termos / privacidade × pt-BR / en-US / es-ES).
  Cada card mostra "Editar" e status (existe/vazio).
- `[docId]/page.tsx` (docId = `${slug}-${locale}`) — editor simples:
  title + body markdown + SEO. Salva com `save` → `revalidateSite(["content", `content:${slug}`])`.

## Config env

Backoffice já tem Firebase config completo. Adicionar:

```env
UD_SITE_URL=https://ud-site--juiz-ud-stage.us-east4.hosted.app
NEXT_PUBLIC_UD_HOST=ud-site--juiz-ud-stage.us-east4.hosted.app
REVALIDATE_SECRET=<mesmo valor do ud-site HML>
INDEXNOW_KEY=a7fd57bfd7ae48cf6e14661c4e4e5db5
```

Em produção substituir por `www.ultimatedrift.com.br`.

## Sidebar

Adicionar em `ud-backoffice/src/components/layout/Sidebar.tsx` (ou onde
esteja o array de nav):

```tsx
{ href: "/content", label: "Conteúdo", icon: FileText },
```

Posicionar após "Aprovações", antes de "Notificações".

## Como validar (critério de pronto)

Roteiro executável pelo próprio agente antes de considerar entregue.

1. **Build local passa**:
   ```bash
   cd ud-backoffice
   pnpm install
   pnpm typecheck && pnpm build
   ```

2. **Criar notícia teste em rascunho**:
   - Login como admin no backoffice HML
   - `/content/news/new` → preencher tudo, subir cover PNG, "Salvar rascunho"
   - Confere no Firestore console: doc criado em `news/{slug}-pt-BR`
     com `status: 'draft'`

3. **Publicar e ver aparecer no site**:
   - Editar o mesmo doc, "Publicar"
   - Nos logs do backoffice deve aparecer `[revalidate-site] 200` (ou
     silêncio, sem warning)
   - Em menos de 5s, `https://ud-site--juiz-ud-stage.us-east4.hosted.app/noticias`
     lista a nova notícia
   - `https://ud-site--juiz-ud-stage.us-east4.hosted.app/noticias/<slug>`
     retorna 200 com o body renderizado e cover no hero (via `UDImage`
     com srcset)

4. **JSON-LD válido no detalhe**:
   ```bash
   curl -s https://.../noticias/<slug> | grep -oE '<script type="application/ld\+json">[^<]+' | head -1
   ```
   Colar em https://validator.schema.org — deve validar como `NewsArticle`
   sem erros.

5. **IndexNow ping recebido** (Bing Webmaster Tools sob
   `www.ultimatedrift.com.br` mostra "URLs submitted via IndexNow" > 0).

6. **Arquivar volta a some da lista**:
   - Editar, "Arquivar"
   - `/noticias` no site não lista mais em <2min

7. **Sponsor**: criar 1 sponsor com logo → aparece em `/patrocinadores`
   no site (quando essa página migrar do snapshot; hoje só valida que
   o doc existe e o site carrega sem erro).

8. **Category**: criar 1 category → `/categorias/{slug}` no site retorna
   200 (mesmo comentário).

9. **Content page**: editar `sobre-pt-BR` → `/sobre` no site mostra o
   novo body markdown convertido.

10. **Sem regressão nas outras áreas do backoffice** (approvals,
    notifications, raffles, users, events) — nenhuma dessas depende de
    arquivos alterados.

## Fora de escopo (não implementar agora)

- **Migração das notícias do WP** — já feita via `scripts/import-wp.mjs`
  do `ud-site`. 17 posts já em `news/`. Se rodar de novo em PRD, o script
  é idempotente por `wpId`.
- **WYSIWYG / TipTap / Lexical** — usar markdown puro com `<Textarea>`
  + preview. Escopo controlado.
- **Versionamento** de edições (histórico). Fase 3.
- **Publicação agendada automática** (`status: scheduled` + Cloud
  Function que promove). Fase 3 — hoje o admin publica manualmente.
- **Editor multi-idioma sincronizado** — cada locale é um doc separado.
  Se precisar de "traduzir de pt-BR pra en-US", faz manualmente por
  enquanto (copiar doc, mudar locale, editar texto).
- **Upload inline no markdown** — se editor precisar de imagem no meio
  do body, subir manualmente no Storage e colar path
  `news/{slugBase}-{locale}/inline-<hash>.jpg` no markdown. O
  `ud-site` renderiza via `UDImage`.

## Referências rápidas

- Padrão de server action com Zod:
  `ud-backoffice/src/lib/raffles/actions.ts`
- Padrão de list page com DataTable + filtros:
  `ud-backoffice/src/app/(dashboard)/users/page.tsx`
- Padrão de form 2 colunas com upload:
  `ud-backoffice/src/app/(dashboard)/raffles/new/page.tsx`
- Firebase Admin init:
  `ud-backoffice/src/lib/firebase/admin.ts`
- Auth guard:
  `ud-backoffice/src/lib/auth/guards.ts` (requireRole)
- Contrato do site (shapes que o site consome):
  `ud-site/src/lib/news/queries.ts`,
  `ud-site/src/lib/sponsors/queries.ts`,
  `ud-site/src/lib/driftCategories/queries.ts`,
  `ud-site/src/lib/contentPages/queries.ts`
- Endpoint revalidate no site:
  `ud-site/src/app/api/revalidate/route.ts`
- Import histórico WP:
  `ud-site/scripts/import-wp.mjs`

## Deploy

Fluxo idêntico ao ud-backoffice atual:

- **HML**: push em `main` → auto-rollout do App Hosting (`juiz-ud-stage`
  backend `ud-backoffice`). Já configurado.
- **PRD**: tag `v*` → gate manual via GitHub Environment `production`.

Não criar workflow novo — os secretos `REVALIDATE_SECRET` e `INDEXNOW_KEY`
são carregados em runtime via `apphosting.yaml` (bloco `env: secret:`).

---

**Dúvidas sobre o site que a spec não cobre**: consultar
`ud-site/README.md` e os `queries.ts` de cada módulo em
`ud-site/src/lib/`. Se ainda faltar, perguntar ao dev do site (guardezi).
