import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe-token";
import { rateLimit, clientIpFrom } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const ip = clientIpFrom(new Headers(request.headers));
  const limited = rateLimit(`api:unsubscribe:${ip}`, 20, 60_000);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } }
    );
  }

  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  // HMAC-verified token — only the server can mint one, so a caller cannot
  // opt out arbitrary contacts by guessing IDs (previous implementation
  // scanned every tenant's contacts against an unsalted-default hash).
  const contactId = verifyUnsubscribeToken(token);
  if (!contactId) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: contact, error } = await supabase
    .from("contacts")
    .select("id, is_opted_out")
    .eq("id", contactId)
    .maybeSingle();

  if (error) {
    console.error("unsubscribe lookup error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  if (!contact) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }

  if (contact.is_opted_out) {
    return NextResponse.json({ already: true });
  }

  const { error: updateError } = await supabase
    .from("contacts")
    .update({ is_opted_out: true })
    .eq("id", contact.id);

  if (updateError) {
    console.error("unsubscribe update error:", updateError);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
