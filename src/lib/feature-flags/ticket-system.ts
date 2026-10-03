import "server-only";
import { getApps } from "firebase-admin/app";
import {
  getRemoteConfig,
  type RemoteConfigParameter,
  type RemoteConfigTemplate,
} from "firebase-admin/remote-config";
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
 * A loja própria só aparece com `ticketsystem == 'internal'` E
 * `isTicketingEnabled == true` (no app, ingressos_home_page.dart mostra
 * "indisponível" sem essa flag); em qualquer outro caso o site cai em
 * `external`.
 *
 * Lê o template via Admin SDK (como `isEnabled` em ./server.ts), procurando
 * também dentro de parameter groups — parâmetro agrupado não aparece em
 * `template.parameters`. Qualquer falha cai no default `external`.
 */
export type TicketSystem = "internal" | "external";

const KEY = "ticketsystem";
const ENABLED_KEY = "isTicketingEnabled";
const TTL_MS = 60 * 1000;
let cache: { value: TicketSystem; expiresAt: number } | null = null;

function defaultString(param: RemoteConfigParameter | undefined): string | null {
  const dv = param?.defaultValue;
  return dv && "value" in dv ? dv.value : null;
}

function findDefault(template: RemoteConfigTemplate, key: string): string | null {
  const top = defaultString(template.parameters?.[key]);
  if (top != null) return top;
  for (const group of Object.values(template.parameterGroups ?? {})) {
    const v = defaultString(group.parameters?.[key]);
    if (v != null) return v;
  }
  return null;
}

export async function getTicketSystem(): Promise<TicketSystem> {
  if (cache && cache.expiresAt > Date.now()) return cache.value;
  let value: TicketSystem = "external";
  try {
    if (getApps().length > 0) {
      const template = await getRemoteConfig().getTemplate();
      const system = findDefault(template, KEY)?.trim();
      const enabled = findDefault(template, ENABLED_KEY)?.trim() === "true";
      if (system === "internal" && enabled) value = "internal";
    }
  } catch {
    // default external
  }
  cache = { value, expiresAt: Date.now() + TTL_MS };
  return value;
}
