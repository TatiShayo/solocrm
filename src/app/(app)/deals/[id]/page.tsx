import React from 'react';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import DealDetailClient from './deal-detail-client';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DealDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();
  const { id } = await params;

  // Retrieve deal
  const deal = await db.deals.findById(id);
  if (!deal || deal.user_id !== user.id) {
    notFound();
  }

  // Fetch associated stages, contacts, and timeline events
  const [stages, contacts, timelineEvents] = await Promise.all([
    db.pipelineStages.list(),
    db.contacts.list(c => c.user_id === user.id),
    db.dealTimeline.list(t => t.deal_id === id),
  ]);

  // Sort stages
  const sortedStages = stages.sort((a, b) => a.order_index - b.order_index);

  return (
    <DealDetailClient
      deal={deal}
      stages={sortedStages}
      contacts={contacts}
      timelineEvents={timelineEvents}
    />
  );
}
