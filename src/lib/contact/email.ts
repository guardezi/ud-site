/**
 * Monta o doc do outbox `emails/{id}` (ud-app) pra uma mensagem do formulário
 * de contato do site. Função pura (sem Firebase) pra ser testável.
 *
 * Formato "já pronto pra enviar", o mesmo que o ud-backoffice usa
 * (`src/lib/emailTemplates/actions.ts` → sendTestEmail):
 *   - `status: "queued"` → `db/emails/onQueued.function.ts` (ud-app) envia
 *     pelo Postal (`to`, `subject`, `html`/`text`, `replyTo`, `tag`←`type`).
 *   - `db/emails/onWrite.function.ts` só age em `status: "pending"`, então
 *     ignora este doc.
 * Sem `template`: assunto e corpo montados aqui, com tudo escapado.
 */

export const CONTACT_EMAIL_TO = "suporteapp@ultimatedrift.com.br";
export const CONTACT_EMAIL_TYPE = "siteContact";

export interface ContactMessage {
  name: string;
  email: string;
  phone: string;
  message: string;
}

export interface ContactEmailDoc {
  status: "queued";
  type: typeof CONTACT_EMAIL_TYPE;
  source: "site";
  to: string;
  replyTo: string;
  subject: string;
  text: string;
  html: string;
  locale: string;
}

/** Remove CR/LF e demais caracteres de controle (evita header injection). */
export function singleLine(v: string): string {
  return v.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
}

/** Mantém quebras de linha, remove os demais caracteres de controle. */
function multiLine(v: string): string {
  return (
    v
      .replace(/\r\n?/g, "\n")
      .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, "")
      .trim()
  );
}

export function escapeHtml(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildContactEmail(msg: ContactMessage, locale: string): ContactEmailDoc {
  const name = singleLine(msg.name);
  const email = singleLine(msg.email).toLowerCase();
  const phone = singleLine(msg.phone);
  const message = multiLine(msg.message);
  const loc = singleLine(locale).slice(0, 10);

  const subject = singleLine(`[Site] Contato de ${name}`).slice(0, 200);

  const text = [
    "Nova mensagem pelo formulário de contato do site (ultimatedrift.com.br/contato).",
    "",
    `Nome: ${name}`,
    `E-mail: ${email}`,
    `Telefone: ${phone}`,
    `Idioma: ${loc}`,
    "",
    "Mensagem:",
    message,
    "",
    "Responda este e-mail para falar direto com quem escreveu.",
  ].join("\n");

  const row = (label: string, value: string) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#555"><strong>${label}</strong></td><td style="padding:4px 0">${escapeHtml(value)}</td></tr>`;

  const html = [
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111">',
    "<p>Nova mensagem pelo formulário de contato do site (ultimatedrift.com.br/contato).</p>",
    "<table>",
    row("Nome", name),
    row("E-mail", email),
    row("Telefone", phone),
    row("Idioma", loc),
    "</table>",
    "<p><strong>Mensagem:</strong></p>",
    `<p style="white-space:pre-wrap">${escapeHtml(message).replace(/\n/g, "<br>")}</p>`,
    '<p style="color:#777">Responda este e-mail para falar direto com quem escreveu.</p>',
    "</div>",
  ].join("");

  return {
    status: "queued",
    type: CONTACT_EMAIL_TYPE,
    source: "site",
    to: CONTACT_EMAIL_TO,
    replyTo: email,
    subject,
    text,
    html,
    locale: loc,
  };
}
