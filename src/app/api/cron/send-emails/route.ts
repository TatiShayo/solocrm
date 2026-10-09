import { NextResponse } from "next/server";
import { processScheduledEmails } from "@/lib/sequence-engine";
import { requireCron } from "@/lib/cron-guard";

/**
 * @deprecated Use /api/cron/sequences instead — this route is a byte-identical
 * duplicate that existed only by accident. Both are kept so an external
 * scheduler configured against either URL keeps working, but they now share the
 * same guard.
 */
export async function GET(request: Request) {
  const unauthorized = requireCron(request);
  if (unauthorized) return unauthorized;

  try {
    const result = await processScheduledEmails();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Scheduled email processing failed:", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
