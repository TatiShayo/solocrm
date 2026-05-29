import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DealForm } from "../_components/deal-form";

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function NewDealPage({ searchParams }: Props) {
  const params = await searchParams;
  const pipelineId = typeof params.pipeline === "string" ? params.pipeline : null;

  if (!pipelineId) redirect("/dashboard/pipeline");

  const supabase = await createClient();

  const { data: pipeline } = await supabase
    .from("pipelines")
    .select("*, stages(*)")
    .eq("id", pipelineId)
    .single();

  if (!pipeline) notFound();

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
          <h1 className="text-3xl font-bold tracking-tight">New Deal</h1>
          <p className="text-muted-foreground mt-1">
            Add a deal to {pipeline.name}
          </p>
        </div>
      </div>

      <DealForm
        contacts={(contacts || [])}
        stages={pipeline.stages || []}
        pipelineId={pipelineId}
      />
    </div>
  );
}
