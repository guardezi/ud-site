"use server";

import { getAppCheck } from "firebase-admin/app-check";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { buildContactEmail } from "./email";
import { contactInputSchema, type ContactInput, type ContactResult } from "./schema";

/**
 * Envio do formulário de contato do site público (sem login).
 *
 * Destino: e-mail pra suporteapp@ultimatedrift.com.br pelo outbox de e-mails
 * do ud-app (`emails/{id}`). O doc é gravado via Admin SDK já com
 * `status: "queued"` + `to`/`subject`/`text`/`html`/`replyTo` (montados e
 * escapados em `./email.ts`); o trigger `db/emails/onQueued` (ud-app) envia
 * pelo Postal e marca `sent`/`error`. `replyTo` = e-mail de quem escreveu,
 * pro suporte responder direto.
 *
 * Anti-abuso: honeypot + validação Zod + App Check. Quando o site tem a site
 * key do reCAPTCHA (HML/PRD), o token de App Check é OBRIGATÓRIO e é
 * verificado com o Admin SDK; sem site key (dev/preview), segue sem token.
 */
export async function submitContactMessage(
  input: ContactInput,
  appCheckToken: string | null,
  locale: string,
): Promise<ContactResult> {
  const parsed = contactInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };
  const data = parsed.data;

  const siteKey = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_RECAPTCHA_SITE_KEY;
  const appCheckRequired = !!siteKey && !siteKey.startsWith("REPLACE_ME");
  if (appCheckRequired) {
    if (!appCheckToken) return { ok: false, error: "APP_CHECK" };
    try {
      await getAppCheck().verifyToken(appCheckToken);
    } catch {
      return { ok: false, error: "APP_CHECK" };
    }
  }

  // Honeypot preenchido: finge sucesso pro bot e não envia nada.
  if (data.website) return { ok: true };

  try {
    const ref = adminDb.collection("emails").doc();
    await ref.set({
      ...buildContactEmail(data, locale),
      id: ref.id,
      createdAt: FieldValue.serverTimestamp(),
    });
    return { ok: true };
  } catch (err) {
    console.error("[contact] falha ao enfileirar e-mail", err);
    return { ok: false, error: "INTERNAL" };
  }
}
