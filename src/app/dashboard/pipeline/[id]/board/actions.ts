"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { fireDealStageChanged, fireDealWon, fireDealLost } from "@/lib/webhooks";

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

  const { data: newStage } = await supabase
    .from("stages")
    .select("name, pipeline_id")
    .eq("id", stageId)
    .single();

  const stageNameLower = newStage?.name?.toLowerCase() ?? "";
  const isWon = stageNameLower.includes("won") && !stageNameLower.includes("lost");
  const isLost = stageNameLower.includes("lost");

  const updateData: Record<string, unknown> = {
    stage_id: stageId,
    updated_at: new Date().toISOString(),
  };

  if (isWon) {
    updateData.status = "won";
    updateData.probability = 100;
  } else if (isLost) {
    updateData.status = "lost";
    updateData.probability = 0;
  }

  const { error } = await supabase
    .from("deals")
    .update(updateData)
    .eq("id", dealId);

  if (error) return { error: error.message };

  if (oldDeal && oldStage && newStage) {
    await fireDealStageChanged(
      user.id,
      { id: dealId, title: oldDeal.title, value: oldDeal.value, status: oldDeal.status },
      oldStage.name,
      newStage.name
    );

    if (isWon) {
      await fireDealWon(user.id, {
        id: dealId,
        title: oldDeal.title,
        value: oldDeal.value,
      });
    } else if (isLost) {
      await fireDealLost(user.id, {
        id: dealId,
        title: oldDeal.title,
        value: oldDeal.value,
      });
    }
  }

  if (newStage) {
    revalidatePath(`/dashboard/pipeline/${newStage.pipeline_id}/board`);
  }

  return { success: true, isWon, isLost };
}
