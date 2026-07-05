"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createSequence(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const name = formData.get("name") as string;
  if (!name?.trim()) return { error: "Name is required" };

  const { error } = await supabase.from("sequences").insert({
    user_id: user.id,
    name: name.trim(),
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/sequences");
  return { success: true };
}

export async function updateSequence(sequenceId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const name = formData.get("name") as string;
  const active = formData.get("active") === "on";

  const { error } = await supabase.from("sequences")
    .update({ name: name?.trim() || undefined, active, updated_at: new Date().toISOString() })
    .eq("id", sequenceId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/sequences");
  return { success: true };
}

export async function deleteSequence(sequenceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { error } = await supabase.from("sequences").delete().eq("id", sequenceId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/sequences");
  return { success: true };
}

export async function saveStep(sequenceId: string, stepData: { id?: string; sort_order: number; delay_days: number; subject: string; body: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  if (stepData.id) {
    const { error } = await supabase.from("sequence_steps")
      .update({ delay_days: stepData.delay_days, subject: stepData.subject, body: stepData.body, sort_order: stepData.sort_order })
      .eq("id", stepData.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("sequence_steps").insert({
      sequence_id: sequenceId,
      sort_order: stepData.sort_order,
      delay_days: stepData.delay_days,
      subject: stepData.subject,
      body: stepData.body,
    });
    if (error) return { error: error.message };
  }

  revalidatePath(`/dashboard/sequences`);
  return { success: true };
}

export async function deleteStep(stepId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { error } = await supabase.from("sequence_steps").delete().eq("id", stepId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/sequences");
  return { success: true };
}

export async function reorderSteps(sequenceId: string, stepIds: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  for (let i = 0; i < stepIds.length; i++) {
    await supabase.from("sequence_steps")
      .update({ sort_order: i })
      .eq("id", stepIds[i]);
  }

  revalidatePath("/dashboard/sequences");
  return { success: true };
}

function resolveMergeTags(body: string, contact: { name: string; email: string | null; company: string | null; title: string | null }) {
  const nameParts = contact.name.split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  return body
    .replace(/\{\{firstName\}\}/g, firstName)
    .replace(/\{\{lastName\}\}/g, lastName)
    .replace(/\{\{company\}\}/g, contact.company || "")
    .replace(/\{\{email\}\}/g, contact.email || "")
    .replace(/\{\{title\}\}/g, contact.title || "");
}

export async function enrollContacts(sequenceId: string, contactIds: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: steps } = await supabase
    .from("sequence_steps")
    .select("*")
    .eq("sequence_id", sequenceId)
    .order("sort_order", { ascending: true });

  if (!steps || steps.length === 0) return { error: "Sequence has no steps" };

  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, name, email, company, title")
    .in("id", contactIds)
    .eq("user_id", user.id);

  if (!contacts || contacts.length === 0) return { error: "No valid contacts found" };

  for (const contact of contacts) {
    const { data: existing } = await supabase
      .from("sequence_enrollments")
      .select("id")
      .eq("sequence_id", sequenceId)
      .eq("contact_id", contact.id)
      .maybeSingle();

    if (existing) continue;

    const { data: enrollment } = await supabase
      .from("sequence_enrollments")
      .insert({
        sequence_id: sequenceId,
        contact_id: contact.id,
        user_id: user.id,
        current_step: 0,
        active: true,
      })
      .select()
      .single();

    if (!enrollment) continue;

    const firstStep = steps[0];
    const resolvedSubject = resolveMergeTags(firstStep.subject, contact);
    const resolvedBody = resolveMergeTags(firstStep.body, contact);

    await supabase.from("scheduled_emails").insert({
      user_id: user.id,
      contact_id: contact.id,
      sequence_id: sequenceId,
      enrollment_id: enrollment.id,
      step_id: firstStep.id,
      subject: resolvedSubject,
      body: resolvedBody,
      scheduled_at: new Date(Date.now() + firstStep.delay_days * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  revalidatePath("/dashboard/sequences");
  return { success: true };
}

export async function unenrollContact(enrollmentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("sequence_enrollments")
    .update({ active: false, completed_at: new Date().toISOString() })
    .eq("id", enrollmentId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/sequences");
  return { success: true };
}
