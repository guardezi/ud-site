"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  applyActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";
import { getClientAuth } from "@/lib/firebase/client";

/**
 * Custom email action handler do Firebase Auth com a identidade visual da UD.
 * Configurar em cada ambiente: Firebase Console → Authentication → Templates →
 * "Personalizar URL de ação" → https://<dominio>/auth/action
 *
 * O Firebase anexa `?mode=...&oobCode=...&apiKey=...&lang=...&continueUrl=...`.
 * Tratamos `resetPassword` (com as MESMAS regras de senha do app) e
 * `verifyEmail`. O idioma vem do `lang`.
 */

// ---------------------------------------------------------------------------
// i18n (independente do next-intl — o idioma vem do `lang` do Firebase)
// ---------------------------------------------------------------------------
type Lang = "pt" | "en" | "es";

const STRINGS: Record<Lang, Record<string, string>> = {
  pt: {
    verifying: "Validando o link...",
    resetTitle: "Criar nova senha",
    resetFor: "Redefinindo a senha de",
    newPassword: "Nova senha",
    show: "Mostrar",
    hide: "Ocultar",
    reqMinLength: "Pelo menos 8 caracteres",
    reqUpper: "Uma letra maiúscula",
    reqLower: "Uma letra minúscula",
    reqNumber: "Um número",
    reqSpecial: "Um caractere especial",
    save: "Salvar nova senha",
    saving: "Salvando...",
    resetOkTitle: "Senha alterada!",
    resetOkBody: "Entre no app Ultimate Drift com a sua nova senha.",
    verifyOkTitle: "E-mail verificado!",
    verifyOkBody: "Sua conta foi confirmada. Você já pode voltar ao app.",
    openApp: "Abrir o app",
    errTitle: "Não foi possível concluir",
    errInvalid: "Este link é inválido ou já expirou. Solicite um novo pelo app.",
    errGeneric: "Algo deu errado. Tente novamente em instantes.",
    errWeak: "A senha não atende aos requisitos.",
    close: "Se o app não abrir sozinho, toque no botão acima.",
  },
  en: {
    verifying: "Validating the link...",
    resetTitle: "Create a new password",
    resetFor: "Resetting the password for",
    newPassword: "New password",
    show: "Show",
    hide: "Hide",
    reqMinLength: "At least 8 characters",
    reqUpper: "One uppercase letter",
    reqLower: "One lowercase letter",
    reqNumber: "One number",
    reqSpecial: "One special character",
    save: "Save new password",
    saving: "Saving...",
    resetOkTitle: "Password changed!",
    resetOkBody: "Sign in to the Ultimate Drift app with your new password.",
    verifyOkTitle: "Email verified!",
    verifyOkBody: "Your account is confirmed. You can go back to the app now.",
    openApp: "Open the app",
    errTitle: "We couldn't finish",
    errInvalid: "This link is invalid or has expired. Request a new one from the app.",
    errGeneric: "Something went wrong. Please try again shortly.",
    errWeak: "The password doesn't meet the requirements.",
    close: "If the app doesn't open on its own, tap the button above.",
  },
  es: {
    verifying: "Validando el enlace...",
    resetTitle: "Crear una nueva contraseña",
    resetFor: "Restableciendo la contraseña de",
    newPassword: "Nueva contraseña",
    show: "Mostrar",
    hide: "Ocultar",
    reqMinLength: "Al menos 8 caracteres",
    reqUpper: "Una letra mayúscula",
    reqLower: "Una letra minúscula",
    reqNumber: "Un número",
    reqSpecial: "Un carácter especial",
    save: "Guardar nueva contraseña",
    saving: "Guardando...",
    resetOkTitle: "¡Contraseña cambiada!",
    resetOkBody: "Inicia sesión en la app Ultimate Drift con tu nueva contraseña.",
    verifyOkTitle: "¡Correo verificado!",
    verifyOkBody: "Tu cuenta fue confirmada. Ya puedes volver a la app.",
    openApp: "Abrir la app",
    errTitle: "No se pudo completar",
    errInvalid: "Este enlace no es válido o ha caducado. Solicita uno nuevo desde la app.",
    errGeneric: "Algo salió mal. Inténtalo de nuevo en unos momentos.",
    errWeak: "La contraseña no cumple los requisitos.",
    close: "Si la app no se abre sola, toca el botón de arriba.",
  },
};

function resolveLang(raw: string | null): Lang {
  const v = (raw ?? "").toLowerCase();
  if (v.startsWith("pt")) return "pt";
  if (v.startsWith("es")) return "es";
  if (v.startsWith("en")) return "en";
  return "pt";
}

