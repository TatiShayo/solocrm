"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { unenrollContact } from "../actions";
import { XCircle } from "lucide-react";

interface EnrolledContact {
  enrollment_id: string;
  contact_id: string;
  contact_name: string;
  contact_email: string | null;
  current_step: number;
  active: boolean;
  last_email_sent: string | null;
  next_email_scheduled: string | null;
}

interface Props {
  sequenceId: string;
  contacts: EnrolledContact[];
}

export function EnrolledContacts({ sequenceId, contacts }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleUnenroll(enrollmentId: string) {
    startTransition(async () => {
      await unenrollContact(enrollmentId);
      router.refresh();
    });
  }

  if (contacts.length === 0) return null;

  return (
    <div className="mt-4 rounded-lg border p-4">
      <h3 className="font-semibold mb-3">
        Enrolled Contacts ({contacts.length})
      </h3>
      <div className="space-y-2">
        {contacts.map((c) => (
          <div
            key={c.enrollment_id}
            className="flex items-center justify-between rounded-md border p-3 text-sm"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{c.contact_name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {c.contact_email || "No email"}
              </p>
              <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                <span>Step: {c.current_step + 1}</span>
                {c.last_email_sent && (
                  <span>
                    Last sent: {new Date(c.last_email_sent).toLocaleDateString()}
                  </span>
                )}
                {c.next_email_scheduled && (
                  <span>
                    Next: {new Date(c.next_email_scheduled).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              {!c.active && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  Unenrolled
                </span>
              )}
              {c.active && (
                <button
                  onClick={() => handleUnenroll(c.enrollment_id)}
                  disabled={isPending}
                  className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 disabled:opacity-50"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Unenroll
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
