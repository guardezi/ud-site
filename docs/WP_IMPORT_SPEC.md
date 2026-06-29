# Spec — Script de migração WordPress → Firestore + Storage

> Script one-shot que vive em `ud-site/scripts/import-wp.mjs`. Lê WordPress REST API (`wp-json/wp/v2/*`) do site legado e popula as collections `news`, `content`, `driftCategories` no Firebase do projeto alvo + faz upload das mídias pro Storage. Idempotente (re-run não duplica).

## Quando rodar

- **HML primeiro**: contra `juiz-ud-stage` com `--dry` ligado pra validar mapeamento
- **PRD**: contra `ultimate-drift-production` poucas horas antes do cutover de domínio, pra que o ranking equity seja preservado quando DNS for trocado
- **Re-runs**: o script é idempotente — se um post foi editado no WP entre import e cutover, basta re-rodar e ele atualiza só os docs com `wpModified > firestoreUpdatedAt`

## Pré-requisitos

```bash
cd ud-site
pnpm add -D turndown jsdom yargs
```

Service account JSON do projeto alvo, com roles:
- Firestore User
- Storage Admin (precisa pra subir mídia com `predefinedAcl: publicRead`)

```bash
export FIREBASE_SERVICE_ACCOUNT="$(cat ../ultimate-drift-production-*.json)"
node scripts/import-wp.mjs --base https://www.ultimatedrift.com.br --project ultimate-drift-production
```

## Argumentos

| Flag | Default | Descrição |
|---|---|---|
| `--base <url>` | `https://www.ultimatedrift.com.br` | URL base do WP (sem trailing slash) |
| `--project <id>` | env `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID alvo |
| `--bucket <name>` | `<project>.appspot.com` | Storage bucket |
| `--limit <n>` | (todos) | Importa só os primeiros N posts (útil pra dry-run) |
| `--from-cache` | `false` | Usa cache local `.cache/wp-*.json` em vez de fetch HTTP |
| `--dry` | `false` | Loga ações mas não escreve no Firestore/Storage |
| `--skip-images` | `false` | Pula upload de mídia (mais rápido pra dry-run) |
| `--only <kind>` | (todos) | `posts` \| `pages` \| `categories` |

## Endpoints WordPress consumidos

| Recurso | Endpoint |
|---|---|
| Posts | `/wp-json/wp/v2/posts?_embed&per_page=100&page=N` |
| Pages | `/wp-json/wp/v2/pages?_embed&per_page=100&page=N` |
| Categories | `/wp-json/wp/v2/categories?per_page=100&page=N` |
| Media | URLs vindas via `_embedded["wp:featuredmedia"]` e via parse do `content.rendered` |

Header `X-WP-TotalPages` indica paginação. Loop até esgotar.

## Algoritmo

### 1. Categorias

```js
for (const wpCat of allCategories) {
  const slug = wpCat.slug; // já é lowercase-hyphen
  const existing = await db.collection("driftCategories")
    .where("slug", "==", slug).limit(1).get();
  if (!existing.empty) continue; // idempotente
  await db.collection("driftCategories").add({
    slug,
    name: wpCat.name,
    description: stripHtml(wpCat.description ?? ""),
    icon: null,
    rules: "",
    order: wpCat.count ?? 0,
    source: "wp-import",
    wpId: wpCat.id,
  });
}
```

### 2. Posts → `news`

Para cada post:

```js
const wpId = post.id;
const slugBase = post.slug;          // PRESERVAR — equity SEO depende disso
const locale = "pt-BR";              // WP atual é pt-BR-only
const docId = `${slugBase}-${locale}`;

// Idempotência
const existing = await db.collection("news").doc(docId).get();
if (existing.exists && existing.data().updatedAt >= isoToMs(post.modified_gmt)) continue;

// Markdown
const html = post.content.rendered;
const body = htmlToMarkdown(html, { uploadImageInline });  // turndown + image rewriter

// Capa
const featured = post._embedded?.["wp:featuredmedia"]?.[0];
let coverImagePath = null;
if (featured?.source_url && !flags.skipImages) {
  coverImagePath = await uploadMedia({
    sourceUrl: featured.source_url,
    destPath: `news/${docId}/cover-original.${ext(featured.source_url)}`,
    alt: featured.alt_text,
  });
}

// Autor
const author = post._embedded?.author?.[0]?.name ?? "";

// Categorias (primeira)
const wpCatId = post.categories?.[0];
const category = wpCatId ? categorySlugMap.get(wpCatId) : "";

// Tags
const tags = (post._embedded?.["wp:term"]?.[1] ?? []).map(t => t.slug);

// SEO meta — Yoast/RankMath usam meta fields; se não presentes, derive de excerpt
const seo = {
  title: post.yoast_head_json?.title ?? post.title.rendered,
  description: stripHtml(post.excerpt.rendered).slice(0, 180),
  ogImagePath: coverImagePath,
  canonical: null,
};

const payload = {
  slug: slugBase,
  slugBase,
  locale,
  title: decodeEntities(post.title.rendered),
  excerpt: stripHtml(post.excerpt.rendered).slice(0, 400),
  body,
  coverImagePath,
  author,
  category,
  tags,
  publishedAt: post.date_gmt.slice(0, 10),
  status: "published",
  seo,
  wpId,
  wpLink: post.link,
  updatedAt: isoToMs(post.modified_gmt),
  importedAt: Date.now(),
};

