#!/usr/bin/env node
/**
 * Regenera `public/llms.txt` com dados frescos do Firestore (próximas etapas,
 * pilotos ativos, news recentes). Roda no postbuild (package.json).
 *
 * Fase 1: stub — usa o llms.txt estático já commitado. Fase 2: ler Firestore
 * via firebase-admin e gerar índice dinâmico.
 */
console.log("[gen-llms-txt] using static public/llms.txt (Fase 1 stub)");
process.exit(0);
