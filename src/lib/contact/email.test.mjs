// Rodar: pnpm test (node --experimental-strip-types --test)
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildContactEmail, CONTACT_EMAIL_TO } from "./email.ts";

const base = { name: "Fulano", email: "Fulano@Example.com", phone: "(11) 99999-0000", message: "Olá,\nquero saber mais." };

test("monta doc queued pronto pro onQueued, com replyTo de quem escreveu", () => {
  const doc = buildContactEmail(base, "pt-BR");
  assert.equal(doc.status, "queued");
  assert.equal(doc.type, "siteContact");
  assert.equal(doc.to, CONTACT_EMAIL_TO);
  assert.equal(doc.replyTo, "fulano@example.com");
  assert.equal(doc.subject, "[Site] Contato de Fulano");
  assert.ok(doc.text.includes("Telefone: (11) 99999-0000"));
  assert.ok(doc.text.includes("Olá,\nquero saber mais."));
  assert.ok(doc.html.includes("Olá,<br>quero saber mais."));
  assert.equal("template" in doc, false);
});

test("escapa HTML de todos os campos", () => {
  const doc = buildContactEmail(
    { name: "<b>x</b>", email: "a@b.co", phone: "1234-5678 <i>", message: "<script>alert(1)</script> & 'y'" },
    "pt-BR",
  );
  assert.equal(doc.html.includes("<script>"), false);
  assert.equal(doc.html.includes("<b>x</b>"), false);
  assert.equal(doc.html.includes("<i>"), false);
  assert.ok(doc.html.includes("&lt;script&gt;alert(1)&lt;/script&gt; &amp; &#39;y&#39;"));
});

test("remove CR/LF do assunto e do replyTo (header injection)", () => {
  const doc = buildContactEmail({ ...base, name: "A\r\nBcc: x@y.z", email: "a@b.co\r\nBcc: x@y.z" }, "pt-BR\n");
  assert.equal(/[\r\n]/.test(doc.subject), false);
  assert.equal(/[\r\n]/.test(doc.replyTo), false);
  assert.equal(/[\r\n]/.test(doc.locale), false);
});
