"use client";

import { useState } from "react";
import Link from "next/link";
import { Trash2, Settings, Kanban } from "lucide-react";
import { deletePipeline } from "../actions";
import type { Pipeline, Stage } from "@/lib/types";

interface Props {
  pipelines: (Pipeline & { stages: Stage[] })[];
}

export function PipelineList({ pipelines }: Props) {
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete pipeline "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    await deletePipeline(id);
    setDeleting(null);
  };

  if (pipelines.length === 0) {
    return (
      <p className="text-sm text-muted-foreground p-4 border rounded-lg">
        No pipelines yet. Create your first pipeline to get started.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {pipelines.map((pipe) => (
        <div key={pipe.id} className="rounded-lg border p-4">
          <div className="flex items-center justify-between mb-2">
            <Link
              href={`/dashboard/pipeline/${pipe.id}/board`}
              className="font-medium hover:text-primary"
            >
              {pipe.name}
            </Link>
            <div className="flex items-center gap-1">
              <Link
                href={`/dashboard/pipeline/${pipe.id}/board`}
                className="inline-flex items-center justify-center rounded-md h-8 w-8 hover:bg-muted"
                title="View board"
              >
                <Kanban className="h-4 w-4" />
              </Link>
              <Link
                href={`/dashboard/pipeline/${pipe.id}`}
                className="inline-flex items-center justify-center rounded-md h-8 w-8 hover:bg-muted"
                title="Edit stages"
              >
                <Settings className="h-4 w-4" />
              </Link>
              <button
                onClick={() => handleDelete(pipe.id, pipe.name)}
                disabled={deleting === pipe.id}
                className="inline-flex items-center justify-center rounded-md h-8 w-8 hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                title="Delete pipeline"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {pipe.stages
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((stage, i) => (
                <span key={stage.id} className="flex items-center gap-0.5">
                  {i > 0 && (
                    <span className="text-muted-foreground/50 mx-0.5">
                      →
                    </span>
                  )}
                  {stage.name}
                </span>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
