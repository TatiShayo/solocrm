import React from 'react';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import ContactDetailClient from './contact-detail-client';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface TimelineEvent {
  id: string;
  type: 'contact_created' | 'deal_created' | 'task_created' | 'task_completed' | 'sequence_enrolled' | 'email_scheduled' | 'email_sent';
  title: string;
  description: string;
  date: string;
}

export default async function ContactDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();
  const { id } = await params;

  // Retrieve contact, verifying it belongs to current user
  const contact = await db.contacts.findById(id);
  if (!contact || contact.user_id !== user.id) {
    notFound();
  }

  // Fetch associated models
  const [deals, tasks, enrollments, scheduledEmails, sequences] = await Promise.all([
    db.deals.list(d => d.contact_id === id),
    db.tasks.list(t => t.contact_id === id),
    db.sequenceEnrollments.list(se => se.contact_id === id),
    db.scheduledEmails.list(se => se.contact_id === id),
    db.emailSequences.list(seq => seq.user_id === user.id),
  ]);

  // Fetch pipeline stages of the user's default pipeline (to populate stage options when adding deals)
  const defaultPipeline = await db.pipelines.find(p => p.user_id === user.id && p.is_default);
  const pipelineStages = defaultPipeline 
    ? await db.pipelineStages.list(s => s.pipeline_id === defaultPipeline.id)
    : [];

  // Construct activities timeline
  const timelineEvents: TimelineEvent[] = [];

  // 1. Contact Creation
  timelineEvents.push({
    id: `contact-created-${contact.id}`,
    type: 'contact_created',
    title: 'Contact Created',
    description: `Contact ${contact.first_name} ${contact.last_name} was created via ${contact.source || 'Manual'}.`,
    date: contact.created_at,
  });

  // 2. Deals Created
  deals.forEach(d => {
    timelineEvents.push({
      id: `deal-created-${d.id}`,
      type: 'deal_created',
      title: 'Deal Created',
      description: `Deal "${d.title}" was created with a value of $${d.value.toLocaleString()}.`,
      date: (d as any).created_at || contact.created_at,
    });
  });

  // 3. Tasks Created & Completed
  tasks.forEach(t => {
    timelineEvents.push({
      id: `task-created-${t.id}`,
      type: 'task_created',
      title: 'Task Created',
      description: `Task "${t.title}" (${t.type}) was created.`,
      date: (t as any).created_at || contact.created_at,
    });

    if (t.is_complete && t.completed_at) {
      timelineEvents.push({
        id: `task-completed-${t.id}`,
        type: 'task_completed',
        title: 'Task Completed',
        description: `Task "${t.title}" was marked complete.`,
        date: t.completed_at,
      });
    }
  });

  // 4. Sequence Enrollments
  enrollments.forEach(se => {
    const seq = sequences.find(s => s.id === se.sequence_id);
    timelineEvents.push({
      id: `seq-enrollment-${se.id}`,
      type: 'sequence_enrolled',
      title: 'Sequence Enrollment',
      description: `Contact enrolled in sequence "${seq?.name || 'Campaign'}" (Step ${se.current_step}).`,
      date: se.enrolled_at,
    });
  });

  // 5. Emails Scheduled & Sent
  scheduledEmails.forEach(e => {
    const isSent = e.sent_at !== null;
    timelineEvents.push({
      id: `email-${e.id}`,
      type: isSent ? 'email_sent' : 'email_scheduled',
      title: isSent ? 'Email Sent' : 'Email Scheduled',
      description: isSent 
        ? `Sent email sequence message: "${e.subject}"`
        : `Scheduled sequence email to send: "${e.subject}"`,
      date: isSent ? e.sent_at! : e.scheduled_at,
    });
  });

  // Sort events chronologically (Newest first)
  timelineEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <ContactDetailClient
      contact={contact}
      deals={deals}
      tasks={tasks}
      enrollments={enrollments}
      scheduledEmails={scheduledEmails}
      sequences={sequences}
      pipelineStages={pipelineStages}
      timelineEvents={timelineEvents}
    />
  );
}
