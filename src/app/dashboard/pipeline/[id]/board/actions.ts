"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { fireDealStageChanged } from "@/lib/webhooks";

export async function moveDeal(dealId: string, stageId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: oldDeal } = await supabase
    .from("deals")
    .select("title, value, stage_id, status")
    .eq("id", dealId)
    .single();

  const { data: oldStage } = await supabase
    .from("stages")
    .select("name")
    .eq("id", oldDeal?.stage_id)
    .single();

  const { error } = await supabase
    .from("deals")
    .update({ stage_id: stageId, updated_at: new Date().toISOString() })
    .eq("id", dealId);

  if (error) return { error: error.message };

  const { data: stage } = await supabase
    .from("stages")
    .select("name, pipeline_id")
    .eq("id", stageId)
    .single();

  if (oldDeal && oldStage && stage) {
    await fireDealStageChanged(
      user.id,
      { id: dealId, title: oldDeal.title, value: oldDeal.value, status: oldDeal.status },
      oldStage.name,
      stage.name
    );
  }

  if (stage) {
    revalidatePath(`/dashboard/pipeline/${stage.pipeline_id}/board`);
  }

  return { success: true };
}
