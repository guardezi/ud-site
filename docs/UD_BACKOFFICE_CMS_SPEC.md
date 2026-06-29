# Spec — Módulo CMS no `ud-backoffice` para alimentar o `ud-site`

> Esta spec é o contrato entre os dois repositórios. Outro agente deve usá-la pra implementar o módulo `(dashboard)/content/*` dentro de `/Users/guardezi/Developer/ultimate/ud-backoffice/` **sem nenhuma mudança no `ud-site`** além das collections já tipadas em `ud-site/src/lib/{news,sponsors,driftCategories,contentPages}/queries.ts`.

## Contexto

O `ud-site` (Next.js SSR público em `ultimatedrift.com.br`) consome dados editoriais do Firestore. Hoje todas as queries existem mas as collections estão vazias. O backoffice precisa de uma seção `content/` pra que admin/mkt/editor consigam editar:

- **Notícias** (substituem WordPress posts)
- **Patrocinadores globais** (catálogo central, antes só em `drivers[].patrocinio`)
- **Categorias de drift** (catálogo, antes só inline em `drivers[].categoriaPiloto`)
- **Páginas estáticas** (sobre, termos, privacidade — substituem WP pages)

Toda alteração no CMS dispara revalidação on-demand no `ud-site` via HMAC. Toda publicação de notícia dispara IndexNow ping pra acelerar indexação em Bing/IA crawlers.

## Schemas Firestore (fontes de verdade)

Todas usam doc ID estável (não auto-gerado). Locale entra no doc ID pra que listagens filtrem direto.

### `news/{slugBase}-{locale}`

```ts
// ud-backoffice/src/lib/news/schema.ts
import { z } from "zod";

export const NEWS_LOCALES = ["pt-BR", "en-US", "es-ES"] as const;
export const NEWS_STATUSES = ["draft", "scheduled", "published", "archived"] as const;

export const newsInputSchema = z.object({
  slugBase: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/, "lowercase-hyphen-only"),
  locale: z.enum(NEWS_LOCALES),
  title: z.string().min(1).max(200),
  excerpt: z.string().max(400).default(""),
  body: z.string().max(50_000).default(""), // markdown
  coverImagePath: z.string().nullable().default(null),
  author: z.string().max(120).default(""),
  category: z.string().max(80).default(""),
  tags: z.array(z.string().max(50)).default([]),
  publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}/).nullable().default(null), // ISO date
  status: z.enum(NEWS_STATUSES).default("draft"),
  seo: z.object({
    title: z.string().max(80).default(""),
    description: z.string().max(180).default(""),
    ogImagePath: z.string().nullable().default(null),
    canonical: z.string().url().nullable().default(null),
  }).default({}),
  // Quando vier do WordPress, preserva referência cruzada.
  wpId: z.number().int().positive().nullable().default(null),
  wpLink: z.string().url().nullable().default(null),
});
```

Doc ID = `${slugBase}-${locale}`. O `slug` que o `ud-site` consulta = `slugBase` (sem locale — o site filtra por `where("locale", "==", currentLocale)`).

**Path canônico no Storage para a capa**: `news/{slugBase}-{locale}/cover-{stamp}.{ext}`. A CF `storageImageVariantsOnObjectFinalized` já gera variantes `_thumb/_small/_medium/_high.webp` com `predefinedAcl: 'publicRead'` — o site resolve via `imageHigh(coverImagePath)`.

**Índices Firestore compostos** (declarar em `firestore.indexes.json` no projeto raiz):
```json
{
  "indexes": [
    {
      "collectionGroup": "news",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "locale", "order": "ASCENDING" },
        { "fieldPath": "publishedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "news",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "slug", "order": "ASCENDING" },
        { "fieldPath": "locale", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "news",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "wpId", "order": "ASCENDING" },
        { "fieldPath": "locale", "order": "ASCENDING" }
      ]
    }
  ]
}
```

