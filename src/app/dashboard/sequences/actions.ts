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
