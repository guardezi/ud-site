"use server";

import { getAppCheck } from "firebase-admin/app-check";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { isEnabled } from "@/lib/feature-flags/server";
import { CONTACT_FORM_FLAG, contactInputSchema, type ContactInput, type ContactResult } from "./schema";

/**
 * Envio do formulário de contato do site público (sem login).
 *
 * Destino: a mesma collection `questions` onde caem os pedidos de ajuda do
 * ud-app (help_form_cubit.dart grava em profiles/{uid}/questions e a function
 * triggers/db/profiles/questions/onCreate copia pra `/questions`, injetando
 * `userId`). Pelas firestore.rules do ud-app, `/questions` só aceita escrita
 * via Admin SDK e leitura por admin — é o que fazemos aqui, com
 * `source: "site"` e `userId: null` pra distinguir do app.
 *
 * Gate: Remote Config `isSiteContactFormEnabled` (default desligado). Hoje
 * nenhum consumidor lê `/questions` (backoffice não lista, nenhuma function
 * manda e-mail) — ligar a flag sem isso faria as mensagens caírem num lugar
 * que ninguém vê.
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
  if (!(await isEnabled(CONTACT_FORM_FLAG))) return { ok: false, error: "DISABLED" };

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

  // Honeypot preenchido: finge sucesso pro bot e não grava nada.
  if (data.website) return { ok: true };

  try {
    await adminDb.collection("questions").add({
      name: data.name,
      email: data.email.toLowerCase(),
      phone: data.phone,
      message: data.message,
      createdAt: FieldValue.serverTimestamp(),
      userId: null,
      source: "site",
      locale,
    });
    return { ok: true };
  } catch (err) {
    console.error("[contact] falha ao gravar mensagem", err);
    return { ok: false, error: "INTERNAL" };
  }
}
