import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

function hashContactId(contactId: string) {
  const salt = process.env.CRON_SECRET || "solocrm-unsubscribe";
  return crypto.createHash("sha256").update(`${contactId}:${salt}`).digest("hex");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: contacts, error } = await supabase
    .from("contacts")
    .select("id, is_opted_out");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const match = (contacts || []).find((c) => hashContactId(c.id) === token);

  if (!match) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }

  if (match.is_opted_out) {
    return NextResponse.json({ already: true });
  }

  const { error: updateError } = await supabase
    .from("contacts")
    .update({ is_opted_out: true })
    .eq("id", match.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