> Nota: a query em `ud-site/src/lib/news/queries.ts` usa `where("slug", "==", slug).where("locale", "==", locale).where("status", "==", "published").limit(1)`. Manter `slug` (sinônimo de `slugBase`) gravado como campo escalar pra esse lookup. Acima fiz dupla escrita: `slug: slugBase, slugBase: slugBase` no doc — a action grava os dois.

### `sponsors/{id}`

```ts
// ud-backoffice/src/lib/sponsors/schema.ts
export const SPONSOR_TIERS = ["title", "official", "supporter", "media"] as const;

export const sponsorInputSchema = z.object({
  name: z.string().min(1).max(120),
  logoPath: z.string().nullable().default(null), // Storage path: sponsors/{id}/logo-{stamp}.{ext}
  website: z.string().url().nullable().default(null),
  tier: z.enum(SPONSOR_TIERS).default("supporter"),
  order: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});
```

Doc ID = `auto-id` ou slug (sua escolha; sugiro auto-id pra evitar renames).

### `driftCategories/{id}`

```ts
// ud-backoffice/src/lib/driftCategories/schema.ts
export const driftCategoryInputSchema = z.object({
  slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(80),
  description: z.string().max(2000).default(""),
  icon: z.string().nullable().default(null), // Storage path opcional
  rules: z.string().max(10_000).default(""), // markdown
  order: z.number().int().min(0).default(0),
});
```

Doc ID = `auto-id`; `slug` é único e usado nas URLs.

### `content/{slug}-{locale}`

```ts
// ud-backoffice/src/lib/contentPages/schema.ts
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

Doc ID = `${slug}-${locale}`. Páginas são apenas 3 — UI mostra as 3 já listadas pra cada locale (matriz 3 × 3 = 9 docs no total).

## Estrutura de arquivos no `ud-backoffice`

```
ud-backoffice/src/app/(dashboard)/content/
├── layout.tsx                            # gate requireRole(['admin','mkt','editor']); sidebar/breadcrumb
├── page.tsx                              # dashboard de content (contadores: news drafts pendentes, etc)
├── news/
│   ├── page.tsx                          # DataTable: title, status, publishedAt, locale, author, actions
│   ├── new/page.tsx                      # form criação
│   └── [id]/page.tsx                     # form edição + tabs (conteúdo / SEO / preview)
├── sponsors/
│   ├── page.tsx
│   ├── new/page.tsx
│   └── [id]/page.tsx
├── categories/                           # driftCategories
│   ├── page.tsx
│   ├── new/page.tsx
│   └── [id]/page.tsx
└── pages/                                # about/termos/privacidade
    ├── page.tsx                          # lista os 3 slugs × 3 locales (9 cards)
    └── [docId]/page.tsx                  # editor

ud-backoffice/src/lib/
├── news/
│   ├── schema.ts                         # Zod (NewsInput, NewsItem)
│   ├── queries.ts                        # server-only: listNews, getNewsById, slugAvailable
│   └── actions.ts                        # server actions: create/update/publish/archive/delete
├── sponsors/{schema,queries,actions}.ts
├── driftCategories/{schema,queries,actions}.ts
├── contentPages/{schema,queries,actions}.ts
└── revalidate-site.ts                    # POST HMAC → ud-site /api/revalidate
```

## Server actions (padrão)

Espelhar o padrão de `ud-backoffice/src/lib/notifications/actions.ts` ou `raffles/actions.ts`:

1. `"use server"` no topo
2. `requireRole(['admin','mkt','editor'])` antes de qualquer operação
3. Validar input com `safeParse` do Zod
4. Operar com `adminDb` / `adminAuth` / `adminStorage`
5. `revalidatePath()` pra páginas do backoffice + `revalidateSite()` pras tags do `ud-site`
6. Toast / redirect

Exemplo `news/actions.ts`:

```ts
"use server";
import { requireRole } from "@/lib/auth/guards";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { newsInputSchema } from "./schema";
import { revalidateSite } from "@/lib/revalidate-site";
import { pingIndexNow } from "@/lib/indexnow";
import { revalidatePath } from "next/cache";

