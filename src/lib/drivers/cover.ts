import "server-only";
import { unstable_cache } from "next/cache";
import { getApps } from "firebase-admin/app";
import { getRemoteConfig } from "firebase-admin/remote-config";
import "@/lib/firebase/admin";
import { imageHigh } from "@/lib/firebase/image-variants";

/**
 * `defaultDriverCoverUrl` do Remote Config (capa padrão do piloto no ud-app,
 * `RemoteConfigProvider.defaultDriverCoverUrl`). Procura no topo do template e
 * dentro dos parameter groups — parâmetro dentro de grupo não aparece em
 * `template.parameters`. Cache 1h. `null` se não existe/vazio/falha.
 */
export const getDefaultDriverCoverUrl = unstable_cache(
  async (): Promise<string | null> => {
    try {
      if (getApps().length === 0) return null;
      const t = await getRemoteConfig().getTemplate();
      const param =
        t.parameters?.defaultDriverCoverUrl ??
        Object.values(t.parameterGroups ?? {}).find((g) => g.parameters?.defaultDriverCoverUrl)?.parameters
          ?.defaultDriverCoverUrl;
      const dv = param?.defaultValue;
      const value = dv && "value" in dv ? dv.value.trim() : "";
      return /^https?:\/\//i.test(value) ? value : null;
    } catch (e) {
      console.error("[drivers] defaultDriverCoverUrl failed:", e);
      return null;
    }
  },
  ["remote-config-default-driver-cover"],
  { revalidate: 3600, tags: ["remote-config"] },
);

/**
 * Candidatas da capa, em ordem: variante da capa do piloto, variante da capa
 * padrão, URL original da capa padrão (a variante pode não existir se a URL
 * estiver fora do pipeline de variantes — mesmo fallback do app).
 */
export function driverCoverSources(capaPath: string | null, defaultUrl: string | null): string[] {
  const out = [imageHigh(capaPath), imageHigh(defaultUrl), defaultUrl].filter((s): s is string => !!s);
  return Array.from(new Set(out));
}
