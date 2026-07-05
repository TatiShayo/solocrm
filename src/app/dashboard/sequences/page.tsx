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
    .select("sequence_id, active, completed_at")
    .eq("user_id", user.id);

  const enrollmentMap = new Map<string, { total: number; active: number; completed: number }>();
  for (const e of (enrollments || [])) {
    const existing = enrollmentMap.get(e.sequence_id) || { total: 0, active: 0, completed: 0 };
    existing.total++;
    if (e.active) existing.active++;
    if (e.completed_at) existing.completed++;
    enrollmentMap.set(e.sequence_id, existing);
  }

  // analytics: opens, clicks, unsubscribes per sequence
  const seqIds = seqList.map((s) => s.id);
  const analyticsMap = new Map<string, { sent: number; opens: number; clicks: number }>();

  if (seqIds.length > 0) {
    const { data: sentData } = await supabase
      .from("scheduled_emails")
      .select("sequence_id, id")
      .in("sequence_id", seqIds)
      .not("sent_at", "is", null);

    const sentBySeq = new Map<string, { count: number; ids: string[] }>();
    for (const s of (sentData || [])) {
      const existing = sentBySeq.get(s.sequence_id) || { count: 0, ids: [] };
      existing.count++;
      existing.ids.push(s.id);
      sentBySeq.set(s.sequence_id, existing);
    }

    const allSentIds = (sentData || []).map((s) => s.id);
    const { data: events } = allSentIds.length > 0
      ? await supabase
          .from("email_events")
          .select("scheduled_email_id, event_type")
          .in("scheduled_email_id", allSentIds)
      : { data: [] };

    const openIds = new Set<string>();
    const clickIds = new Set<string>();
    for (const ev of (events || [])) {
      if (ev.event_type === "opened") openIds.add(ev.scheduled_email_id);
      if (ev.event_type === "clicked") clickIds.add(ev.scheduled_email_id);
    }

    for (const sent of (sentData || [])) {
      const seqAnalytics = analyticsMap.get(sent.sequence_id) || { sent: 0, opens: 0, clicks: 0 };
      seqAnalytics.sent++;
      if (openIds.has(sent.id)) seqAnalytics.opens++;
      if (clickIds.has(sent.id)) seqAnalytics.clicks++;
      analyticsMap.set(sent.sequence_id, seqAnalytics);
    }
  }

  // unsubscribed contacts per sequence
  const { data: unsubData } = await supabase
    .from("contacts")
    .select("id, email")
    .eq("is_opted_out", true);
  const unsubContactIds = new Set((unsubData || []).map((c) => c.id));

  let unsubCountBySeq = new Map<string, number>();
  if (unsubContactIds.size > 0 && seqIds.length > 0) {
    const { data: unsubEnrollments } = await supabase
      .from("sequence_enrollments")
      .select("sequence_id, contact_id")
      .in("sequence_id", seqIds);

    for (const e of (unsubEnrollments || [])) {
      if (unsubContactIds.has(e.contact_id)) {
        unsubCountBySeq.set(e.sequence_id, (unsubCountBySeq.get(e.sequence_id) || 0) + 1);
      }
    }
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
              const counts = enrollmentMap.get(seq.id) || { total: 0, active: 0, completed: 0 };
              const analytics = analyticsMap.get(seq.id) || { sent: 0, opens: 0, clicks: 0 };
              const unsubs = unsubCountBySeq.get(seq.id) || 0;
              const openRate = analytics.sent > 0 ? Math.round((analytics.opens / analytics.sent) * 100) : 0;
              const clickRate = analytics.sent > 0 ? Math.round((analytics.clicks / analytics.sent) * 100) : 0;
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
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span>Enrolled: {counts.total}</span>
                    {counts.active > 0 && (
                      <span className="text-green-600">Active: {counts.active}</span>
                    )}
                    {counts.completed > 0 && (
                      <span className="text-blue-600">Completed: {counts.completed}</span>
                    )}
                    {unsubs > 0 && (
                      <span className="text-orange-600">Unsubscribed: {unsubs}</span>
                    )}
                  </div>
                  {analytics.sent > 0 && (
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Sent: {analytics.sent}</span>
                      <span>Opens: {openRate}%</span>
                      <span>Clicks: {clickRate}%</span>
                    </div>
                  )}
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
