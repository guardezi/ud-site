import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { listPublishedEvents } from "@/lib/ticketing/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const out: Record<string, unknown> = {
    projectEnv: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? null,
    appProject: adminDb.app?.options?.projectId ?? null,
  };
  try {
    const raw = await adminDb.collection("ticketEvents").get();
    out.rawCount = raw.size;
    out.rawIds = raw.docs.map((d) => ({ id: d.id, status: d.get("status"), slug: d.get("slug") }));
  } catch (e) {
    out.rawError = String(e);
  }
  try {
    out.publishedCount = (await listPublishedEvents()).length;
  } catch (e) {
    out.publishedError = String(e);
  }
  return NextResponse.json(out);
}
