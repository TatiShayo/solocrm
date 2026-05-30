import { createClient } from "@/lib/supabase/server";
import { createChatCompletion } from "@/lib/openai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { contactId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { contactId } = body;
  if (!contactId) {
    return NextResponse.json({ error: "contactId is required" }, { status: 400 });
  }

  const { data: contact } = await supabase
    .from("contacts")
    .select("id, name, meeting_notes, user_id")
    .eq("id", contactId)
    .eq("user_id", user.id)
    .single();

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  if (!contact.meeting_notes?.trim()) {
    return NextResponse.json({ error: "No meeting notes found for this contact" }, { status: 400 });
  }

  try {
    const completion = await createChatCompletion([
      {
        role: "user",
        content: `Here are meeting notes for contact "${contact.name}":\n\n${contact.meeting_notes}\n\nExtract clear, actionable action items from these notes. Return ONLY a numbered list of action items, each on its own line. Each item should be a specific task that can be assigned to someone. If no clear action items exist, say "No clear action items identified."`,
      },
    ]);

    const actionItems = completion.choices[0]?.message?.content?.trim() || "";
    return NextResponse.json({ actionItems });
  } catch (error) {
    console.error("OpenAI error:", error);
    return NextResponse.json({ error: "Failed to generate action items" }, { status: 500 });
  }
}
