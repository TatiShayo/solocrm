import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: deals } = await supabase
    .from("deals")
    .select("id, title, value, status")
    .eq("user_id", user.id)
    .order("title");

  return NextResponse.json({ deals: deals || [] });
}
