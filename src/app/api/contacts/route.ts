import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { fireContactCreated } from "@/lib/webhooks";

async function authenticateRequest(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const apiKey = authHeader.slice(7);
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: keyRecord } = await serviceSupabase
      .from("user_api_keys")
      .select("user_id")
      .eq("key", apiKey)
      .single();

    if (keyRecord) {
      await serviceSupabase
        .from("user_api_keys")
        .update({ last_used_at: new Date().toISOString() })
        .eq("key", apiKey);

      return { userId: keyRecord.user_id };
    }
    return null;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return { userId: user.id };

  return null;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const search = request.nextUrl.searchParams.get("search") || "";

  if (!search.trim()) {
    return NextResponse.json({ contacts: [] });
  }

  const escaped = search.replace(/[%_\\]/g, "\\$&");
  const { data: contacts } = await supabase
    .from("contacts")
    .select("*")
    .eq("user_id", user.id)
    .or(
      `name.ilike.*${escaped}*,email.ilike.*${escaped}*,company.ilike.*${escaped}*`
    )
    .order("name")
    .limit(50);

  return NextResponse.json({ contacts: contacts || [] });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || !body.name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const email = body.email?.trim() || null;
  if (email) {
    const { data: existing } = await serviceSupabase
      .from("contacts")
      .select("id")
      .eq("user_id", auth.userId)
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "A contact with this email already exists", existingId: existing.id }, { status: 409 });
    }
  }

  const source = ["cold", "referral", "inbound"].includes(body.source) ? body.source : null;

  const { data: contact, error } = await serviceSupabase
    .from("contacts")
    .insert({
      user_id: auth.userId,
      name: body.name.trim(),
      email,
      phone: body.phone?.trim() || null,
      company: body.company?.trim() || null,
      title: body.title?.trim() || null,
      source,
      notes: body.notes?.trim() || null,
    })
    .select()
    .single();

  if (error) { console.error("contacts insert error:", error); return NextResponse.json({ error: "Failed to create contact" }, { status: 500 }); }

  await serviceSupabase.from("activity").insert({
    user_id: auth.userId,
    contact_id: contact.id,
    type: "contact_created",
    description: `Contact created via Chrome extension`,
  });

  fireContactCreated(auth.userId, {
    id: contact.id,
    name: contact.name,
    email: contact.email,
    company: contact.company,
  }).catch((err) => {
    console.error("Webhook fireContactCreated failed:", err);
  });

  return NextResponse.json({ contact }, { status: 201 });
}