// ---------------------------------------------------------------------------
// Reabrir o app após concluir. O reset acontece aqui na web; ao terminar,
// mandamos o usuário de volta ao app pelo deep link `new-password` (registrado
// no ud-app: App Link https + custom scheme `ultimatedrift://new-password`).
// ---------------------------------------------------------------------------
const UD_APP_STORE_URL = "https://apps.apple.com/app/id6737285909";
const UD_PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=br.com.ultimatedrift.app";
const ANDROID_PACKAGE = "br.com.ultimatedrift.app";
const DEEP_PATH = "new-password";

function isMobileUA(): boolean {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  return /android|iphone|ipad|ipod/i.test(ua);
}

/**
 * Abre o app com estratégia por plataforma, caindo na loja quando não está
 * instalado. Android: `intent://` (package explícito + fallback Play Store).
 * iOS: custom scheme `ultimatedrift://new-password` com fallback pra App Store.
 * Desktop: abre a Play Store numa nova aba (não há app pra abrir).
 */
function openUdApp() {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  if (/android/i.test(ua)) {
    const fallback = encodeURIComponent(UD_PLAY_STORE_URL);
    window.location.href = `intent://ultimatedrift.app/${DEEP_PATH}#Intent;scheme=https;package=${ANDROID_PACKAGE};S.browser_fallback_url=${fallback};end`;
  } else if (/iphone|ipad|ipod/i.test(ua)) {
    let opened = false;
    const mark = () => {
      opened = true;
    };
    document.addEventListener("visibilitychange", mark);
    window.addEventListener("pagehide", mark);
    window.setTimeout(() => {
      document.removeEventListener("visibilitychange", mark);
      window.removeEventListener("pagehide", mark);
      if (!opened && document.visibilityState === "visible") {
        window.location.href = UD_APP_STORE_URL;
      }
    }, 1500);
    window.location.href = `ultimatedrift://${DEEP_PATH}`;
  } else {
    window.open(UD_PLAY_STORE_URL, "_blank", "noopener");
  }
}

// ---------------------------------------------------------------------------
// Regras de senha — espelham StringUtils do app (lib/utils/string_utils.dart)
// ---------------------------------------------------------------------------
const CHECKS = {
  minLength: (v: string) => v.trim().length >= 8,
  upper: (v: string) => /[A-Z]/.test(v),
  lower: (v: string) => /[a-z]/.test(v),
  number: (v: string) => /\d/.test(v),
  special: (v: string) =>
    /[!@#$%^&*(),.?":{}|<>\-_=+\[\]\\\/`~]/.test(v),
};

function isValidPassword(v: string): boolean {
  return (
    CHECKS.minLength(v) &&
    CHECKS.upper(v) &&
    CHECKS.lower(v) &&
    CHECKS.number(v) &&
    CHECKS.special(v)
  );
}

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------
type Status = "verifying" | "resetForm" | "success" | "error";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4 py-10">
      <div className="w-full max-w-[420px] rounded-2xl bg-shade p-6 shadow-2xl ring-1 ring-rail/60 sm:p-8">
        <div className="mb-6 flex justify-center">
          <Image
            src="/theme/svg/ud-logo.svg"
            alt="Ultimate Drift"
            width={150}
            height={34}
            priority
            unoptimized
          />
        </div>
        {children}
      </div>
    </div>
  );
}

function Requirement({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-[13px]">
      <span
        className={ok ? "text-drift" : "text-faint"}
        aria-hidden
      >
        {ok ? "✓" : "○"}
      </span>
      <span className={ok ? "text-mute" : "text-faint"}>{label}</span>
    </li>
  );
}

