import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { StageEditor } from "../_components/stage-editor";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PipelineDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: pipeline, error } = await supabase
    .from("pipelines")
    .select("*, stages(*)")
    .eq("id", id)
    .single();

  if (error || !pipeline) {
    notFound();
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard/pipeline"
          className="inline-flex items-center justify-center rounded-md border border-input bg-background h-8 w-8 hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Edit {pipeline.name}
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage stages for this pipeline
          </p>
        </div>
      </div>

      <StageEditor pipeline={pipeline} />
    </div>
  );
}
