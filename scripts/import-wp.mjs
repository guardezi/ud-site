#!/usr/bin/env node
/**
 * Migração one-shot WordPress → Firestore + Storage.
 *
 * Lê WP REST API (/wp-json/wp/v2/*), converte posts/pages pra markdown, baixa
 * mídia pro Storage (CF storageImageVariantsOnObjectFinalized gera variantes
 * WebP automaticamente), popula:
 *   - news/{slugBase}-{locale}
 *   - content/{slug}-{locale} (sobre/termos/privacidade)
 *   - driftCategories/{auto-id}
 * E gera src/lib/legacy-redirects.json com tabela de 301s pra preservar SEO.
 *
 * Idempotente: re-run só atualiza docs com modified_gmt > updatedAt.
 *
 * Uso:
 *   FIREBASE_SERVICE_ACCOUNT="$(cat ../ultimate-drift-production-*.json)" \
 *     node scripts/import-wp.mjs \
 *       --base https://www.ultimatedrift.com.br \
 *       --project ultimate-drift-production \
 *       --dry --limit 5
 */

import { parseArgs } from "node:util";
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { initializeApp, cert, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import TurndownService from "turndown";
import { JSDOM } from "jsdom";

// ─── CLI ───────────────────────────────────────────────────────────────────

const { values: flags } = parseArgs({
  options: {
    base: { type: "string", default: "https://www.ultimatedrift.com.br" },
    project: { type: "string" },
    bucket: { type: "string" },
    limit: { type: "string" },
    "from-cache": { type: "boolean", default: false },
    dry: { type: "boolean", default: false },
    "skip-images": { type: "boolean", default: false },
    only: { type: "string" }, // posts | pages | categories
    help: { type: "boolean", default: false },
  },
});

if (flags.help) {
  console.log(`
Uso: node scripts/import-wp.mjs [opções]

  --base <url>          URL base do WordPress (default: https://www.ultimatedrift.com.br)
  --project <id>        Firebase project ID (default: env NEXT_PUBLIC_FIREBASE_PROJECT_ID)
  --bucket <name>       Storage bucket (default: <project>.appspot.com)
  --limit <n>           Importa só os primeiros N items (útil pra dry-run)
  --from-cache          Usa cache local em .cache/ em vez de HTTP
  --dry                 Loga ações sem escrever no Firestore/Storage
  --skip-images         Pula upload de mídia (mais rápido)
  --only <kind>         posts | pages | categories
  --help
`);
  process.exit(0);
}

const PROJECT = flags.project ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
if (!PROJECT) {
  console.error("--project obrigatório (ou exporte NEXT_PUBLIC_FIREBASE_PROJECT_ID)");
  process.exit(1);
}
const BUCKET = flags.bucket ?? `${PROJECT}.appspot.com`;
const BASE = flags.base.replace(/\/$/, "");
const LIMIT = flags.limit ? Number(flags.limit) : Infinity;
const ONLY = flags.only;
const LOCALE = "pt-BR"; // WP atual só tem pt-BR

const CACHE_DIR = resolve(process.cwd(), ".cache/wp");
const MEDIA_CACHE_DIR = resolve(process.cwd(), ".cache/wp-media");
const REDIRECTS_OUT = resolve(process.cwd(), "src/lib/legacy-redirects.json");

await mkdir(CACHE_DIR, { recursive: true });
await mkdir(MEDIA_CACHE_DIR, { recursive: true });

// ─── Firebase Admin ────────────────────────────────────────────────────────

function initFirebase() {
  if (getApps().length) return;
  const inlineSa = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (inlineSa) {
    initializeApp({ credential: cert(JSON.parse(inlineSa)), projectId: PROJECT, storageBucket: BUCKET });
  } else {
    initializeApp({ credential: applicationDefault(), projectId: PROJECT, storageBucket: BUCKET });
  }
}

initFirebase();
const db = getFirestore();
const bucket = getStorage().bucket();

// ─── Helpers ───────────────────────────────────────────────────────────────

const turndown = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced", emDelimiter: "_" });
// Mantém links intactos; remove scripts/styles
turndown.remove(["script", "style", "noscript"]);

function decode(html) {
  return html
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripHtml(html) {
  return decode(html.replace(/<[^>]+>/g, "")).trim();
}

function extOf(url) {
  const clean = url.split("?")[0].split("#")[0];
  const m = clean.match(/\.([a-zA-Z0-9]{2,5})$/);
  return m ? m[1].toLowerCase() : "jpg";
}

function shortHash(s) {
  return createHash("sha1").update(s).digest("hex").slice(0, 10);
}

async function fetchJson(url, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) {
        if (res.status === 404) return { data: null, totalPages: 0 };
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      }
      const totalPages = Number(res.headers.get("x-wp-totalpages") ?? "1");
      const data = await res.json();
      return { data, totalPages };
    } catch (err) {
      if (attempt === retries - 1) throw err;
      const backoff = 500 * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
}

async function fetchBuffer(url, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      if (attempt === retries - 1) throw err;
      const backoff = 500 * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
}

async function downloadCached(url) {
  const key = shortHash(url) + "." + extOf(url);
  const path = join(MEDIA_CACHE_DIR, key);
  if (existsSync(path)) return await readFile(path);
  const buf = await fetchBuffer(url);
  await writeFile(path, buf);
  return buf;
}

// ─── Paginação WP ──────────────────────────────────────────────────────────

async function fetchAllPages(endpoint, opts = {}) {
  const all = [];
  let page = 1;
  while (true) {
    const cachePath = join(CACHE_DIR, `${endpoint.replace(/[\/?]/g, "_")}-${page}.json`);
    let data, totalPages;
    if (flags["from-cache"] && existsSync(cachePath)) {
      data = JSON.parse(await readFile(cachePath, "utf8"));
      totalPages = data.__totalPages ?? 1;
    } else {
      const url = `${BASE}/wp-json/wp/v2/${endpoint}&page=${page}`;
      const result = await fetchJson(url);
      data = result.data ?? [];
      totalPages = result.totalPages;
      if (!flags.dry) await writeFile(cachePath, JSON.stringify({ ...data, __totalPages: totalPages, items: data }, null, 2));
    }
    const items = Array.isArray(data) ? data : (data.items ?? []);
    all.push(...items);
    if (all.length >= LIMIT) return all.slice(0, LIMIT);
    if (page >= totalPages) break;
    page += 1;
  }
  return all;
}

// ─── Upload de mídia ───────────────────────────────────────────────────────

const uploadedPaths = new Map(); // sourceUrl → storagePath (dedupe na sessão)

async function uploadMedia({ sourceUrl, destPath, alt = "" }) {
  if (flags["skip-images"] || flags.dry) {
    if (flags.dry) console.log(`  [dry] upload ${sourceUrl} → ${destPath}`);
    return destPath;
  }
  if (uploadedPaths.has(sourceUrl)) return uploadedPaths.get(sourceUrl);

  const buf = await downloadCached(sourceUrl);
  const file = bucket.file(destPath);
  await file.save(buf, {
    contentType: contentTypeOf(sourceUrl),
    metadata: { metadata: { alt, importedFrom: sourceUrl } },
    predefinedAcl: "publicRead",
  });
  uploadedPaths.set(sourceUrl, destPath);
  return destPath;
}

function contentTypeOf(url) {
  const ext = extOf(url);
  const map = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", avif: "image/avif", svg: "image/svg+xml" };
  return map[ext] ?? "application/octet-stream";
}

// ─── Conversão HTML → Markdown ─────────────────────────────────────────────

async function htmlToMarkdownWithImages(html, { storagePrefix }) {
  const dom = new JSDOM(`<!doctype html><body>${html}</body>`);
  const imgs = dom.window.document.querySelectorAll("img");
  for (const img of imgs) {
    const src = img.getAttribute("src");
    if (!src || src.startsWith("data:")) continue;
    // Resolve URLs relativas
    const abs = src.startsWith("http") ? src : new URL(src, BASE).toString();
    const destPath = `${storagePrefix}/inline-${shortHash(abs)}.${extOf(abs)}`;
    try {
      await uploadMedia({ sourceUrl: abs, destPath, alt: img.getAttribute("alt") ?? "" });
      img.setAttribute("src", destPath);
    } catch (err) {
      console.warn(`  ⚠ skip image (${err.message}): ${abs}`);
    }
  }
  return turndown.turndown(dom.window.document.body.innerHTML);
}

// ─── Categorias ────────────────────────────────────────────────────────────

const categorySlugById = new Map();

async function importCategories() {
  console.log("→ categorias");
  const cats = await fetchAllPages("categories?per_page=100");
  console.log(`  ${cats.length} categorias`);
  for (const cat of cats) {
    if (cat.slug === "uncategorized" || cat.slug === "sem-categoria") continue;
    categorySlugById.set(cat.id, cat.slug);

    const existing = await db.collection("driftCategories").where("slug", "==", cat.slug).limit(1).get();
    if (!existing.empty) {
      console.log(`  ✓ skip ${cat.slug} (já existe)`);
      continue;
    }
    if (flags.dry) {
      console.log(`  [dry] would create driftCategories/${cat.slug}`);
      continue;
    }
    await db.collection("driftCategories").add({
      slug: cat.slug,
      name: decode(cat.name),
      description: stripHtml(cat.description ?? "").slice(0, 2000),
      icon: null,
      rules: "",
      order: cat.count ?? 0,
      source: "wp-import",
      wpId: cat.id,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log(`  + driftCategories/${cat.slug}`);
  }
}

// ─── Posts ─────────────────────────────────────────────────────────────────

const redirects = {};

async function importPosts() {
  console.log("→ posts");
  const posts = await fetchAllPages("posts?_embed&per_page=100");
  console.log(`  ${posts.length} posts`);

  for (const post of posts) {
    const slugBase = post.slug;
    const docId = `${slugBase}-${LOCALE}`;
    const docRef = db.collection("news").doc(docId);

    // Idempotência: skip se já tem com updatedAt >= modified_gmt do WP
    const wpModified = new Date(post.modified_gmt + "Z").getTime();
    const existing = await docRef.get();
    if (existing.exists) {
      const data = existing.data();
      const localUpdated = data.updatedAt?.toMillis?.() ?? 0;
      if (localUpdated >= wpModified) {
        console.log(`  ✓ skip ${slugBase}`);
        continue;
      }
    }

    // Featured image
    let coverImagePath = null;
    const featured = post._embedded?.["wp:featuredmedia"]?.[0];
    if (featured?.source_url) {
      try {
        coverImagePath = await uploadMedia({
          sourceUrl: featured.source_url,
          destPath: `news/${docId}/cover-original.${extOf(featured.source_url)}`,
          alt: featured.alt_text ?? "",
        });
      } catch (err) {
        console.warn(`  ⚠ cover falhou: ${err.message}`);
      }
    }

    // Body + inline images
    const body = await htmlToMarkdownWithImages(post.content.rendered, { storagePrefix: `news/${docId}` });

    // Autor
    const author = post._embedded?.author?.[0]?.name ?? "";

    // Categoria principal (primeira WP category)
    const wpCatId = post.categories?.[0];
    const category = wpCatId ? (categorySlugById.get(wpCatId) ?? "") : "";

    // Tags
    const wpTags = post._embedded?.["wp:term"]?.[1] ?? [];
    const tags = Array.isArray(wpTags) ? wpTags.map((t) => t.slug).filter(Boolean) : [];

    // SEO
    const yoast = post.yoast_head_json ?? {};
    const excerpt = stripHtml(post.excerpt.rendered).slice(0, 400);
    const seo = {
      title: decode(yoast.title ?? post.title.rendered ?? "").slice(0, 80),
      description: (yoast.description ?? excerpt).slice(0, 180),
      ogImagePath: coverImagePath,
      canonical: null,
    };

    const payload = {
      slug: slugBase,
      slugBase,
      locale: LOCALE,
      title: decode(post.title.rendered ?? ""),
      excerpt,
      body,
      coverImagePath,
      author,
      category,
      tags,
      publishedAt: post.date_gmt.slice(0, 10),
      status: "published",
      seo,
      wpId: post.id,
      wpLink: post.link,
      importedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (flags.dry) {
      console.log(`  [dry] would upsert news/${docId} (${decode(post.title.rendered)})`);
    } else {
      await docRef.set(payload, { merge: true });
      console.log(`  + news/${docId}`);
    }

    // Legacy redirect
    try {
      const oldPath = new URL(post.link).pathname.replace(/\/$/, "") || "/";
      const newPath = `/noticias/${slugBase}`;
      if (oldPath !== newPath) redirects[oldPath] = { to: newPath, code: 301 };
    } catch {
      /* malformed link */
    }
  }
}

// ─── Pages ─────────────────────────────────────────────────────────────────

const PAGE_SLUG_MAP = {
  sobre: "sobre", about: "sobre",
  termos: "termos", terms: "termos", "termos-e-condicoes": "termos",
  privacidade: "privacidade", privacy: "privacidade", "politica-de-privacidade": "privacidade",
};

async function importPages() {
  console.log("→ pages");
  const pages = await fetchAllPages("pages?_embed&per_page=100");
  console.log(`  ${pages.length} pages`);

  for (const page of pages) {
    const targetSlug = PAGE_SLUG_MAP[page.slug];
    if (!targetSlug) {
      console.log(`  ✓ skip page '${page.slug}' (sem mapeamento)`);
      // Redirect mesmo assim: aponta pra home (humano pode revisar)
      try {
        const oldPath = new URL(page.link).pathname.replace(/\/$/, "") || "/";
        if (oldPath !== "/") redirects[oldPath] = { to: "/", code: 301 };
      } catch {}
      continue;
    }
    const docId = `${targetSlug}-${LOCALE}`;
    const docRef = db.collection("content").doc(docId);

    const body = await htmlToMarkdownWithImages(page.content.rendered, { storagePrefix: `content/${docId}` });
    const payload = {
      slug: targetSlug,
      locale: LOCALE,
      title: decode(page.title.rendered ?? ""),
      body,
      seo: { title: "", description: stripHtml(page.excerpt.rendered ?? "").slice(0, 180) },
      wpId: page.id,
      wpLink: page.link,
      importedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (flags.dry) {
      console.log(`  [dry] would upsert content/${docId}`);
    } else {
      await docRef.set(payload, { merge: true });
      console.log(`  + content/${docId}`);
    }

    // Redirect: /sobre → /sobre (mesmo slug pt-BR), etc.
    try {
      const oldPath = new URL(page.link).pathname.replace(/\/$/, "") || "/";
      const newPath = `/${targetSlug}`;
      if (oldPath !== newPath) redirects[oldPath] = { to: newPath, code: 301 };
    } catch {}
  }
}

// ─── Redirects extras ──────────────────────────────────────────────────────

async function writeRedirects() {
  // /category/<slug>/ → /categorias/<slug>
  for (const slug of categorySlugById.values()) {
    redirects[`/category/${slug}`] = { to: `/categorias/${slug}`, code: 301 };
  }
  if (flags.dry) {
    console.log(`[dry] would write ${Object.keys(redirects).length} redirects to ${REDIRECTS_OUT}`);
    return;
  }
  // Merge com existente (preserva manuais que o humano possa ter adicionado)
  let existing = {};
  if (existsSync(REDIRECTS_OUT)) {
    try {
      existing = JSON.parse(await readFile(REDIRECTS_OUT, "utf8"));
    } catch {}
  }
  const merged = { ...redirects, ...existing }; // existentes ganham
  await writeFile(REDIRECTS_OUT, JSON.stringify(merged, null, 2) + "\n");
  console.log(`✓ ${Object.keys(merged).length} redirects gravados em ${REDIRECTS_OUT}`);
}

// ─── Main ──────────────────────────────────────────────────────────────────

const t0 = Date.now();
console.log(`[import-wp] base=${BASE} project=${PROJECT} bucket=${BUCKET}${flags.dry ? " (DRY-RUN)" : ""}`);

try {
  if (!ONLY || ONLY === "categories") await importCategories();
  if (!ONLY || ONLY === "posts") await importPosts();
  if (!ONLY || ONLY === "pages") await importPages();
  await writeRedirects();
} catch (err) {
  console.error("✗ falha:", err);
  process.exit(1);
}

console.log(`✓ done em ${((Date.now() - t0) / 1000).toFixed(1)}s`);
process.exit(0);
