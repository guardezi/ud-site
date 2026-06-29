import "server-only";
import { getApps } from "firebase-admin/app";
import { getRemoteConfig } from "firebase-admin/remote-config";
import "@/lib/firebase/admin";

const TTL_MS = 60 * 1000;
const cache = new Map<string, { value: boolean; expiresAt: number }>();

export async function isEnabled(key: string): Promise<boolean> {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value;
  try {
    if (getApps().length === 0) return false;
    const rc = getRemoteConfig();
    const template = await rc.getTemplate();
    const param = template.parameters?.[key];
    const dv = param?.defaultValue;
    let value = false;
    if (dv && "value" in dv) {
      value = dv.value === "true";
    }
    cache.set(key, { value, expiresAt: Date.now() + TTL_MS });
    return value;
  } catch {
    cache.set(key, { value: false, expiresAt: Date.now() + TTL_MS });
    return false;
  }
}
