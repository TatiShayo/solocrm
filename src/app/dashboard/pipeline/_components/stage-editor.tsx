"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  GripVertical,
  Plus,
  Trash2,
  Save,
  Loader2,
} from "lucide-react";
import { updateStages } from "../actions";
import type { Pipeline, Stage } from "@/lib/types";

interface Props {
  pipeline: Pipeline & { stages: Stage[] };
}

export function StageEditor({ pipeline }: Props) {
  const router = useRouter();
  const [stages, setStages] = useState(
    [...pipeline.stages].sort((a, b) => a.sort_order - b.sort_order)
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const addStage = () => {
    setStages([
      ...stages,
      { id: "", pipeline_id: pipeline.id, name: "", sort_order: stages.length, created_at: "" },
    ]);
  };

  const removeStage = (index: number) => {
    if (stages.length <= 2) {
      setError("Pipeline must have at least 2 stages.");
      return;
    }
    setStages(stages.filter((_, i) => i !== index));
  };

  const updateStageName = (index: number, name: string) => {
    const updated = [...stages];
    updated[index] = { ...updated[index], name };
    setStages(updated);
  };

  const moveStage = (from: number, to: number) => {
    const updated = [...stages];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    setStages(updated);
  };

  const handleSave = async () => {
    setError(null);

    const names = stages.map((s) => s.name.trim()).filter(Boolean);
    if (names.length < 2) {
      setError("Pipeline must have at least 2 named stages.");
      return;
    }

    setSaving(true);
    try {
      const mapped = stages.map((s, i) => ({
        id: s.id || undefined,
        name: s.name.trim(),
        sort_order: i,
      }));
      await updateStages(pipeline.id, mapped);
      router.push("/dashboard/pipeline");
    } catch {
      setError("Failed to save stages.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Drag or use the arrow buttons to reorder stages. New deals start in the
        first stage.
      </p>

      <div className="space-y-2">
        {stages.map((stage, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-md border bg-background p-2"
          >
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => moveStage(i, i - 1)}
                disabled={i === 0}
                className="h-6 w-6 rounded hover:bg-muted disabled:opacity-30 flex items-center justify-center text-xs"
                title="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveStage(i, i + 1)}
                disabled={i === stages.length - 1}
                className="h-6 w-6 rounded hover:bg-muted disabled:opacity-30 flex items-center justify-center text-xs"
                title="Move down"
              >
                ↓
              </button>
            </div>
            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
            <input
              value={stage.name}
              onChange={(e) => updateStageName(i, e.target.value)}
              className="flex-1 h-9 rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder={`Stage ${i + 1} name`}
            />
            <button
              type="button"
              onClick={() => removeStage(i)}
              className="h-8 w-8 rounded hover:bg-destructive/10 hover:text-destructive shrink-0 flex items-center justify-center"
              title="Remove stage"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={addStage}
          className="inline-flex items-center justify-center rounded-md border border-input bg-background h-10 px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Stage
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </button>
      </div>
    </div>
  );
}
