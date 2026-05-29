import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { KanbanBoard } from "./_components/kanban-board";
import type { Stage } from "@/lib/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PipelineBoardPage({ params }: Props) {
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

  const stages = (pipeline.stages || []) as Stage[];

  const { data: deals } = await supabase
    .from("deals")
    .select("id, title, value, probability, stage_id, created_at, contact:contact_id(name)")
    .in(
      "stage_id",
      stages.map((s) => s.id)
    )
    .in("status", ["open"])
    .order("created_at", { ascending: false });

  const dealsList = (deals || []) as unknown as {
    id: string;
    title: string;
    value: number;
    probability: number;
    stage_id: string;
    created_at: string;
    contact: { name: string } | { name: string }[];
  }[];

  const normalized = dealsList.map((d) => ({
    ...d,
    contact: { name: Array.isArray(d.contact) ? d.contact[0]?.name || "Unknown" : d.contact?.name || "Unknown" },
  }));

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-2">
        <Link
          href="/dashboard/pipeline"
          className="inline-flex items-center justify-center rounded-md border border-input bg-background h-8 w-8 hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {pipeline.name}
          </h1>
        </div>
        <Link
          href={`/dashboard/pipeline/deals/new?pipeline=${pipeline.id}`}
          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 py-2 text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Deal
        </Link>
      </div>

      <KanbanBoard stages={stages} deals={normalized} stageNames={{}} />
    </div>
  );
}
