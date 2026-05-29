import { createClient } from "@/lib/supabase/server";
import { PipelineList } from "./_components/pipeline-list";
import { CreatePipelineForm } from "./_components/create-pipeline-form";

export default async function PipelinePage() {
  const supabase = await createClient();
  const { data: pipelines } = await supabase
    .from("pipelines")
    .select("*, stages(*)")
    .order("created_at", { ascending: true });

  const list = pipelines || [];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pipelines</h1>
          <p className="text-muted-foreground mt-1">
            Manage your sales pipelines and stages
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="font-semibold">Create Pipeline</h2>
          <CreatePipelineForm />
        </div>
        <div className="space-y-4">
          <h2 className="font-semibold">Your Pipelines</h2>
          <PipelineList pipelines={list} />
        </div>
      </div>
    </div>
  );
}
