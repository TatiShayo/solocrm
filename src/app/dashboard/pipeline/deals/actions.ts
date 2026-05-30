"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fireDealCreated, fireDealStageChanged, fireDealWon, fireDealLost } from "@/lib/webhooks";

interface DealFormData {
  title: string;
  contact_id: string;
  value: number;
  probability: number;
  stage_id: string;
  close_date?: string | null;
  notes?: string | null;
}

export async function saveDeal(formData: DealFormData, dealId?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const payload = {
    user_id: user.id,
    title: formData.title.trim(),
    contact_id: formData.contact_id,
    value: Number(formData.value) || 0,
    probability: Math.min(100, Math.max(0, Number(formData.probability) || 0)),
    stage_id: formData.stage_id,
    close_date: formData.close_date || null,
    notes: (formData.notes ?? "").trim() || null,
  };

  if (dealId) {
    const { data: oldDeal } = await supabase
      .from("deals")
      .select("stage_id, title, value, status")
      .eq("id", dealId)
      .single();

    const { error } = await supabase
      .from("deals")
      .update(payload)
      .eq("id", dealId);

    if (error) return { error: error.message };

    if (oldDeal && oldDeal.stage_id !== payload.stage_id) {
      const { data: oldStage } = await supabase
        .from("stages")
        .select("name")
        .eq("id", oldDeal.stage_id)
        .single();

      const { data: newStage } = await supabase
        .from("stages")
        .select("name")
        .eq("id", payload.stage_id)
        .single();

      if (oldStage && newStage) {
        await fireDealStageChanged(
          user.id,
          { id: dealId, title: oldDeal.title, value: oldDeal.value, status: oldDeal.status },
          oldStage.name,
          newStage.name
        );
      }
    }
  } else {
    const { data: newDeal, error } = await supabase
      .from("deals")
      .insert(payload)
      .select()
      .single();

    if (error) return { error: error.message };

    if (newDeal) {
      await fireDealCreated(user.id, {
        id: newDeal.id,
        title: newDeal.title,
        value: newDeal.value,
        status: newDeal.status,
      });
    }
  }

  const { data: stage } = await supabase
    .from("stages")
    .select("pipeline_id")
    .eq("id", payload.stage_id)
    .single();

  if (stage) {
    revalidatePath(`/dashboard/pipeline/${stage.pipeline_id}/board`);
  }
  revalidatePath("/dashboard/pipeline");
  redirect(
    stage
      ? `/dashboard/pipeline/${stage.pipeline_id}/board`
      : "/dashboard/pipeline"
  );
}

export async function markDealWon(dealId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: deal } = await supabase
    .from("deals")
    .select("title, contact_id")
    .eq("id", dealId)
    .single();

  const { error } = await supabase
    .from("deals")
    .update({ status: "won", updated_at: new Date().toISOString() })
    .eq("id", dealId);

  if (error) return { error: error.message };

  if (deal) {
    await supabase.from("activity").insert({
      user_id: user.id,
      contact_id: deal.contact_id,
      deal_id: dealId,
      type: "deal_change",
      description: `Deal "${deal.title}" won`,
    });
    await fireDealWon(user.id, { id: dealId, title: deal.title });
  }

  revalidatePath("/dashboard/pipeline");
  return { success: true };
}

export async function markDealLost(dealId: string, reason: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: deal } = await supabase
    .from("deals")
    .select("title, contact_id")
    .eq("id", dealId)
    .single();

  const { error } = await supabase
    .from("deals")
    .update({
      status: "lost",
      lost_reason: reason.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", dealId);

  if (error) return { error: error.message };

  if (deal) {
    const desc = reason.trim()
      ? `Deal "${deal.title}" lost - ${reason.trim()}`
      : `Deal "${deal.title}" lost`;
    await supabase.from("activity").insert({
      user_id: user.id,
      contact_id: deal.contact_id,
      deal_id: dealId,
      type: "deal_change",
      description: desc,
    });
    await fireDealLost(user.id, { id: dealId, title: deal.title, reason: reason.trim() || null });
  }

  revalidatePath("/dashboard/pipeline");
  return { success: true };
}

export async function reopenDeal(dealId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: deal } = await supabase
    .from("deals")
    .select("title, contact_id")
    .eq("id", dealId)
    .single();

  const { error } = await supabase
    .from("deals")
    .update({
      status: "open",
      lost_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", dealId);

  if (error) return { error: error.message };

  if (deal) {
    await supabase.from("activity").insert({
      user_id: user.id,
      contact_id: deal.contact_id,
      deal_id: dealId,
      type: "deal_change",
      description: `Deal "${deal.title}" reopened`,
    });
  }

  revalidatePath("/dashboard/pipeline");
  return { success: true };
}
