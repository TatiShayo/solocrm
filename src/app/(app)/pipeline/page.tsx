import React from 'react';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import PipelineClient from './pipeline-client';

export const dynamic = 'force-dynamic';

export default async function PipelinePage() {
  const user = await requireUser();

  // Find user's pipeline
  const pipeline = (await db.pipelines.find(p => p.user_id === user.id && p.is_default)) ||
    (await db.pipelines.find(p => p.user_id === user.id));

  // Fetch scoped data
  const [deals, stages, contacts, tasks] = await Promise.all([
    db.deals.list(d => d.user_id === user.id),
    pipeline ? db.pipelineStages.list(s => s.pipeline_id === pipeline.id) : [],
    db.contacts.list(c => c.user_id === user.id),
    db.tasks.list(t => t.user_id === user.id),
  ]);

  const dealIds = new Set(deals.map(d => d.id));
  const timelineEvents = await db.dealTimeline.list(t => dealIds.has(t.deal_id));

  // Sort stages by order_index
  const sortedStages = [...stages].sort((a, b) => a.order_index - b.order_index);

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
