import { createClient } from "@/lib/supabase/server";
import { createChatCompletion } from "@/lib/openai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { dealId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { dealId } = body;
  if (!dealId) {
    return NextResponse.json({ error: "dealId is required" }, { status: 400 });
  }

  const { data: deal } = await supabase
    .from("deals")
    .select("*, contact:contact_id(id, name, email, company)")
    .eq("id", dealId)
    .eq("user_id", user.id)
    .single();

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  const { data: stageData } = await supabase
    .from("stages")
    .select("*, pipeline:pipeline_id(name)")
    .eq("id", deal.stage_id)
    .single();

  const { data: activities } = await supabase
    .from("activity")
    .select("*")
    .eq("deal_id", dealId)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("deal_id", dealId)
    .order("due_date", { ascending: true });

  const contact = Array.isArray(deal.contact)
    ? deal.contact[0]
    : deal.contact;

  const pipeline = stageData?.pipeline
    ? (Array.isArray(stageData.pipeline) ? stageData.pipeline[0] : stageData.pipeline)
    : null;

  const dealContext = [
    `Deal: ${deal.title}`,
    `Value: $${deal.value.toLocaleString()}`,
    `Probability: ${deal.probability}%`,
    `Status: ${deal.status}`,
    `Stage: ${stageData?.name || "Unknown"}`,
    pipeline ? `Pipeline: ${pipeline.name}` : null,
    contact ? `Contact: ${contact.name}${contact.company ? ` (${contact.company})` : ""}` : null,
    deal.close_date ? `Close date: ${deal.close_date}` : null,
    deal.lost_reason ? `Loss reason: ${deal.lost_reason}` : null,
    deal.notes ? `Notes: ${deal.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const timeline = (activities || [])
    .map((a) => `- ${new Date(a.created_at).toLocaleDateString()}: ${a.description}`)
    .join("\n");

  const tasksList = (tasks || [])
    .map(
      (t) =>
        `- ${t.completed ? "[✓]" : "[ ]"} ${t.title} (${t.type}, due ${t.due_date})`
    )
    .join("\n");

  try {
    const completion = await createChatCompletion([
      {
        role: "user",
        content: `Summarize the status of this deal in 3-5 bullet points. Be specific and actionable.\n\n${dealContext}\n\nActivity timeline:\n${timeline || "No activity recorded"}\n\nTasks:\n${tasksList || "No tasks"}`,
      },
    ]);

    const summary = completion.choices[0]?.message?.content?.trim() || "";
    return NextResponse.json({ summary });
  } catch (error) {
    console.error("OpenAI error:", error);
    return NextResponse.json({ error: "Failed to generate deal summary" }, { status: 500 });
  }
}
