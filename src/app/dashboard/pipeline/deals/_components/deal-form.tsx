"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Save, Loader2 } from "lucide-react";
import { saveDeal } from "../actions";
import type { Stage } from "@/lib/types";

interface ContactOption {
  id: string;
  name: string;
  company?: string | null;
}

const dealSchema = z.object({
  title: z.string().min(1, "Title is required"),
  contact_id: z.string().min(1, "Contact is required"),
  value: z.string().optional(),
  probability: z.string().optional(),
  stage_id: z.string().min(1, "Stage is required"),
  close_date: z.string().optional(),
  notes: z.string().optional(),
});

type DealFormValues = z.infer<typeof dealSchema>;

interface DealData {
  id: string;
  title: string;
  contact_id: string;
  value: number;
  probability: number;
  stage_id: string;
  close_date: string | null;
  notes: string | null;
}

interface Props {
  deal?: DealData | null;
  contacts: ContactOption[];
  stages: Stage[];
  pipelineId: string;
}

export function DealForm({ deal, contacts, stages, pipelineId }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const defaultValues: DealFormValues = {
    title: deal?.title || "",
    contact_id: deal?.contact_id || "",
    value: deal?.value?.toString() ?? "0",
    probability: deal?.probability?.toString() ?? "20",
    stage_id: deal?.stage_id || "",
    close_date: deal?.close_date || "",
    notes: deal?.notes || "",
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DealFormValues>({
    resolver: zodResolver(dealSchema),
    defaultValues,
  });

  const onSubmit = async (data: DealFormValues) => {
    setPending(true);
    setServerError(null);
    try {
      const result = await saveDeal({
        title: data.title,
        contact_id: data.contact_id,
        value: Number(data.value) || 0,
        probability: Number(data.probability) || 0,
        stage_id: data.stage_id,
        close_date: data.close_date || null,
        notes: data.notes || null,
      }, deal?.id);
      if (result?.error) {
        setServerError(result.error);
      }
    } catch {
      setServerError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && (
        <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="title" className="text-sm font-medium">
            Deal Title <span className="text-destructive">*</span>
          </label>
          <input
            id="title"
            {...register("title")}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Enterprise deal - Acme Inc."
          />
          {errors.title && (
            <p className="text-xs text-destructive">{errors.title.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="contact_id" className="text-sm font-medium">
            Contact <span className="text-destructive">*</span>
          </label>
          <select
            id="contact_id"
            {...register("contact_id")}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Select a contact...</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.company ? `(${c.company})` : ""}
              </option>
            ))}
          </select>
          {errors.contact_id && (
            <p className="text-xs text-destructive">
              {errors.contact_id.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="value" className="text-sm font-medium">
            Value ($)
          </label>
          <input
            id="value"
            type="number"
            {...register("value")}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="5000"
            min={0}
            step={0.01}
          />
          {errors.value && (
            <p className="text-xs text-destructive">{errors.value.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="probability" className="text-sm font-medium">
            Probability (%)
          </label>
          <input
            id="probability"
            type="number"
            {...register("probability")}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            min={0}
            max={100}
          />
          {errors.probability && (
            <p className="text-xs text-destructive">
              {errors.probability.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="stage_id" className="text-sm font-medium">
            Stage <span className="text-destructive">*</span>
          </label>
          <select
            id="stage_id"
            {...register("stage_id")}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Select a stage...</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {errors.stage_id && (
            <p className="text-xs text-destructive">
              {errors.stage_id.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="close_date" className="text-sm font-medium">
            Close Date
          </label>
          <input
            id="close_date"
            type="date"
            {...register("close_date")}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="notes" className="text-sm font-medium">
          Notes
        </label>
        <textarea
          id="notes"
          rows={3}
          {...register("notes")}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Any notes about this deal..."
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {deal ? "Update Deal" : "Create Deal"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center justify-center rounded-md border border-input bg-background h-10 px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
