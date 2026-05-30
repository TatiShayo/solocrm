"use client";

import { useTransition, useState } from "react";
import type { SequenceStep } from "@/lib/types";
import { saveStep, deleteStep } from "../actions";
import { Trash2, GripVertical } from "lucide-react";

interface Props {
  sequenceId: string;
  steps: SequenceStep[];
}

export function StepBuilder({ sequenceId, steps: initialSteps }: Props) {
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ delay_days: 1, subject: "", body: "" });

  function handleSave() {
    startTransition(async () => {
      const sortOrder = editingId
        ? initialSteps.find((s) => s.id === editingId)?.sort_order ?? initialSteps.length
        : initialSteps.length;

      await saveStep(sequenceId, {
        id: editingId ?? undefined,
        sort_order: sortOrder,
        delay_days: form.delay_days,
        subject: form.subject,
        body: form.body,
      });

      setEditingId(null);
      setShowNew(false);
      setForm({ delay_days: 1, subject: "", body: "" });
    });
  }

  function handleDelete(stepId: string) {
    startTransition(() => {
      void deleteStep(stepId);
    });
  }

  function startEdit(step: SequenceStep) {
    setEditingId(step.id);
    setForm({ delay_days: step.delay_days, subject: step.subject, body: step.body });
    setShowNew(false);
  }

  return (
    <div className="mt-4 rounded-lg border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Steps</h3>
        <button
          onClick={() => { setShowNew(true); setEditingId(null); setForm({ delay_days: 1, subject: "", body: "" }); }}
          className="text-xs text-muted-foreground hover:text-foreground"
          disabled={isPending}
        >
          + Add step
        </button>
      </div>

      {initialSteps.length === 0 && !showNew && (
        <p className="text-sm text-muted-foreground">No steps yet. Add one to build your sequence.</p>
      )}

      <div className="space-y-2">
        {initialSteps.map((step, idx) => (
          <div key={step.id}>
            {editingId === step.id ? (
              <StepEditor
                form={form}
                setForm={setForm}
                onSave={handleSave}
                onCancel={() => setEditingId(null)}
                isPending={isPending}
              />
            ) : (
              <div className="flex items-center gap-2 rounded-md border p-2 text-sm group hover:bg-muted/50">
                <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="font-medium text-muted-foreground flex-shrink-0 w-16">
                  Day {step.delay_days}
                </span>
                <span className="truncate flex-1">{step.subject || "(no subject)"}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEdit(step)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(step.id)}
                    className="text-xs text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {showNew && (
          <StepEditor
            form={form}
            setForm={setForm}
            onSave={handleSave}
            onCancel={() => setShowNew(false)}
            isPending={isPending}
          />
        )}
      </div>
    </div>
  );
}

function StepEditor({
  form,
  setForm,
  onSave,
  onCancel,
  isPending,
}: {
  form: { delay_days: number; subject: string; body: string };
  setForm: (f: { delay_days: number; subject: string; body: string }) => void;
  onSave: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const mergeTags = ["{{firstName}}", "{{lastName}}", "{{company}}", "{{email}}", "{{title}}"];

  function insertTag(tag: string) {
    setForm({ ...form, body: form.body + tag });
  }

  return (
    <div className="rounded-md border p-3 space-y-3 bg-background">
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground">Delay</label>
        <input
          type="number"
          min={0}
          value={form.delay_days}
          onChange={(e) => setForm({ ...form, delay_days: parseInt(e.target.value) || 0 })}
          className="w-16 rounded-md border border-input bg-background px-2 py-1 text-xs"
          disabled={isPending}
        />
        <span className="text-xs text-muted-foreground">days</span>
      </div>
      <input
        type="text"
        placeholder="Subject"
        value={form.subject}
        onChange={(e) => setForm({ ...form, subject: e.target.value })}
        className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
        disabled={isPending}
      />
      <textarea
        placeholder="Email body"
        value={form.body}
        onChange={(e) => setForm({ ...form, body: e.target.value })}
        rows={5}
        className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm font-mono"
        disabled={isPending}
      />
      <div className="flex flex-wrap gap-1">
        {mergeTags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => insertTag(tag)}
            className="text-[10px] px-2 py-0.5 rounded border bg-muted hover:bg-muted/80"
            disabled={isPending}
          >
            {tag}
          </button>
        ))}
      </div>
      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
          disabled={isPending}
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={isPending}
          className="rounded bg-primary text-primary-foreground px-3 py-1 text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save step"}
        </button>
      </div>
    </div>
  );
}
