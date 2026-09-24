"use client";

import { FirebaseApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";

// Por APP (não global): idempotente mesmo se `ensure()` for chamado de vários
// pontos, e preparado pra uma eventual FirebaseApp secundária.
const started = new WeakSet<FirebaseApp>();

/**
 * Inicializa o Firebase App Check (reCAPTCHA Enterprise) na app client — uma única vez,
 * só no browser. No ud-site a superfície de client SDK é o handler customizado
 * de ação de e-mail (`/auth/action`): `verifyPasswordResetCode`,
 * `confirmPasswordReset` e `applyActionCode`, todos contra o Identity Toolkit.
 * Sem isto, enforçar a API de Authentication derruba o reset de senha e a
 * verificação de e-mail de toda a plataforma. O Admin SDK do servidor
 * (Firestore/Storage em `admin.ts`) não passa por aqui.
 *
 * O guard `typeof window === "undefined"` é crítico: o App Hosting serve SSR,
 * e o App Check só existe no browser.
 *
 * Chaveado por `NEXT_PUBLIC_FIREBASE_APPCHECK_RECAPTCHA_SITE_KEY`: enquanto a
 * site key não estiver setada, o App Check NÃO inicializa — build/dev/CI e os
 * previews de PR seguem normais e nada é bloqueado (fail-open). A site key do
 * reCAPTCHA é pública (roda no client), então pode ir no env/bundle.
 *
 * Debug token: só fora de produção. Rode `pnpm dev`, registre o token do device
 * em Firebase Console → App Check → Apps → Manage debug tokens, e exporte o
 * valor em `NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN` no seu `.env.local`
 * (nunca commitar — é um bypass de atestação).
 */
export function ensureAppCheck(app: FirebaseApp): void {
  if (started.has(app) || typeof window === "undefined") return;

  const siteKey = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_RECAPTCHA_SITE_KEY;
  // Vazia (dev/CI/preview sem key) ou placeholder REPLACE_ME (app ainda não
  // registrado no App Check) => App Check off, sem tentar inicializar o
  // reCAPTCHA com uma key inválida.
  if (!siteKey || siteKey.startsWith("REPLACE_ME")) return;

  if (process.env.NODE_ENV !== "production") {
    const debugToken = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN;
    if (debugToken) {
      (
        self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean }
      ).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
    }
  }

  started.add(app);
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (err) {
    // Fail-open também no caminho "key presente mas init falhou" (config
    // inválida, app já inicializado por outro caminho). `ensure()` é chamado
    // por `getClientAuth()`, que renderiza `/auth/action` — o handler de reset
    // de senha de toda a plataforma. Um throw aqui derrubaria essa página.
    console.warn("[app-check] initializeAppCheck falhou — seguindo sem App Check", err);
  }
}
