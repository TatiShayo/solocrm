import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DealForm } from "../../_components/deal-form";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditDealPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: deal, error } = await supabase
    .from("deals")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !deal) notFound();

  const { data: stageData } = await supabase
    .from("stages")
    .select("pipeline_id")
    .eq("id", deal.stage_id)
    .single();

  const pipelineId = stageData?.pipeline_id;
  if (!pipelineId) notFound();

  const { data: pipelineData } = await supabase
    .from("pipelines")
    .select("*, stages(*)")
    .eq("id", pipelineId)
    .single();

  if (!pipelineData) notFound();

  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, name, company")
    .order("name", { ascending: true });

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/dashboard/pipeline/${pipelineId}/board`}
          className="inline-flex items-center justify-center rounded-md border border-input bg-background h-8 w-8 hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Deal</h1>
          <p className="text-muted-foreground mt-1">{deal.title}</p>
        </div>
      </div>

      <DealForm
        deal={deal}
        contacts={(contacts || [])}
        stages={pipelineData.stages || []}
        pipelineId={pipelineId}
      />
    </div>
  );
}