if (flags.dry) {
  console.log(`[dry] would upsert news/${docId}`);
} else {
  await db.collection("news").doc(docId).set(payload, { merge: true });
}
```

### 3. Pages → `content`

Mesma lógica de posts, mas:
- Mapeamento: `sobre` (WP page slug `sobre` ou `about`), `termos` (`termos`, `terms`), `privacidade` (`privacidade`, `privacy`)
- Pages fora desse set: log como warning e skip (não há rota correspondente no `ud-site`)

### 4. Imagens inline no body

A função `htmlToMarkdown(html, { uploadImageInline })` faz parse com `jsdom`:

```js
const dom = new JSDOM(html);
const imgs = dom.window.document.querySelectorAll("img");
for (const img of imgs) {
  const src = img.getAttribute("src");
  if (!src || src.startsWith("data:")) continue;
  const destPath = await uploadImageInline({
    sourceUrl: src,
    destPath: `news/${docId}/inline-${shortHash(src)}.${ext(src)}`,
  });
  img.setAttribute("src", destPath);  // path Storage relativo — site resolve via image-variants
}
const cleanedHtml = dom.window.document.body.innerHTML;
return turndown.turndown(cleanedHtml);
```

### 5. `legacy-redirects.json`

Após importar todos os posts, gera `ud-site/src/lib/legacy-redirects.json`:

```js
const redirects = {};
for (const post of allPosts) {
  // Path antigo no WP: /<slug>/, /?p=<id>, /<year>/<month>/<slug>/, depending on permalink structure
  const oldPath = new URL(post.link).pathname.replace(/\/$/, "") || "/";
  const newPath = `/noticias/${post.slug}`;
  if (oldPath !== newPath) {
    redirects[oldPath] = { to: newPath, code: 301 };
  }
}
// Categorias WP /category/<slug>/ → /categorias/<slug>
for (const cat of allCategories) {
  redirects[`/category/${cat.slug}`] = { to: `/categorias/${cat.slug}`, code: 301 };
}
// Pages → content slugs já tratado no mapeamento de pages

await fs.writeFile("./src/lib/legacy-redirects.json", JSON.stringify(redirects, null, 2));
```

> O middleware do `ud-site` (já implementado) lê esse JSON em cold start e faz 301 antes do roteamento next-intl.

### 6. Upload helper

```js
import { Storage } from "@google-cloud/storage";

async function uploadMedia({ sourceUrl, destPath, alt }) {
  const buf = await downloadBuffer(sourceUrl);  // fetch com retry exponencial
  const file = bucket.file(destPath);
  await file.save(buf, {
    contentType: mimeFromUrl(sourceUrl),
    metadata: { metadata: { alt: alt ?? "" } },
    predefinedAcl: "publicRead",
  });
  // CF storageImageVariantsOnObjectFinalized gera _thumb/_small/_medium/_high.webp automaticamente
  return destPath;
}
```

Cache local: `.cache/wp-media/{sha1(sourceUrl)}.<ext>` evita re-download em re-runs.

### 7. Cache de WP API

```js
const cachePath = `.cache/wp-posts-page-${n}.json`;
if (flags.fromCache && exists(cachePath)) {
  return JSON.parse(await fs.readFile(cachePath));
}
const res = await fetch(`${base}/wp-json/wp/v2/posts?_embed&per_page=100&page=${n}`);
const data = await res.json();
await fs.writeFile(cachePath, JSON.stringify(data, null, 2));
return data;
```

## Verificação pós-import

Script complementar `verify-migration.mjs`:

1. Para cada doc em `news` com `wpId`:
   - `HEAD` na URL antiga (`https://www.ultimatedrift.com.br/<post.slug>/` ou `wpLink`) → deve retornar `301`
   - `Location` deve apontar pra nova URL canônica
   - `HEAD` na nova URL → deve retornar `200`
2. Conta total importado vs total WP → deve bater
3. Lista posts com `coverImagePath: null` (capa não encontrada) — flag pra revisar manualmente

## Estimativa de duração

Para ~500 posts com média de 3 imagens cada (~2000 mídias):
- HTTP fetch WP: ~5 min (com cache)
- Upload Storage: ~25 min (sequencial; pode paralelizar até 8 workers)
- Writes Firestore: ~3 min (batch de 500)

Total: ~30–40 minutos primeiro run; ~2 min em re-runs (com cache).

## Critério de pronto

- [ ] `pnpm node scripts/import-wp.mjs --dry --limit 5` lista 5 posts sem escrever nada
- [ ] Run real popula `news`, `driftCategories`, `content` no Firestore
- [ ] Storage bucket tem `news/<slug>-pt-BR/cover-original.*` pra cada post com capa
- [ ] CF `storageImageVariantsOnObjectFinalized` gerou `_thumb/_small/_medium/_high.webp` (verificar 5 manualmente)
- [ ] `public/legacy-redirects.json` (na verdade `src/lib/legacy-redirects.json`) populado
- [ ] `verify-migration.mjs` passa 100% após cutover de DNS
- [ ] Re-run com `--limit 10` em posts já importados é no-op
