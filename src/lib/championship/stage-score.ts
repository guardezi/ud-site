/**
 * Pontos de um piloto numa etapa, a partir de uma entrada de
 * `championships/{cid}/pilots/{pid}.stages[]` (gravada pela CF do ud-app).
 *
 * O array vem semeado com TODAS as etapas do campeonato pra todo piloto, então
 * a ausência da entrada não indica "não participou". A presença segue a mesma
 * regra do app (functions/src/utils/stageRankingWriter.ts e o histórico em
 * lib/pages/public/drivers/driver_details.dart): participou quando tem
 * `battlePosition > 0` ou `qualiPosition > 0`.
 *
 * - `finalScore > 0`                              → `"31"`
 * - `finalScore` 0 e battle/quali position > 0    → `"0"`  (correu e zerou)
 * - sem entrada ou sem posição                    → `null` (não correu → "—")
 *
 * Limitação: etapas antigas (algumas de 2024/2025) não têm `qualiPosition`
 * gravado; nelas um piloto que correu e zerou sem chegar às batalhas aparece
 * como "—".
 *
 * Função pura, sem dependências — pode ser usada em server e client.
 */
export type StageScoreEntry = {
  finalScore?: unknown;
  qualiPosition?: unknown;
  battlePosition?: unknown;
};

const toNum = (v: unknown): number => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
};

export function formatStageScore(entry: StageScoreEntry | null | undefined): string | null {
  if (!entry) return null;
  const score = toNum(entry.finalScore);
  if (score > 0) return String(score);
  if (toNum(entry.battlePosition) > 0 || toNum(entry.qualiPosition) > 0) return "0";
  return null;
}
