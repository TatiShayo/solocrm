"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { createPipeline } from "../actions";

export function CreatePipelineForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [stages, setStages] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData();
    formData.set("name", name);
    formData.set("stages", stages);

    try {
      const result = await createPipeline(formData);
      if (result?.error) {
        setError(result.error);
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border p-4 space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="pipe-name" className="text-sm font-medium">
          Pipeline Name
        </label>
        <input
          id="pipe-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Default Sales Pipeline"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="pipe-stages" className="text-sm font-medium">
          Stages (one per line)
        </label>
        <textarea
          id="pipe-stages"
          value={stages}
          onChange={(e) => setStages(e.target.value)}
          rows={4}
          placeholder={`Lead\nQualified\nProposal\nWon\nLost`}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          required
        />
        <p className="text-xs text-muted-foreground">
          Enter at least 2 stages. First stage is where new deals start.
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Plus className="h-4 w-4 mr-2" />
        )}
        Create Pipeline
      </button>
    </form>
  );
}
