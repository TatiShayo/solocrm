"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

interface TaskFormData {
  title: string;
  type: "call" | "email" | "meeting" | "follow-up";
  due_date: string;
  contact_id?: string | null;
  deal_id?: string | null;
  notes?: string | null;
}

export async function createTask(formData: TaskFormData, redirectTo?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const payload = {
    user_id: user.id,
    title: formData.title.trim(),
    type: formData.type,
    due_date: formData.due_date,
    contact_id: formData.contact_id || null,
    deal_id: formData.deal_id || null,
    notes: formData.notes || null,
  };

  const { error } = await supabase.from("tasks").insert(payload);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/tasks");
  if (formData.contact_id) revalidatePath(`/dashboard/contacts/${formData.contact_id}`);
  if (formData.deal_id) revalidatePath(`/dashboard/pipeline/deals/${formData.deal_id}`);

  if (redirectTo) {
    redirect(redirectTo);
  }

  return { success: true };
}

export async function toggleTaskComplete(taskId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: task } = await supabase
    .from("tasks")
    .select("completed, title, contact_id, deal_id")
    .eq("id", taskId)
    .single();

  if (!task) return { error: "Task not found" };

  const completed = !task.completed;
  const completedAt = completed ? new Date().toISOString() : null;

  const { error } = await supabase
    .from("tasks")
    .update({ completed, completed_at: completedAt, updated_at: new Date().toISOString() })
    .eq("id", taskId);

  if (error) return { error: error.message };

  if (completed) {
    const activityDescription = `Completed task: ${task.title}`;
    await supabase.from("activity").insert({
      user_id: user.id,
      contact_id: task.contact_id,
      deal_id: task.deal_id,
      type: "task_completed",
      description: activityDescription,
    });
  }

  revalidatePath("/dashboard/tasks");
  if (task.contact_id) revalidatePath(`/dashboard/contacts/${task.contact_id}`);
  if (task.deal_id) revalidatePath(`/dashboard/pipeline/deals/${task.deal_id}`);

  return { success: true };
}

export async function deleteTask(taskId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/tasks");

  return { success: true };
}
