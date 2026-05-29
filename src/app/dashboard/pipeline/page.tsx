import { createClient } from "@/lib/supabase/server";
import { PipelineList } from "./_components/pipeline-list";
import { CreatePipelineForm } from "./_components/create-pipeline-form";
import { RevenueForecast } from "./_components/revenue-forecast";

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="font-semibold mb-3">Create Pipeline</h2>
              <CreatePipelineForm />
            </div>
            <div>
              <h2 className="font-semibold mb-3">Your Pipelines</h2>
              <PipelineList pipelines={list} />
            </div>
          </div>
        </div>
        <div>
          <h2 className="font-semibold mb-3">Forecast</h2>
          <RevenueForecast />
        </div>
      </div>
    </div>
  );
}