export async function publishNews(rawInput: unknown) {
  const session = await requireRole(["admin", "mkt", "editor"]);
  const parsed = newsInputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, errors: parsed.error.flatten() };

  const input = parsed.data;
  const docId = `${input.slugBase}-${input.locale}`;
  const payload = {
    ...input,
    slug: input.slugBase,                 // sinônimo lido pelo site
    status: "published",
    publishedAt: input.publishedAt ?? new Date().toISOString().slice(0, 10),
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: session.uid,
  };
  await adminDb.collection("news").doc(docId).set(payload, { merge: true });

  await revalidateSite([`news`, `news:${input.slugBase}`]);
  await pingIndexNow([
    `https://www.ultimatedrift.com.br/noticias/${input.slugBase}`,
  ]);
  revalidatePath("/(dashboard)/content/news");
  return { ok: true, docId };
}
```

## `lib/revalidate-site.ts` (HMAC → ud-site)

```ts
import "server-only";
import crypto from "node:crypto";

const SITE_URL = process.env.UD_SITE_URL ?? "https://www.ultimatedrift.com.br";
const SECRET = process.env.REVALIDATE_SECRET ?? "";

export async function revalidateSite(tags: string[]): Promise<void> {
  if (!SECRET) {
    console.warn("[revalidate-site] REVALIDATE_SECRET vazio — skip");
    return;
  }
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

Secret deve ser gravado nos dois lados:
- `ud-backoffice`: `firebase apphosting:secrets:set REVALIDATE_SECRET --project juiz-ud-stage` + `--project ultimate-drift-production`
- `ud-site`: idem, e o `/api/revalidate` valida o HMAC (TODO Fase 2 do ud-site — ver seção "Lado do ud-site")

## `lib/indexnow.ts` (Bing/Yandex/IAs)

```ts
import "server-only";

const KEY = process.env.INDEXNOW_KEY ?? ""; // gerar uma vez via https://www.bing.com/indexnow
const HOST = "www.ultimatedrift.com.br";

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

> Setup adicional: salvar `public/{KEY}.txt` no `ud-site` com o valor `KEY` como conteúdo. IndexNow valida posse do domínio assim.

## UI esperada

### `content/news/page.tsx` (lista)
- Reusar `DataTable` + `Pagination` existentes
- Colunas: cover thumb, title, locale (chip), status (badge), publishedAt, author, actions (editar/publicar/arquivar/deletar)
- Filtros: status, locale, busca por título (client-side ou server-side com `where`)
- Botão "Nova notícia"

### `content/news/new/page.tsx` e `[id]/page.tsx` (editor)
- Form em duas colunas:
  - **Esquerda (60%)**: title, slugBase (auto-gerado + edit manual), excerpt, body (Textarea grande markdown) + preview ao lado (render via `marked` mesma lib do site)
  - **Direita (40%)**: cover upload (`buildAssetPath('news', slugBase, file)` → `storage-client.ts` existente), locale picker, status, publishedAt, author, category (select com `listDriftCategories`), tags (chip input), bloco SEO collapse
- Botões: "Salvar rascunho" (status=draft) e "Publicar" (status=published — chama publishNews)

### `content/sponsors/*`
- Lista simples; form com name, website, tier (select), upload do logo (`sponsors/{id}/logo-*`), order, isActive
- Preview do logo

### `content/categories/*`
- Lista, form com slug + name + description + rules markdown + icon upload

### `content/pages/*`
- 9 cards (3 slugs × 3 locales). Cada um abre o editor pra `content/{slug}-{locale}`

Todas as actions chamam `revalidateSite([...])` com as tags certas:

| Action | Tags |
|---|---|
| publishNews / archiveNews | `news`, `news:{slugBase}` |
| saveSponsor / deleteSponsor | `sponsors` |
| saveCategory / deleteCategory | `categories`, `category:{slug}` |
| savePage | `content`, `content:{slug}` |

## Lado do `ud-site` — Fase 2 (referência cruzada)

O `ud-site` precisa de **2 endpoints novos** pra Fase 2 começar a funcionar:

### `src/app/api/revalidate/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import crypto from "node:crypto";

const SECRET = process.env.REVALIDATE_SECRET ?? "";

export async function POST(req: NextRequest) {
  if (!SECRET) return NextResponse.json({ ok: false, reason: "no-secret" }, { status: 503 });
  const raw = await req.text();
  const sig = req.headers.get("x-ud-signature") ?? "";
  const expected = crypto.createHmac("sha256", SECRET).update(raw).digest("hex");
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return NextResponse.json({ ok: false, reason: "bad-signature" }, { status: 401 });
  }
  const body = JSON.parse(raw) as { tags?: string[] };
  for (const tag of body.tags ?? []) revalidateTag(tag);
  return NextResponse.json({ ok: true, revalidated: body.tags ?? [] });
}

export const runtime = "nodejs";
```

### `public/{INDEXNOW_KEY}.txt`

Conteúdo: a própria key. Gerar uma vez via [Bing Webmaster](https://www.bing.com/indexnow), commitar.

## Roles + gating

Reusar `requireRole(['admin','mkt','editor'])` de `ud-backoffice/src/lib/auth/guards.ts`. O grupo `(dashboard)/content/layout.tsx` faz redirect se desautorizado.

Adicionar `'editor'` ao tipo `Role` em `ud-backoffice/src/lib/auth/guards.ts` se ainda não existir (verificar — o tipo já lista admin/mkt/editor/cba/juiz/narrador/piloto). Custom claim `editor` provavelmente já existe no token; se não, atualizar `users/actions.ts` pra permitir setá-la.

## Navegação no backoffice

Adicionar item "Conteúdo" no sidebar (`ud-backoffice/src/components/layout/Sidebar.tsx` — ou onde estiver o nav). Posicionar entre "Aprovações" e "Notificações". Icon: `FileText` (lucide).

## Critério de pronto

- [ ] Editor admin/mkt cria uma notícia em rascunho, faz upload de capa, salva
- [ ] Editor clica "Publicar" → doc em `news/...` muda pra `status: 'published'`
- [ ] `https://next.ultimatedrift.com.br/noticias` lista a notícia em <2 minutos (revalidate on-demand) ou <60s (fallback ISR)
- [ ] Página `/noticias/{slug}` retorna 200 com JSON-LD NewsArticle válido
- [ ] Bing IndexNow recebe ping (verificar no Bing Webmaster Tools)
- [ ] Logs no Cloud Run mostram `[revalidate-site] 200` no backoffice
- [ ] Editor consegue: criar sponsor, marcar inactive, mudar order
- [ ] Editor consegue: criar drift category, editar descrição/rules
- [ ] Editor consegue: editar página "sobre" em pt-BR/en-US/es-ES separadamente
- [ ] Sem acesso pra roles fora de admin/mkt/editor (CBA, juiz, piloto, etc não veem `/content`)

## Referências internas (paths)

- Padrão de server action: `ud-backoffice/src/lib/users/actions.ts`
- Padrão de form + upload: `ud-backoffice/src/lib/raffles/actions.ts` + componentes em `(dashboard)/raffles/`
- Padrão de listing: `ud-backoffice/src/app/(dashboard)/users/page.tsx`
- DataTable + Pagination: `ud-backoffice/src/components/ui/`
- Upload helper: `ud-backoffice/src/lib/firebase/storage-client.ts` (`buildAssetPath`, `uploadAndResolveUrl`)
- Schemas no `ud-site` (refs canônicas do shape final): `ud-site/src/lib/{news,sponsors,driftCategories,contentPages}/queries.ts`

## Out of scope desta spec

- Migração do WordPress (`scripts/import-wp.mjs` vive no `ud-site`, ver `docs/WP_IMPORT_SPEC.md`)
- Endpoint `/api/revalidate` no `ud-site` (mostrado aqui só pra referência cruzada — será implementado no `ud-site` quando o backoffice estiver pronto)
- WYSIWYG / TipTap / Lexical — usar markdown puro com `<Textarea>` + preview server-rendered
- Versionamento / histórico de edições (Fase 3)
- Programação de publicação (status=scheduled tem schema mas Cloud Function que ativa fica pra Fase 3)
