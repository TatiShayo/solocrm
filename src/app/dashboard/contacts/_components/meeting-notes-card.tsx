"use client";

import { useState } from "react";
import { ClipboardList, Sparkles, Loader2 } from "lucide-react";

interface Props {
  contactId: string;
  meetingNotes: string | null;
}

export function MeetingNotesCard({ contactId, meetingNotes }: Props) {
  const [actionItems, setActionItems] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateActionItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/meeting-action-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to generate action items");
        return;
      }
      setActionItems(data.actionItems);
    } catch {
      setError("Failed to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const hasNotes = meetingNotes && meetingNotes.trim().length > 0;

  return (
    <div className="rounded-lg border p-6 space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-semibold">Meeting Notes</h2>
      </div>

      {hasNotes ? (
        <>
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">
            {meetingNotes}
          </p>

          <button
            onClick={generateActionItems}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background h-9 px-3 py-2 text-xs font-medium hover:bg-muted disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            )}
            {loading ? "Generating..." : "AI: Generate Action Items"}
          </button>

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          {actionItems && (
            <div className="rounded-md bg-muted/50 p-3">
              <p className="text-xs font-medium mb-2 text-muted-foreground">
                Action Items
              </p>
              <p className="text-sm whitespace-pre-wrap">{actionItems}</p>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          No meeting notes yet. Add notes from the edit page to generate AI action items.
        </p>
      )}
    </div>
  );
}
