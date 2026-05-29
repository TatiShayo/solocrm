"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function moveDeal(dealId: string, stageId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("deals")
    .update({ stage_id: stageId, updated_at: new Date().toISOString() })
    .eq("id", dealId);

  if (error) return { error: error.message };

  // Get the pipeline context to revalidate
  const { data: stage } = await supabase
    .from("stages")
    .select("pipeline_id")
    .eq("id", stageId)
    .single();

  if (stage) {
    revalidatePath(`/dashboard/pipeline/${stage.pipeline_id}/board`);
  }

  return { success: true };
}
