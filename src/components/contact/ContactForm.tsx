"use client";

import { useRef, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getClientApp } from "@/lib/firebase/client";
import { getAppCheckTokenOrNull } from "@/lib/firebase/app-check";
import { submitContactMessage } from "@/lib/contact/actions";

type Status = "idle" | "sending" | "success" | "error";

// O tema não define fundo nos campos (no WP valia o default do browser: branco);
// o preflight do Tailwind zera pra transparente. Restaura o visual do site antigo.
const FIELD_STYLE = { backgroundColor: "#fff", color: "#111" } as const;

/**
 * Formulário de contato com o markup/classes do tema legado
 * (`.contact-form`, `.form-group`, `.form-input`, `.form-submit`).
 */
export function ContactForm() {
  const t = useTranslations("contato.form");
  const locale = useLocale();
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [feedback, setFeedback] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;
    const fd = new FormData(e.currentTarget);
    setStatus("sending");
    setFeedback(t("sending"));
    try {
      let token: string | null = null;
      try {
        token = await getAppCheckTokenOrNull(getClientApp());
      } catch {
        token = null;
      }
      const res = await submitContactMessage(
        {
          name: String(fd.get("nome") ?? ""),
          email: String(fd.get("email") ?? ""),
          phone: String(fd.get("telefone") ?? ""),
          message: String(fd.get("mensagem") ?? ""),
          website: String(fd.get("website") ?? ""),
        },
        token,
        locale,
      );
      if (res.ok) {
        setStatus("success");
        setFeedback(t("success"));
        formRef.current?.reset();
      } else {
        setStatus("error");
        setFeedback(
          res.error === "INVALID_INPUT" ? t("errorInvalid") : t("errorGeneric"),
        );
      }
    } catch {
      setStatus("error");
      setFeedback(t("errorGeneric"));
    }
  }

  return (
    <form ref={formRef} className="contact-form" id="contact-form" onSubmit={onSubmit} noValidate={false}>
      <div className="form-group-container">
        <div className="form-group">
          <label htmlFor="nome" className="form-label">
            {t("name")}
          </label>
          <input
            id="nome"
            name="nome"
            className="form-input"
            style={FIELD_STYLE}
            placeholder={t("namePlaceholder")}
            type="text"
            autoComplete="name"
            minLength={2}
            maxLength={120}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="email" className="form-label">
            {t("email")}
          </label>
          <input
            id="email"
            name="email"
            className="form-input"
            style={FIELD_STYLE}
            placeholder={t("emailPlaceholder")}
            type="email"
            autoComplete="email"
            maxLength={254}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="telefone" className="form-label">
            {t("phone")}
          </label>
          <input
            id="telefone"
            name="telefone"
            className="form-input"
            style={FIELD_STYLE}
            placeholder={t("phonePlaceholder")}
            type="tel"
            autoComplete="tel"
            maxLength={30}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="mensagem" className="form-label">
            {t("message")}
          </label>
          <textarea
            className="form-textarea"
            style={FIELD_STYLE}
            id="mensagem"
            name="mensagem"
            placeholder={t("messagePlaceholder")}
            minLength={10}
            maxLength={5000}
            required
          />
        </div>
        {/* Honeypot: fora da tela e fora da ordem de tab. */}
        <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
          <label htmlFor="website">Website</label>
          <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>
      </div>
      <button className="form-submit" type="submit" disabled={status === "sending"}>
        {status === "sending" ? t("sendingButton") : t("submit")}
      </button>
      {feedback && (
        <p
          role={status === "error" ? "alert" : "status"}
          aria-live="polite"
          style={{
            marginTop: 16,
            color: status === "success" ? "#54F251" : status === "error" ? "#ff6b6b" : "#d6d6d6",
          }}
        >
          {feedback}
        </p>
      )}
    </form>
  );
}
