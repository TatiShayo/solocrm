"use client";

import { useState } from "react";
import { createTask } from "../actions";
import { Plus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuickAddButtonProps {
  contacts: { id: string; name: string; company: string | null }[];
  openDeals: { id: string; title: string; status: string }[];
}

export function QuickAddButton({ contacts, openDeals }: QuickAddButtonProps) {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"call" | "email" | "meeting" | "follow-up">(
    "follow-up"
  );
  const [dueDate, setDueDate] = useState("");
  const [contactId, setContactId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !dueDate) {
      setError("Title and due date required.");
      return;
    }
    setLoading(true);
    setError("");

    const result = await createTask({
      title: title.trim(),
      type,
      due_date: dueDate,
      contact_id: contactId || null,
      deal_id: null,
      notes: null,
    });

    if (result && "error" in result && result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setTitle("");
    setDueDate("");
    setContactId("");
    setExpanded(false);
    setLoading(false);
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="fixed bottom-8 right-8 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center cursor-pointer z-40"
      >
        <Plus className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-8 right-8 z-40 w-80 rounded-xl border bg-card shadow-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Quick Add Task</h3>
        <button
          onClick={() => {
            setExpanded(false);
            setError("");
          }}
          className="h-6 w-6 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title..."
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          autoFocus
        />
        <div className="flex gap-2">
          <select
            value={type}
            onChange={(e) =>
              setType(e.target.value as typeof type)
            }
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring flex-1"
          >
            <option value="call">Call</option>
            <option value="email">Email</option>
            <option value="meeting">Meeting</option>
            <option value="follow-up">Follow-up</option>
          </select>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring flex-1"
          />
        </div>
        <select
          value={contactId}
          onChange={(e) => setContactId(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">No contact</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.company ? ` · ${c.company}` : ""}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full" size="sm">
          {loading ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : null}
          Add
        </Button>
      </form>
    </div>
  );
}
