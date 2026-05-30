import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "./resend";
import crypto from "crypto";

function hashContactId(contactId: string) {
  const salt = process.env.CRON_SECRET || "solocrm-unsubscribe";
  return crypto.createHash("sha256").update(`${contactId}:${salt}`).digest("hex");
}

export function resolveMergeTags(
  text: string,
  contact: { name: string; email: string | null; company: string | null; title: string | null },
  deal?: { title: string } | null
) {
  const nameParts = contact.name.split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  return text
    .replace(/\{\{firstName\}\}/g, firstName)
    .replace(/\{\{lastName\}\}/g, lastName)
    .replace(/\{\{company\}\}/g, contact.company || "")
    .replace(/\{\{email\}\}/g, contact.email || "")
    .replace(/\{\{title\}\}/g, contact.title || "")
    .replace(/\{\{dealTitle\}\}/g, deal?.title || "");
}

export async function processScheduledEmails() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: emails, error } = await supabase
    .from("scheduled_emails")
    .select("*")
    .lte("scheduled_at", new Date().toISOString())
    .is("sent_at", null)
    .limit(50);

  if (error) {
    console.error("Error fetching scheduled emails:", error);
    return { processed: 0, error: error.message };
  }

  if (!emails || emails.length === 0) {
    return { processed: 0 };
  }

  const contactIds = [...new Set(emails.map((e) => e.contact_id))];
  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, name, email, company, title, user_id, is_opted_out")
    .in("id", contactIds);

  const contactMap = new Map((contacts || []).map((c) => [c.id, c]));

  const { data: deals } = await supabase
    .from("deals")
    .select("id, title, contact_id")
    .in("contact_id", contactIds)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  const dealByContact = new Map<string, { title: string }>();
  for (const deal of deals || []) {
    if (!dealByContact.has(deal.contact_id)) {
      dealByContact.set(deal.contact_id, deal);
    }
  }

  const enrollmentIds = [...new Set(emails.map((e) => e.enrollment_id))];
  const { data: enrollments } = await supabase
    .from("sequence_enrollments")
    .select("id, sequence_id, current_step")
    .in("id", enrollmentIds);

  const enrollmentMap = new Map((enrollments || []).map((e) => [e.id, e]));

  const sequenceIds = [...new Set((enrollments || []).map((e) => e.sequence_id))];
  const { data: allSteps } = await supabase
    .from("sequence_steps")
    .select("*")
    .in("sequence_id", sequenceIds)
    .order("sort_order", { ascending: true });

  const stepsBySequence = new Map<string, typeof allSteps>();
  for (const step of allSteps || []) {
    if (!stepsBySequence.has(step.sequence_id)) {
      stepsBySequence.set(step.sequence_id, []);
    }
    stepsBySequence.get(step.sequence_id)!.push(step);
  }

  let processed = 0;

  for (const email of emails) {
    const contact = contactMap.get(email.contact_id);
    if (!contact || !contact.email) continue;
    if (contact.is_opted_out) {
      await supabase
        .from("scheduled_emails")
        .update({ sent_at: new Date().toISOString() })
        .eq("id", email.id);
      continue;
    }

    const deal = dealByContact.get(email.contact_id);

    const resolvedSubject = resolveMergeTags(email.subject, contact, deal);
    const resolvedBody = resolveMergeTags(email.body, contact, deal);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const token = hashContactId(contact.id);
    const unsubscribeUrl = `${appUrl}/unsubscribe?token=${token}`;

    const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">${resolvedBody.replace(/\n/g, "<br>")}<hr style="margin-top:32px;border:none;border-top:1px solid #e5e7eb"><p style="font-size:12px;color:#9ca3af">If you no longer wish to receive emails, <a href="${unsubscribeUrl}" style="color:#6b7280">unsubscribe</a>.</p></div>`;

    let resendMessageId: string | null = null;
    if (process.env.RESEND_API_KEY) {
      const result = await sendEmail(contact.email, resolvedSubject, html);
      resendMessageId = result?.id || null;
    } else {
      console.warn("Resend not configured, skipping email to", contact.email);
    }

    await supabase
      .from("scheduled_emails")
      .update({
        sent_at: new Date().toISOString(),
        resend_message_id: resendMessageId,
      })
      .eq("id", email.id);

    await supabase.from("activity").insert({
      user_id: email.user_id,
      contact_id: email.contact_id,
      type: "email",
      description: `Sent "${resolvedSubject}" to ${contact.name}`,
    });

    const enrollment = enrollmentMap.get(email.enrollment_id);
    if (!enrollment) continue;

    const steps = stepsBySequence.get(enrollment.sequence_id) || [];
    const nextStepIndex = enrollment.current_step + 1;
    const nextStep = steps.find((s) => s.sort_order === nextStepIndex);

    if (nextStep) {
      await supabase
        .from("sequence_enrollments")
        .update({ current_step: nextStepIndex })
        .eq("id", enrollment.id);

      enrollmentMap.set(enrollment.id, { ...enrollment, current_step: nextStepIndex });

      const nextResolvedSubject = resolveMergeTags(nextStep.subject, contact, deal);
      const nextResolvedBody = resolveMergeTags(nextStep.body, contact, deal);

      await supabase.from("scheduled_emails").insert({
        user_id: email.user_id,
        contact_id: email.contact_id,
        sequence_id: enrollment.sequence_id,
        enrollment_id: enrollment.id,
        step_id: nextStep.id,
        subject: nextResolvedSubject,
        body: nextResolvedBody,
        scheduled_at: new Date(
          Date.now() + nextStep.delay_days * 24 * 60 * 60 * 1000
        ).toISOString(),
      });
    } else {
      await supabase
        .from("sequence_enrollments")
        .update({ active: false, completed_at: new Date().toISOString() })
        .eq("id", enrollment.id);
    }

    processed++;
  }

  return { processed };
}
