import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { listPublishedEvents } from "@/lib/ticketing/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const out: Record<string, unknown> = {
    projectEnv: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? null,
    gcloudProject:
      process.env.GOOGLE_CLOUD_PROJECT ?? process.env.GCLOUD_PROJECT ?? null,
  };
  try {
    const raw = await adminDb.collection("ticketEvents").get();
    out.rawCount = raw.size;
    out.rawDocs = raw.docs.map((d) => ({ id: d.id, status: d.get("status") }));
  } catch (e) {
    out.rawError = e instanceof Error ? e.message : String(e);
  }
  try {
    out.publishedCount = (await listPublishedEvents()).length;
  } catch (e) {
    out.publishedError = e instanceof Error ? e.message : String(e);
  }
  return NextResponse.json(out);
}
