"use client";

import { useState } from "react";
import { createTask } from "../actions";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";

interface AddTaskFormProps {
  contacts: { id: string; name: string; company: string | null }[];
  openDeals: { id: string; title: string; status: string }[];
}

export function AddTaskForm({ contacts, openDeals }: AddTaskFormProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"call" | "email" | "meeting" | "follow-up">("follow-up");
  const [dueDate, setDueDate] = useState("");
  const [contactId, setContactId] = useState("");
  const [dealId, setDealId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !dueDate) {
      setError("Title and due date are required.");
      return;
    }
    setLoading(true);
    setError("");

    const result = await createTask(
      {
        title: title.trim(),
        type,
        due_date: dueDate,
        contact_id: contactId || null,
        deal_id: dealId || null,
      },
      "/dashboard/tasks"
    );

    if (result && "error" in result && result.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border p-6 space-y-4">
      <h2 className="font-semibold">Add Task</h2>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Follow up with prospect"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as typeof type)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="call">Call</option>
          <option value="email">Email</option>
          <option value="meeting">Meeting</option>
          <option value="follow-up">Follow-up</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Due Date</label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Contact (optional)</label>
        <select
          value={contactId}
          onChange={(e) => setContactId(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">None</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}{c.company ? ` · ${c.company}` : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Deal (optional)</label>
        <select
          value={dealId}
          onChange={(e) => setDealId(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">None</option>
          {openDeals.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Plus className="h-4 w-4 mr-2" />
        )}
        Add Task
      </Button>
    </form>
  );
}
