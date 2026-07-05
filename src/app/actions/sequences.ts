'use server';

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

/**
 * Creates a new email sequence.
 */
export async function createSequence(name: string) {
  const user = await getCurrentUser();
  try {
    const seq = await db.emailSequences.insert({
      user_id: user.id,
      name,
      is_active: false,
    });
    revalidatePath('/sequences');
    return { success: true, sequence: seq };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create sequence.' };
  }
}

/**
 * Toggles a sequence active status.
 */
export async function updateSequenceStatus(sequenceId: string, isActive: boolean) {
  const user = await getCurrentUser();
  try {
    const seq = await db.emailSequences.findById(sequenceId);
    if (!seq || seq.user_id !== user.id) {
      throw new Error('Sequence not found.');
    }
    await db.emailSequences.update(sequenceId, { is_active: isActive });
    revalidatePath('/sequences');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update sequence status.' };
  }
}

/**
 * Deletes a sequence and all associated steps and enrollments.
 */
export async function deleteSequence(sequenceId: string) {
  const user = await getCurrentUser();
  try {
    const seq = await db.emailSequences.findById(sequenceId);
    if (!seq || seq.user_id !== user.id) {
      throw new Error('Sequence not found.');
    }
    
    // Delete steps
    const steps = await db.sequenceSteps.list(s => s.sequence_id === sequenceId);
    for (const step of steps) {
      await db.sequenceSteps.delete(step.id);
    }
    
    // Delete active enrollments
    const enrollments = await db.sequenceEnrollments.list(e => e.sequence_id === sequenceId);
    for (const e of enrollments) {
      await db.sequenceEnrollments.delete(e.id);
    }

    // Delete scheduled emails that aren't sent yet
    const scheduled = await db.scheduledEmails.list(e => e.sequence_id === sequenceId && e.sent_at === null);
    for (const e of scheduled) {
      await db.scheduledEmails.delete(e.id);
    }

    await db.emailSequences.delete(sequenceId);
    revalidatePath('/sequences');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete sequence.' };
  }
}

/**
 * Appends a step to a sequence. Auto-increments the step_number.
 */
export async function addSequenceStep(
  sequenceId: string,
  data: { subject: string; body: string; delay_days: number }
) {
  const user = await getCurrentUser();
  try {
    const seq = await db.emailSequences.findById(sequenceId);
    if (!seq || seq.user_id !== user.id) {
      throw new Error('Sequence not found.');
    }

    const steps = await db.sequenceSteps.list(s => s.sequence_id === sequenceId);
    const nextStepNumber = steps.length + 1;

    const step = await db.sequenceSteps.insert({
      sequence_id: sequenceId,
      step_number: nextStepNumber,
      delay_days: Number(data.delay_days),
      subject: data.subject,
      body: data.body,
    });

    revalidatePath('/sequences');
    return { success: true, step };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to add step.' };
  }
}

/**
 * Deletes a sequence step and re-numbers remaining steps.
 */
export async function deleteSequenceStep(sequenceId: string, stepId: string) {
  const user = await getCurrentUser();
  try {
    const seq = await db.emailSequences.findById(sequenceId);
    if (!seq || seq.user_id !== user.id) {
      throw new Error('Unauthorized.');
    }

    await db.sequenceSteps.delete(stepId);

    // Renumber remaining steps
    const steps = await db.sequenceSteps.list(s => s.sequence_id === sequenceId);
    const sorted = steps.sort((a, b) => a.step_number - b.step_number);
    for (let i = 0; i < sorted.length; i++) {
      await db.sequenceSteps.update(sorted[i].id, { step_number: i + 1 });
    }

    revalidatePath('/sequences');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete step.' };
  }
}
