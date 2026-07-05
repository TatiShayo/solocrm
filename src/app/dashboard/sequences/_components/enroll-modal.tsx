"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Contact } from "@/lib/types";
import { enrollContacts } from "../actions";
import { X, Search } from "lucide-react";

interface Props {
  sequenceId: string;
  sequenceName: string;
  enrolledContactIds: Set<string>;
}

export function EnrollModal({ sequenceId, sequenceName, enrolledContactIds }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function open() {
    setIsOpen(true);
    setSearch("");
    setContacts([]);
    setSelected(new Set());
  }

  function close() {
    setIsOpen(false);
  }

  async function handleSearch() {
    if (!search.trim()) return;
    setLoading(true);
    const res = await fetch(
      `/api/contacts?search=${encodeURIComponent(search)}`
    );
    const json = await res.json();
    setContacts(json.contacts || []);
    setLoading(false);
  }

  function toggleContact(id: string) {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelected(next);
  }

  function handleEnroll() {
    if (selected.size === 0) return;
    startTransition(async () => {
      const result = await enrollContacts(sequenceId, Array.from(selected));
      if (result.success) {
        setIsOpen(false);
        router.refresh();
      }
    });
  }

  const available = contacts.filter((c) => !enrolledContactIds.has(c.id));

  return (
    <>
      <button
        onClick={open}
        className="rounded bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:bg-primary/90"
      >
        Enroll Contacts
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={close}
          />
          <div className="relative bg-background rounded-lg border shadow-lg w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 className="text-lg font-semibold">Enroll in Sequence</h2>
                <p className="text-sm text-muted-foreground">{sequenceName}</p>
              </div>
              <button
                onClick={close}
                className="rounded p-1 hover:bg-muted"
                disabled={isPending}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 border-b">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="rounded-md border border-input bg-background px-3 py-2 hover:bg-muted disabled:opacity-50"
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Searching...
                </p>
              ) : available.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {contacts.length === 0
                    ? "Search for contacts to enroll."
                    : "All matching contacts are already enrolled."}
                </p>
              ) : (
                <div className="space-y-1">
                  {available.map((contact) => (
                    <label
                      key={contact.id}
                      className="flex items-center gap-3 rounded-md p-2 hover:bg-muted/50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(contact.id)}
                        onChange={() => toggleContact(contact.id)}
                        className="rounded border-input"
                      />
                      <div>
                        <p className="text-sm font-medium">{contact.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {contact.email || "No email"}
                          {contact.company ? ` · ${contact.company}` : ""}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-4 border-t">
              <span className="text-sm text-muted-foreground">
                {selected.size} selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={close}
                  className="rounded-md border border-input bg-background px-4 py-2 text-sm hover:bg-muted"
                  disabled={isPending}
                >
                  Cancel
                </button>
                <button
                  onClick={handleEnroll}
                  disabled={selected.size === 0 || isPending}
                  className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {isPending ? "Enrolling..." : "Enroll"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
