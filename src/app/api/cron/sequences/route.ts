import { NextResponse } from "next/server";
import { processScheduledEmails } from "@/lib/sequence-engine";
import { requireCron } from "@/lib/cron-guard";

/**
 * Processes due scheduled sequence emails.
 *
 * Shares a constant-time guard with /api/cron/send-emails (a historical
 * duplicate) rather than re-implementing the bearer comparison.
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
