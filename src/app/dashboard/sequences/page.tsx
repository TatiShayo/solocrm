import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Sequence, SequenceStep } from "@/lib/types";
import { SequenceForm } from "./_components/sequence-form";
import { StepBuilder } from "./_components/step-builder";
import { DeleteSequenceButton } from "./_components/buttons";
import { EnrollModal } from "./_components/enroll-modal";
import { EnrolledContacts } from "./_components/enrolled-contacts";

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SequencesPage({ searchParams }: Props) {
  const params = await searchParams;
  const editId = typeof params.edit === "string" ? params.edit : null;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: sequences } = await supabase
    .from("sequences")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const seqList = (sequences || []) as Sequence[];

  const { data: enrollments } = await supabase
    .from("sequence_enrollments")
    .select("sequence_id, active")
    .eq("user_id", user.id);

  const enrollmentMap = new Map<string, { total: number; active: number }>();
  for (const e of (enrollments || [])) {
    const existing = enrollmentMap.get(e.sequence_id) || { total: 0, active: 0 };
    existing.total++;
    if (e.active) existing.active++;
    enrollmentMap.set(e.sequence_id, existing);
  }

  let editingSequence: Sequence | null = null;
  let steps: SequenceStep[] = [];
  let enrolledContactIds = new Set<string>();
  let enrolledContacts: {
    enrollment_id: string;
    contact_id: string;
    contact_name: string;
    contact_email: string | null;
    current_step: number;
    active: boolean;
    last_email_sent: string | null;
    next_email_scheduled: string | null;
  }[] = [];

  if (editId) {
    const { data: seq } = await supabase
      .from("sequences")
      .select("*")
      .eq("id", editId)
      .eq("user_id", user.id)
      .single();
    editingSequence = seq as Sequence | null;

    if (editingSequence) {
      const { data: stepData } = await supabase
        .from("sequence_steps")
        .select("*")
        .eq("sequence_id", editId)
        .order("sort_order", { ascending: true });
      steps = (stepData || []) as SequenceStep[];

      const { data: enrData } = await supabase
        .from("sequence_enrollments")
        .select(`
          id,
          contact_id,
          current_step,
          active,
          contacts!inner(name, email)
        `)
        .eq("sequence_id", editId)
        .eq("user_id", user.id);

      if (enrData) {
        for (const enr of enrData) {
          enrolledContactIds.add(enr.contact_id);

          const { data: scheduled } = await supabase
            .from("scheduled_emails")
            .select("scheduled_at, sent_at")
            .eq("enrollment_id", enr.id)
            .order("scheduled_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          const contactData = enr.contacts as unknown as { name: string; email: string | null };
          enrolledContacts.push({
            enrollment_id: enr.id,
            contact_id: enr.contact_id,
            contact_name: contactData.name,
            contact_email: contactData.email,
            current_step: enr.current_step,
            active: enr.active,
            last_email_sent: scheduled?.sent_at || null,
            next_email_scheduled: (scheduled && !scheduled.sent_at)
              ? scheduled.scheduled_at
              : null,
          });
        }
      }
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Sequences</h1>
          <p className="text-muted-foreground mt-1">
            {seqList.length} sequence{seqList.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {seqList.length === 0 ? (
            <div className="rounded-lg border p-8 text-center">
              <p className="text-muted-foreground">No sequences yet.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create one using the form on the right.
              </p>
            </div>
          ) : (
            seqList.map((seq) => {
              const counts = enrollmentMap.get(seq.id) || { total: 0, active: 0 };
              return (
                <div
                  key={seq.id}
                  className="rounded-lg border p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{seq.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        seq.active
                          ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {seq.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/dashboard/sequences?edit=${seq.id}`}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Edit
                      </Link>
                      <DeleteSequenceButton sequenceId={seq.id} />
                    </div>
                  </div>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>Steps: {counts.total || "—"}</span>
                    <span>Enrolled: {counts.total || 0}</span>
                    {counts.active > 0 && (
                      <span className="text-green-600">Active: {counts.active}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Link
                      href={`/dashboard/sequences?edit=${seq.id}`}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      View steps →
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div>
          <SequenceForm editSequence={editingSequence} />
          {editingSequence && (
            <>
              <div className="mt-4">
                <EnrollModal
                  sequenceId={editingSequence.id}
                  sequenceName={editingSequence.name}
                  enrolledContactIds={enrolledContactIds}
                />
              </div>
              <StepBuilder sequenceId={editingSequence.id} steps={steps} />
              <EnrolledContacts
                sequenceId={editingSequence.id}
                contacts={enrolledContacts}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
