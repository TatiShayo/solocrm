"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createPipeline(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Pipeline name is required." };

  const stageNames = (formData.get("stages") as string)
    ?.split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!stageNames || stageNames.length < 2) {
    return { error: "At least 2 stages are required." };
  }

  const { data: pipeline, error: pipeError } = await supabase
    .from("pipelines")
    .insert({ user_id: user.id, name })
    .select("id")
    .single();

  if (pipeError) {
    return { error: pipeError.message };
  }

  const stages = stageNames.map((name, i) => ({
    pipeline_id: pipeline.id,
    name,
    sort_order: i,
  }));

  const { error: stageError } = await supabase.from("stages").insert(stages);

  if (stageError) {
    return { error: stageError.message };
  }

  revalidatePath("/dashboard/pipeline");
  redirect("/dashboard/pipeline");
}

export async function deletePipeline(pipelineId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { error } = await supabase
    .from("pipelines")
    .delete()
    .eq("id", pipelineId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/pipeline");
}

export async function updateStages(
  pipelineId: string,
  stages: { id?: string; name: string; sort_order: number }[]
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Get existing stage IDs
  const { data: existing } = await supabase
    .from("stages")
    .select("id")
    .eq("pipeline_id", pipelineId);

  const existingIds = new Set((existing || []).map((s) => s.id));
  const updatedIds = new Set(
    stages.filter((s) => s.id).map((s) => s.id!)
  );

  // Delete removed stages
  const toDelete = [...existingIds].filter((id) => !updatedIds.has(id));
  if (toDelete.length > 0) {
    await supabase.from("stages").delete().in("id", toDelete);
  }

  // Upsert all stages
  for (const stage of stages) {
    if (stage.id) {
      await supabase
        .from("stages")
        .update({ name: stage.name, sort_order: stage.sort_order })
        .eq("id", stage.id);
    } else {
      await supabase.from("stages").insert({
        pipeline_id: pipelineId,
        name: stage.name,
        sort_order: stage.sort_order,
      });
    }
  }

  revalidatePath(`/dashboard/pipeline/${pipelineId}`);
}
