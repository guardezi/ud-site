/**
 * Formulário de contato do site — mesmos campos do site legado
 * (ultimatedrift.com.br/contato: nome, email, telefone, mensagem).
 *
 * `website` é honeypot: invisível pra humanos, bots costumam preencher.
 */
import { z } from "zod";

export const contactInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().max(254).pipe(z.email()),
  phone: z
    .string()
    .trim()
    .max(30)
    .refine((v) => v.replace(/\D/g, "").length >= 8, "phone"),
  message: z.string().trim().min(10).max(5000),
  website: z.string().max(500).optional().default(""),
});

export type ContactInput = z.input<typeof contactInputSchema>;

export type ContactErrorCode = "DISABLED" | "INVALID_INPUT" | "APP_CHECK" | "INTERNAL";

export type ContactResult = { ok: true } | { ok: false; error: ContactErrorCode };

/** Remote Config (template server-side, defaultValue). Ausente = desligado. */
export const CONTACT_FORM_FLAG = "isSiteContactFormEnabled";
