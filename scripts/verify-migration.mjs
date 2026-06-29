#!/usr/bin/env node
/**
 * Verificação pós-cutover do import-wp.
 *
 * Lê todos os docs em `news` com `wpId`, faz HEAD na URL antiga (`wpLink`),
 * confere 301 + Location apontando pra nova URL canônica, e HEAD na nova
 * pra confirmar 200.
 *
 * Uso:
 *   FIREBASE_SERVICE_ACCOUNT="$(cat ../ultimate-drift-production-*.json)" \
 *     node scripts/verify-migration.mjs --project ultimate-drift-production --site https://www.ultimatedrift.com.br
 */

import { parseArgs } from "node:util";
import { initializeApp, cert, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const { values: flags } = parseArgs({
  options: {
    project: { type: "string" },
    site: { type: "string", default: "https://www.ultimatedrift.com.br" },
    limit: { type: "string" },
  },
});

const PROJECT = flags.project ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
if (!PROJECT) {
  console.error("--project obrigatório");
  process.exit(1);
}

const SITE = flags.site.replace(/\/$/, "");
const LIMIT = flags.limit ? Number(flags.limit) : Infinity;

function initFirebase() {
  if (getApps().length) return;
  const inlineSa = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (inlineSa) {
    initializeApp({ credential: cert(JSON.parse(inlineSa)), projectId: PROJECT });
  } else {
    initializeApp({ credential: applicationDefault(), projectId: PROJECT });
  }
}

initFirebase();
const db = getFirestore();

async function headOnce(url) {
  const res = await fetch(url, { method: "HEAD", redirect: "manual" });
  return { status: res.status, location: res.headers.get("location") };
}

let ok = 0;
let fail = 0;

const snap = await db.collection("news").where("status", "==", "published").get();
console.log(`Verificando ${snap.docs.length} docs em /news (projeto ${PROJECT})`);

for (const doc of snap.docs.slice(0, LIMIT)) {
  const data = doc.data();
  if (!data.wpLink || !data.slug) continue;

  const oldUrl = data.wpLink;
  const newUrl = `${SITE}/noticias/${data.slug}`;

  try {
    const old = await headOnce(oldUrl);
    const isRedirect = old.status >= 300 && old.status < 400;
    const goesToNew = (old.location ?? "").includes(`/noticias/${data.slug}`);

    const nu = await headOnce(newUrl);
    const newOk = nu.status === 200;

    if (isRedirect && goesToNew && newOk) {
      ok++;
      console.log(`  ✓ ${data.slug}`);
    } else {
      fail++;
      console.warn(`  ✗ ${data.slug}: old=${old.status}→${old.location ?? "—"} new=${nu.status}`);
    }
  } catch (err) {
    fail++;
    console.error(`  ✗ ${data.slug}: ${err.message}`);
  }
}

console.log(`\nTotal: ${ok} ok, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
