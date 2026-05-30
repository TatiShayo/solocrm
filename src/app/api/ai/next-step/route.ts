import { createClient } from "@/lib/supabase/server";
import { createChatCompletion } from "@/lib/openai";
import { NextRequest, NextResponse } from "next/server";
import { validateBody, dealIdSchema } from "@/lib/validation";

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

  const parsed = validateBody(rawBody, dealIdSchema);
  if (parsed instanceof NextResponse) return parsed;
  const { dealId } = parsed;

  const { data: deal } = await supabase
    .from("deals")
    .select("*")
    .eq("id", dealId)
    .eq("user_id", user.id)
    .single();

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  if (deal.status !== "open") {
    return NextResponse.json({ error: "Deal is not open" }, { status: 400 });
  }

  const { data: stageData } = await supabase
    .from("stages")
    .select("name")
    .eq("id", deal.stage_id)
    .single();

  const daysSinceCreated = Math.floor(
    (Date.now() - new Date(deal.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  const daysSinceUpdated = Math.floor(
    (Date.now() - new Date(deal.updated_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  const { data: recentActivity } = await supabase
    .from("activity")
    .select("*")
    .eq("deal_id", dealId)
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: openTasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("deal_id", dealId)
    .eq("completed", false);

  const dealContext = [
    `Deal: ${deal.title}`,
    `Value: $${deal.value.toLocaleString()}`,
    `Probability: ${deal.probability}%`,
    `Stage: ${stageData?.name || "Unknown"}`,
    `Days since created: ${daysSinceCreated}`,
    `Days since last updated: ${daysSinceUpdated}`,
    deal.close_date ? `Close date: ${deal.close_date}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const recentActivityStr = (recentActivity || [])
    .map((a) => `- ${new Date(a.created_at).toLocaleDateString()}: ${a.description}`)
    .join("\n");

  const openTasksStr = (openTasks || [])
    .map((t) => `- ${t.title} (${t.type}, due ${t.due_date})`)
    .join("\n");

  try {
    const completion = await createChatCompletion([
      {
        role: "user",
        content: `Based on this deal's context, suggest the single best next action to move it forward. Give 1-2 sentences. Be specific and actionable.\n\n${dealContext}\n\nRecent activity:\n${recentActivityStr || "None"}\n\nOpen tasks:\n${openTasksStr || "None"}`,
      },
    ]);

    const suggestion = completion.choices[0]?.message?.content?.trim() || "";
    return NextResponse.json({ suggestion, daysInStage: daysSinceUpdated, daysSinceCreated });
  } catch (error) {
    console.error("OpenAI error:", error);
    return NextResponse.json({ error: "Failed to generate suggestion" }, { status: 500 });
  }
}