function ActionInner() {
  const params = useSearchParams();
  const mode = params.get("mode");
  const oobCode = params.get("oobCode");
  const t = useMemo(() => STRINGS[resolveLang(params.get("lang"))], [params]);

  const [status, setStatus] = useState<Status>("verifying");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successKind, setSuccessKind] = useState<"reset" | "verify">("reset");

  // Passo inicial: valida o código conforme o modo.
  useEffect(() => {
    let active = true;
    async function run() {
      if (!oobCode || !mode) {
        if (active) {
          setErrorMsg(t.errInvalid);
          setStatus("error");
        }
        return;
      }
      const auth = getClientAuth();
      try {
        if (mode === "resetPassword") {
          const mail = await verifyPasswordResetCode(auth, oobCode);
          if (!active) return;
          setEmail(mail);
          setStatus("resetForm");
        } else if (mode === "verifyEmail") {
          await applyActionCode(auth, oobCode);
          if (!active) return;
          setSuccessKind("verify");
          setStatus("success");
        } else {
          // Outros modos (recoverEmail etc.) — aplica e mostra sucesso genérico.
          await applyActionCode(auth, oobCode);
          if (!active) return;
          setSuccessKind("verify");
          setStatus("success");
        }
      } catch {
        if (!active) return;
        setErrorMsg(t.errInvalid);
        setStatus("error");
      }
    }
    run();
    return () => {
      active = false;
    };
  }, [oobCode, mode, t]);

  // Ao concluir, tenta reabrir o app automaticamente (best-effort, só mobile —
  // no desktop não há app pra abrir). O botão "Abrir o app" fica como fallback.
  const autoOpened = useRef(false);
  useEffect(() => {
    if (status === "success" && !autoOpened.current && isMobileUA()) {
      autoOpened.current = true;
      openUdApp();
    }
  }, [status]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidPassword(password) || submitting || !oobCode) return;
    setSubmitting(true);
    setErrorMsg("");
    try {
      await confirmPasswordReset(getClientAuth(), oobCode, password);
      setSuccessKind("reset");
      setStatus("success");
    } catch (err: unknown) {
      const code = (err as { code?: string } | null)?.code ?? "";
      setErrorMsg(
        code === "auth/weak-password" ? t.errWeak : t.errGeneric,
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "verifying") {
    return (
      <Shell>
        <p className="text-center text-mute">{t.verifying}</p>
      </Shell>
    );
  }

  if (status === "error") {
    return (
      <Shell>
        <h1 className="mb-2 text-center text-xl font-bold text-signal">
          {t.errTitle}
        </h1>
        <p className="text-center text-[14px] text-mute">{errorMsg}</p>
      </Shell>
    );
  }

  if (status === "success") {
    const okTitle = successKind === "reset" ? t.resetOkTitle : t.verifyOkTitle;
    const okBody = successKind === "reset" ? t.resetOkBody : t.verifyOkBody;
    return (
      <Shell>
        <div className="mb-4 flex justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-drift/15 text-2xl text-drift">
            ✓
          </span>
        </div>
        <h1 className="mb-2 text-center text-xl font-bold text-signal">
          {okTitle}
        </h1>
        <p className="text-center text-[14px] text-mute">{okBody}</p>
        <button
          type="button"
          onClick={openUdApp}
          className="mt-6 w-full rounded-lg bg-drift py-3 font-bold text-ink transition hover:opacity-90"
        >
          {t.openApp}
        </button>
        <p className="mt-4 text-center text-[12px] text-faint">{t.close}</p>
      </Shell>
    );
  }

  // status === "resetForm"
  const checks = {
    minLength: CHECKS.minLength(password),
    upper: CHECKS.upper(password),
    lower: CHECKS.lower(password),
    number: CHECKS.number(password),
    special: CHECKS.special(password),
  };
  const valid = Object.values(checks).every(Boolean);

  return (
    <Shell>
      <h1 className="mb-1 text-center text-xl font-bold text-signal">
        {t.resetTitle}
      </h1>
      {email && (
        <p className="mb-5 text-center text-[13px] text-faint">
          {t.resetFor} <span className="text-mute">{email}</span>
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <label className="mb-1.5 block text-[13px] font-bold text-mute">
          {t.newPassword}
        </label>
        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            autoFocus
            className="w-full rounded-lg border border-rail bg-ink px-3 py-2.5 pr-16 text-signal outline-none focus:border-drift"
          />
          <button
            type="button"
            onClick={() => setShowPw((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] font-bold text-drift"
          >
            {showPw ? t.hide : t.show}
          </button>
        </div>

        <ul className="mt-3 space-y-1">
          <Requirement ok={checks.minLength} label={t.reqMinLength} />
          <Requirement ok={checks.upper} label={t.reqUpper} />
          <Requirement ok={checks.lower} label={t.reqLower} />
          <Requirement ok={checks.number} label={t.reqNumber} />
          <Requirement ok={checks.special} label={t.reqSpecial} />
        </ul>

        {errorMsg && (
          <p className="mt-3 text-[13px] text-brake">{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={!valid || submitting}
          className="mt-5 w-full rounded-lg bg-drift py-3 font-bold text-ink transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? t.saving : t.save}
        </button>
      </form>
    </Shell>
  );
}

export default function AuthActionPage() {
  return (
    <Suspense
      fallback={
        <Shell>
          <p className="text-center text-mute">...</p>
        </Shell>
      }
    >
      <ActionInner />
    </Suspense>
  );
}
