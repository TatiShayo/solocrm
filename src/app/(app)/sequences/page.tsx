import React from 'react';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import SequencesClient from './sequences-client';

export const dynamic = 'force-dynamic';

export default async function SequencesPage() {
  const user = await requireUser();

  // Fetch sequences, steps, enrollments
  const [sequences, steps, enrollments] = await Promise.all([
    db.emailSequences.list(s => s.user_id === user.id),
    db.sequenceSteps.list(),
    db.sequenceEnrollments.list(),
  ]);

  return (
    <SequencesClient
      initialSequences={sequences}
      allSteps={steps}
      enrollments={enrollments}
    />
  );
}
