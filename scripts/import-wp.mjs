#!/usr/bin/env node
/**
 * Migração one-shot WordPress → Firestore + Storage.
 *
 * **Stub Fase 1** — implementação completa em `docs/WP_IMPORT_SPEC.md`.
 *
 * Uso (após implementar):
 *   pnpm add -D turndown jsdom yargs
 *   FIREBASE_SERVICE_ACCOUNT="$(cat ../ultimate-drift-production-*.json)" \
 *     node scripts/import-wp.mjs --base https://www.ultimatedrift.com.br --project ultimate-drift-production --dry
 *
 * Algoritmo, mapeamento WP→Firestore, idempotência e geração da tabela de
 * `legacy-redirects.json`: ver `ud-site/docs/WP_IMPORT_SPEC.md`.
 */
console.error("[import-wp] stub Fase 1 — não implementado. Ver docs/WP_IMPORT_SPEC.md.");
process.exit(1);
