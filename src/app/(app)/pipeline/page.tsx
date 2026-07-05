import React from 'react';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import PipelineClient from './pipeline-client';

export const dynamic = 'force-dynamic';

export default async function PipelinePage() {
  const user = await getCurrentUser();

  // Fetch data
  const [deals, stages, contacts, tasks, timelineEvents] = await Promise.all([
    db.deals.list(d => d.user_id === user.id),
    db.pipelineStages.list(),
    db.contacts.list(c => c.user_id === user.id),
    db.tasks.list(t => t.user_id === user.id),
    db.dealTimeline.list(),
  ]);

  // Sort stages by order_index
  const sortedStages = stages.sort((a, b) => a.order_index - b.order_index);

  return (
    <PipelineClient
      initialDeals={deals}
      stages={sortedStages}
      contacts={contacts}
      tasks={tasks}
      timelineEvents={timelineEvents}
    />
  );
}
