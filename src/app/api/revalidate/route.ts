import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import crypto from "node:crypto";

/**
 * Webhook chamado pelo `ud-backoffice` (server action) quando uma notícia,
 * sponsor, categoria ou página estática é publicada/editada. Cada chamada
 * carrega um array de tags pra invalidar.
 *
 * Auth: HMAC-SHA256 do body cru, usando `REVALIDATE_SECRET` (gravado nos
 * dois lados via App Hosting secrets). Comparação em tempo constante.
 *
 * Contrato do body:
 *   { tags: string[], ts: number }
 * Header obrigatório: `x-ud-signature: <hex>`
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECRET = process.env.REVALIDATE_SECRET ?? "";
const MAX_SKEW_MS = 5 * 60 * 1000; // 5min — protege contra replay com timestamp antigo

export async function POST(req: NextRequest) {
  if (!SECRET) {
    return NextResponse.json(
      { ok: false, reason: "REVALIDATE_SECRET not configured" },
      { status: 503 },
    );
  }

  const raw = await req.text();
  const signature = req.headers.get("x-ud-signature") ?? "";

  const expected = crypto.createHmac("sha256", SECRET).update(raw).digest("hex");
  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return NextResponse.json({ ok: false, reason: "invalid signature" }, { status: 401 });
  }

  let payload: { tags?: string[]; ts?: number };
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, reason: "bad json" }, { status: 400 });
  }

  if (typeof payload.ts === "number" && Math.abs(Date.now() - payload.ts) > MAX_SKEW_MS) {
    return NextResponse.json({ ok: false, reason: "stale timestamp" }, { status: 401 });
  }

  const tags = Array.isArray(payload.tags) ? payload.tags.filter((t) => typeof t === "string" && t.length > 0) : [];
  for (const tag of tags) revalidateTag(tag, "default");

  return NextResponse.json({ ok: true, revalidated: tags, count: tags.length });
}

export async function GET() {
  return NextResponse.json(
    { ok: false, reason: "POST only" },
    { status: 405, headers: { Allow: "POST" } },
  );
}
