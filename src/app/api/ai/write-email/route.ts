import { createClient } from "@/lib/supabase/server";
import { createChatCompletion } from "@/lib/openai";
import { NextRequest, NextResponse } from "next/server";
import { validateBody, writeEmailSchema } from "@/lib/validation";

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

  const parsed = validateBody(rawBody, writeEmailSchema);
  if (parsed instanceof NextResponse) return parsed;
  const { contactId, prompt } = parsed;

  const { data: contact } = await supabase
    .from("contacts")
    .select("id, name, email, company, title")
    .eq("id", contactId)
    .eq("user_id", user.id)
    .single();

  let contactContext = "";
  if (contact) {
    contactContext = `Contact: ${contact.name}`;
    if (contact.company) contactContext += `, ${contact.company}`;
    if (contact.title) contactContext += `, ${contact.title}`;
  }

  try {
    const completion = await createChatCompletion([
      {
        role: "user",
        content: `${contactContext}\n\nWrite an email draft. ${prompt}\n\nWrite only the email body, no subject line. Keep it professional and warm. Use the contact's first name in the salutation.`,
      },
    ]);

    const draft = completion.choices[0]?.message?.content?.trim() || "";
    return NextResponse.json({ draft });
  } catch (error) {
    console.error("OpenAI error:", error);
    return NextResponse.json({ error: "Failed to generate email draft" }, { status: 500 });
  }
}
