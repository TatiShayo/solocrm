import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { validateBody, webhookSchema } from "@/lib/validation";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: webhooks } = await supabase
    .from("webhooks")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ webhooks: webhooks || [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = validateBody(rawBody, webhookSchema);
  if (parsed instanceof NextResponse) return parsed;
  const { url, events } = parsed;

  const { data: webhook, error } = await supabase
    .from("webhooks")
    .insert({
      user_id: user.id,
      url: url.trim(),
      events,
    })
    .select()
    .single();

  if (error) { console.error("Webhook operation failed:", error); return NextResponse.json({ error: "Webhook operation failed" }, { status: 500 }); }

  return NextResponse.json({ webhook });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error } = await supabase
    .from("webhooks")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) { console.error("Webhook operation failed:", error); return NextResponse.json({ error: "Webhook operation failed" }, { status: 500 }); }

  return NextResponse.json({ success: true });
}
