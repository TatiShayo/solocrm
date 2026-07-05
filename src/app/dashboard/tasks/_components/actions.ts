"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function toggleComplete(taskId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: task } = await supabase
    .from("tasks")
    .select("completed, title, contact_id, deal_id")
    .eq("id", taskId)
    .single();

  if (!task) return;

  const completed = !task.completed;
  const completedAt = completed ? new Date().toISOString() : null;

  await supabase
    .from("tasks")
    .update({ completed, completed_at: completedAt, updated_at: new Date().toISOString() })
    .eq("id", taskId);

  if (completed) {
    await supabase.from("activity").insert({
      user_id: user.id,
      contact_id: task.contact_id,
      deal_id: task.deal_id,
      type: "task_completed",
      description: `Task completed: ${task.title}`,
    });
  }

  revalidatePath("/dashboard/tasks");
  if (task.contact_id) revalidatePath(`/dashboard/contacts/${task.contact_id}`);
  if (task.deal_id) revalidatePath(`/dashboard/pipeline/deals/${task.deal_id}`);
}

export async function removeTask(taskId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("tasks").delete().eq("id", taskId);
  revalidatePath("/dashboard/tasks");
}
