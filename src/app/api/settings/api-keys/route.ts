import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { validateBody, apiKeySchema } from "@/lib/validation";

function generateApiKey(): string {
  return `sk_${randomBytes(32).toString("hex")}`;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: keys } = await supabase
    .from("user_api_keys")
    .select("id, name, key, last_used_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ keys: keys || [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rawBody = await request.json().catch(() => null);
  if (rawBody === null) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = validateBody(rawBody, apiKeySchema);
  if (parsed instanceof NextResponse) return parsed;
  const { name } = parsed;

  const key = generateApiKey();

  const { data: apiKey, error } = await supabase
    .from("user_api_keys")
    .insert({ user_id: user.id, name: name.trim(), key })
    .select("id, name, key, last_used_at, created_at")
    .single();

  if (error) { console.error("API key operation failed:", error); return NextResponse.json({ error: "API key operation failed" }, { status: 500 }); }

  return NextResponse.json({ key: apiKey }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error } = await supabase
    .from("user_api_keys")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) { console.error("API key operation failed:", error); return NextResponse.json({ error: "API key operation failed" }, { status: 500 }); }

  return NextResponse.json({ success: true });
}
