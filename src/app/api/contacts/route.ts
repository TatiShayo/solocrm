import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

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
