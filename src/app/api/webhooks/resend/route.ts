import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

async function verifyResendSignature(request: NextRequest) {
  const signingSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!signingSecret) {
    console.error("RESEND_WEBHOOK_SECRET not configured");
    return false;
  }

  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return false;
  }

  const body = await request.clone().text();

  try {
    const { Webhook } = await import("svix");
    const wh = new Webhook(signingSecret);
    wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const valid = await verifyResendSignature(request);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const body = await request.json();
  const event = body as {
    type: string;
    data: {
      email_id: string;
      created_at: string;
      from?: string;
      to?: string[];
      subject?: string;
      click?: { link: string };
    };
  };

  if (!event?.type || !event?.data?.email_id) {
    return NextResponse.json({ received: true });
  }

  const validEvents = ["email.opened", "email.clicked", "email.delivered", "email.bounced", "email.complained"];
  if (!validEvents.includes(event.type)) {
    return NextResponse.json({ received: true });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const eventType = event.type.replace("email.", "");

  const { data: scheduledEmail } = await supabase
    .from("scheduled_emails")
    .select("id, contact_id, user_id")
    .eq("resend_message_id", event.data.email_id)
    .single();

  await supabase.from("email_events").insert({
    scheduled_email_id: scheduledEmail?.id || null,
    resend_message_id: event.data.email_id,
    contact_id: scheduledEmail?.contact_id || null,
    user_id: scheduledEmail?.user_id || null,
    event_type: eventType,
    payload: event.data as Record<string, unknown>,
    occurred_at: event.data.created_at,
  });

  if (scheduledEmail?.contact_id && scheduledEmail?.user_id) {
    const descriptions: Record<string, string> = {
      opened: `Email opened by recipient`,
      clicked: `Recipient clicked link${event.data.click?.link ? ": " + event.data.click.link : ""}`,
      delivered: `Email delivered successfully`,
      bounced: `Email bounced`,
      complained: `Recipient marked as spam`,
    };

    await supabase.from("activity").insert({
      user_id: scheduledEmail.user_id,
      contact_id: scheduledEmail.contact_id,
      type: "email",
      description: descriptions[eventType] || `Email event: ${eventType}`,
    });
  }

  return NextResponse.json({ received: true });
}
