import "server-only";
import { getApps } from "firebase-admin/app";
import { getRemoteConfig, type RemoteConfigParameter } from "firebase-admin/remote-config";
import "@/lib/firebase/admin";

/**
 * Qual sistema de ingressos a aba "Ingressos" mostra — o MESMO parâmetro do
 * Remote Config que o ud-app usa (`ticketsystem`, string):
 *
 * - `external` (default, e o valor em HML/PRD hoje): lista de etapas da
 *   collection `events` com o link de compra externo (tycket) de cada uma.
 *   ud-app: homepage_public.dart `_buildTicketPage()` → `TicketPage`.
 * - `internal`: loja própria (`ticketEvents`, ud-app/docs/ticketing).
 *   ud-app: `IngressosHomePage`.
 *
 * ud-app: remote_config_service.dart `getTicketSystem()` (default 'external'),
 * remote_config_provider.dart `isInternalTicketing => ticketSystem == 'internal'`.
 *
 * Lê o template via Admin SDK (como `isEnabled` em ./server.ts), procurando
 * também dentro de parameter groups — parâmetro agrupado não aparece em
 * `template.parameters`. Qualquer falha cai no default `external`.
 */
export type TicketSystem = "internal" | "external";

const KEY = "ticketsystem";
const TTL_MS = 60 * 1000;
let cache: { value: TicketSystem; expiresAt: number } | null = null;

function defaultString(param: RemoteConfigParameter | undefined): string | null {
  const dv = param?.defaultValue;
  return dv && "value" in dv ? dv.value : null;
}

export async function getTicketSystem(): Promise<TicketSystem> {
  if (cache && cache.expiresAt > Date.now()) return cache.value;
  let value: TicketSystem = "external";
  try {
    if (getApps().length > 0) {
      const template = await getRemoteConfig().getTemplate();
      let raw = defaultString(template.parameters?.[KEY]);
      if (raw == null) {
        for (const group of Object.values(template.parameterGroups ?? {})) {
          raw = defaultString(group.parameters?.[KEY]);
          if (raw != null) break;
        }
      }
      if (raw?.trim() === "internal") value = "internal";
    }
  } catch {
    // default external
  }
  cache = { value, expiresAt: Date.now() + TTL_MS };
  return value;
}
