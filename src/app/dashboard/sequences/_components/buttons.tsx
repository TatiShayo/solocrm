"use client";

import { useTransition } from "react";
import { deleteSequence } from "../actions";
import { Trash2 } from "lucide-react";

export function DeleteSequenceButton({ sequenceId }: { sequenceId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Delete this sequence and all its steps?")) return;
    startTransition(() => { deleteSequence(sequenceId); });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="text-sm text-red-500 hover:text-red-600 disabled:opacity-50"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
