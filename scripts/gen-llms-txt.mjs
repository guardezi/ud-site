#!/usr/bin/env node
/**
 * Regenera `public/llms.txt` com dados frescos do Firestore.
 * Roda no postbuild (`pnpm build`). Lê próximas etapas, top pilotos ativos,
 * news recentes — produz um índice tipo llmstxt.org pra crawlers de IA.
 *
 * Falha silenciosa: se Firestore não estiver acessível (sem ADC local),
 * mantém o llms.txt estático já commitado.
 */

import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { initializeApp, cert, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ultimatedrift.com.br";
const PROJECT = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const OUT = resolve(process.cwd(), "public/llms.txt");

function initFirebase() {
  if (getApps().length) return true;
  try {
    const inlineSa = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (inlineSa) {
      initializeApp({ credential: cert(JSON.parse(inlineSa)), projectId: PROJECT });
    } else {
      initializeApp({ credential: applicationDefault(), projectId: PROJECT });
    }
    return true;
  } catch (err) {
    console.warn("[gen-llms-txt] Firebase init falhou:", err.message);
    return false;
  }
}

if (!PROJECT || !initFirebase()) {
  console.log("[gen-llms-txt] sem Firebase — usando llms.txt estático já commitado");
  process.exit(0);
}

const db = getFirestore();

function safeStr(v) {
  return typeof v === "string" ? v : "";
}

function dateStr(v) {
  if (!v) return "";
  if (typeof v.toDate === "function") return v.toDate().toISOString().slice(0, 10);
  if (typeof v === "string") return v.slice(0, 10);
  return "";
}

function slugify(input) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

try {
  const [stages, drivers, news] = await Promise.all([
    db.collection("stageHubs").orderBy("startDate", "desc").limit(8).get().catch(() => null),
    db.collection("drivers").where("isActive", "==", true).orderBy("apelido").limit(15).get().catch(() => null),
    db.collection("news").where("status", "==", "published").orderBy("publishedAt", "desc").limit(10).get().catch(() => null),
  ]);

  const lines = [];
  lines.push("# Ultimate Drift");
  lines.push("");
  lines.push("> O principal campeonato brasileiro de drift profissional. Etapas em circuitos pelo país, transmissão ao vivo, ranking, pilotos e batalhas.");
  lines.push("");
  lines.push("Este arquivo é um índice das páginas mais relevantes do site para LLMs e crawlers de IA.");
  lines.push("");

  lines.push("## Páginas principais");
  lines.push("");
  for (const [label, path, desc] of [
    ["Home", "/", "visão geral, próxima etapa, top do ranking, últimas notícias"],
    ["Pilotos", "/pilotos", "grid completo de pilotos do campeonato"],
    ["Etapas", "/etapas", "calendário e resultados"],
    ["Classificação", "/classificacao", "ranking acumulado do campeonato vigente"],
    ["Categorias", "/categorias", "categorias do campeonato e regulamento"],
    ["Notícias", "/noticias", "notícias do campeonato"],
    ["Patrocinadores", "/patrocinadores", "patrocinadores oficiais"],
    ["Contato", "/contato", "canais de imprensa, patrocínio e atendimento"],
  ]) {
    lines.push(`- [${label}](${SITE_URL}${path}): ${desc}`);
  }
  lines.push("");

  if (stages?.docs.length) {
    lines.push("## Etapas");
    lines.push("");
    for (const doc of stages.docs) {
      const d = doc.data();
      const date = dateStr(d.startDate);
      const slug = slugify(safeStr(d.name));
      const stageId = d.stageId;
      const fullSlug = stageId ? `${slug}-${stageId}` : slug;
      lines.push(`- [${safeStr(d.name)}](${SITE_URL}/etapas/${fullSlug})${date ? `: ${date}` : ""}`);
    }
    lines.push("");
  }

  if (drivers?.docs.length) {
    lines.push("## Pilotos ativos");
    lines.push("");
    for (const doc of drivers.docs) {
      const d = doc.data();
      const apelido = safeStr(d.apelido) || safeStr(d.nome) || "Piloto";
      const numero = d.numero ?? "";
      const slug = slugify(apelido);
      const fullSlug = numero ? `${slug}-${numero}` : slug;
      const cat = d.categoriaPiloto?.descricao;
      lines.push(`- [${apelido}](${SITE_URL}/pilotos/${fullSlug})${numero ? ` #${numero}` : ""}${cat ? `, ${cat}` : ""}`);
    }
    lines.push("");
  }

  if (news?.docs.length) {
    lines.push("## Notícias recentes");
    lines.push("");
    for (const doc of news.docs) {
      const d = doc.data();
      if (d.locale && d.locale !== "pt-BR") continue;
      const slug = safeStr(d.slug);
      const title = safeStr(d.title);
      const date = dateStr(d.publishedAt);
      if (!slug || !title) continue;
      lines.push(`- [${title}](${SITE_URL}/noticias/${slug})${date ? `: ${date}` : ""}`);
    }
    lines.push("");
  }

  lines.push("## Recursos");
  lines.push("");
  lines.push(`- [Sitemap](${SITE_URL}/sitemap.xml): URLs completas, atualizadas dinamicamente`);
  lines.push("");

  await writeFile(OUT, lines.join("\n"));
  console.log(`[gen-llms-txt] ${OUT} regenerado (${lines.length} linhas)`);
} catch (err) {
  console.warn("[gen-llms-txt] falha:", err.message);
  // não falha o build
}
