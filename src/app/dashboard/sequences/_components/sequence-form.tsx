"use client";

import { useTransition } from "react";
import type { Sequence } from "@/lib/types";
import { createSequence, updateSequence } from "../actions";

interface Props {
  editSequence: Sequence | null;
}

export function SequenceForm({ editSequence }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      if (editSequence) {
        await updateSequence(editSequence.id, formData);
      } else {
        await createSequence(formData);
      }
    });
  }

  return (
    <div className="rounded-lg border p-4">
      <h3 className="font-semibold mb-3">
        {editSequence ? "Edit Sequence" : "New Sequence"}
      </h3>
      <form action={handleSubmit} className="space-y-3">
        <input
          name="name"
          type="text"
          placeholder="Sequence name"
          defaultValue={editSequence?.name || ""}
          required
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          disabled={isPending}
        />
        {editSequence && (
          <label className="flex items-center gap-2 text-sm">
            <input
              name="active"
              type="checkbox"
              defaultChecked={editSequence.active}
              className="h-4 w-4"
              disabled={isPending}
            />
            Active
          </label>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? "Saving..." : editSequence ? "Save Changes" : "Create Sequence"}
        </button>
      </form>
    </div>
  );
}
