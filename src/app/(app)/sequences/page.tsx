import React from 'react';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import SequencesClient from './sequences-client';

export const dynamic = 'force-dynamic';

export default async function SequencesPage() {
  const user = await requireUser();

  // Fetch sequences for this user
  const sequences = await db.emailSequences.list(s => s.user_id === user.id);
  const sequenceIds = new Set(sequences.map(s => s.id));

  // Fetch steps and enrollments scoped to user's sequences
  const [steps, enrollments] = await Promise.all([
    db.sequenceSteps.list(st => sequenceIds.has(st.sequence_id)),
    db.sequenceEnrollments.list(e => sequenceIds.has(e.sequence_id)),
  ]);

  return (
    <SequencesClient
      initialSequences={sequences}
      allSteps={steps}
      enrollments={enrollments}
    />
  );
}
