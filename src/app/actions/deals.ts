'use server';

import { db, Deal } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { generateDealSummary, suggestNextStep, generateEmailDraft } from '@/lib/ai';

/**
 * Updates a deal's stage (used by drag-and-drop Kanban or direct actions).
 * Appends a history event to the timeline and revalidates paths.
 */
export async function updateDealStage(dealId: string, newStageId: string) {
  const user = await getCurrentUser();

  try {
    const deal = await db.deals.findById(dealId);
    if (!deal || deal.user_id !== user.id) {
      throw new Error('Deal not found or unauthorized.');
    }

    const stage = await db.pipelineStages.findById(newStageId);
    if (!stage) {
      throw new Error('Stage not found.');
    }

    const pipeline = await db.pipelines.findById(stage.pipeline_id);
    if (!pipeline || pipeline.user_id !== user.id) {
      throw new Error('Stage unauthorized or not found.');
    }

    const updates: Partial<Deal> = {
      stage_id: newStageId,
      probability: stage.probability,
    };

    // If moved to Won stage
    if (stage.name.toLowerCase() === 'won' || newStageId === 'stage-won') {
      updates.won_at = new Date().toISOString();
      updates.lost_at = null;
      updates.lost_reason = null;
    } 
    // If moved to Lost stage
    else if (stage.name.toLowerCase() === 'lost' || newStageId === 'stage-lost') {
      updates.lost_at = new Date().toISOString();
      updates.won_at = null;
      // Do not clear lost_reason if it is already set, otherwise set default
      if (!deal.lost_reason) {
        updates.lost_reason = 'Moved to Lost';
      }
    } 
    // Any other stage
    else {
      updates.won_at = null;
      updates.lost_at = null;
      updates.lost_reason = null;
    }

    await db.deals.update(dealId, updates);

    // Add event to timeline
    await db.dealTimeline.insert({
      deal_id: dealId,
      event_type: 'stage_change',
      description: `Deal stage updated to ${stage.name}.`,
    });

    revalidatePath('/pipeline');
    revalidatePath(`/deals/${dealId}`);
    if (deal.contact_id) {
      revalidatePath(`/contacts/${deal.contact_id}`);
    }
    return { success: true };
  } catch (error: any) {
    console.error('Error updating deal stage:', error);
    return { success: false, error: error.message || 'Failed to update deal stage.' };
  }
}

/**
 * Updates all fields of a deal from the details drawer/modal.
 */
export async function updateDealDetails(
  dealId: string,
  data: {
    title: string;
    contact_id: string | null;
    value: number;
    close_date: string | null;
    notes: string | null;
    stage_id: string;
  }
) {
  const user = await getCurrentUser();

  try {
    const deal = await db.deals.findById(dealId);
    if (!deal || deal.user_id !== user.id) {
      throw new Error('Deal not found or unauthorized.');
    }

    if (data.contact_id) {
      const contact = await db.contacts.findById(data.contact_id);
      if (!contact || contact.user_id !== user.id) {
        throw new Error('Contact not found or unauthorized.');
      }
    }

    const stage = await db.pipelineStages.findById(data.stage_id);
    if (!stage) {
      throw new Error('Pipeline stage not found.');
    }

    const updates: Partial<Deal> = {
      title: data.title,
      contact_id: data.contact_id,
      value: Number(data.value),
      close_date: data.close_date || null,
      notes: data.notes || null,
      stage_id: data.stage_id,
      probability: stage.probability,
    };

    // If stage changed, check won/lost updates
    if (data.stage_id !== deal.stage_id) {
      if (stage.name.toLowerCase() === 'won' || data.stage_id === 'stage-won') {
        updates.won_at = new Date().toISOString();
        updates.lost_at = null;
        updates.lost_reason = null;
      } else if (stage.name.toLowerCase() === 'lost' || data.stage_id === 'stage-lost') {
        updates.lost_at = new Date().toISOString();
        updates.won_at = null;
        if (!deal.lost_reason) {
          updates.lost_reason = 'Moved to Lost';
        }
      } else {
        updates.won_at = null;
        updates.lost_at = null;
        updates.lost_reason = null;
      }

      await db.dealTimeline.insert({
        deal_id: dealId,
        event_type: 'stage_change',
        description: `Deal stage updated to ${stage.name} via details edit.`,
      });
    }

    await db.deals.update(dealId, updates);

    revalidatePath('/pipeline');
    revalidatePath(`/deals/${dealId}`);
    if (deal.contact_id) {
      revalidatePath(`/contacts/${deal.contact_id}`);
    }
    if (data.contact_id && data.contact_id !== deal.contact_id) {
      revalidatePath(`/contacts/${data.contact_id}`);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error updating deal details:', error);
    return { success: false, error: error.message || 'Failed to update deal details.' };
  }
}

/**
 * Marks a deal as Won.
 */
export async function markDealWon(dealId: string) {
  const user = await getCurrentUser();

  try {
    const deal = await db.deals.findById(dealId);
    if (!deal || deal.user_id !== user.id) {
      throw new Error('Deal not found or unauthorized.');
    }

    // Try to find the "Won" stage ID
    const stages = await db.pipelineStages.list(s => s.pipeline_id === deal.pipeline_id);
    const wonStage = stages.find(s => s.name.toLowerCase() === 'won' || s.id === 'stage-won');
    const wonStageId = wonStage ? wonStage.id : deal.stage_id;

    await db.deals.update(dealId, {
      stage_id: wonStageId,
      won_at: new Date().toISOString(),
      lost_at: null,
      lost_reason: null,
      probability: 100,
    });

    await db.dealTimeline.insert({
      deal_id: dealId,
      event_type: 'stage_change',
      description: 'Deal was marked Won.',
    });

    revalidatePath('/pipeline');
    revalidatePath(`/deals/${dealId}`);
    if (deal.contact_id) {
      revalidatePath(`/contacts/${deal.contact_id}`);
    }
    return { success: true };
  } catch (error: any) {
    console.error('Error marking deal won:', error);
    return { success: false, error: error.message || 'Failed to mark deal as won.' };
  }
}

/**
 * Marks a deal as Lost with a reason.
 */
export async function markDealLost(dealId: string, lostReason: string) {
  const user = await getCurrentUser();

  try {
    const deal = await db.deals.findById(dealId);
    if (!deal || deal.user_id !== user.id) {
      throw new Error('Deal not found or unauthorized.');
    }

    // Try to find the "Lost" stage ID
    const stages = await db.pipelineStages.list(s => s.pipeline_id === deal.pipeline_id);
    const lostStage = stages.find(s => s.name.toLowerCase() === 'lost' || s.id === 'stage-lost');
    const lostStageId = lostStage ? lostStage.id : deal.stage_id;

    await db.deals.update(dealId, {
      stage_id: lostStageId,
      lost_at: new Date().toISOString(),
      lost_reason: lostReason,
      won_at: null,
      probability: 0,
    });

    await db.dealTimeline.insert({
      deal_id: dealId,
      event_type: 'stage_change',
      description: `Deal was marked Lost. Reason: ${lostReason}`,
    });

    revalidatePath('/pipeline');
    revalidatePath(`/deals/${dealId}`);
    if (deal.contact_id) {
      revalidatePath(`/contacts/${deal.contact_id}`);
    }
    return { success: true };
  } catch (error: any) {
    console.error('Error marking deal lost:', error);
    return { success: false, error: error.message || 'Failed to mark deal as lost.' };
  }
}

/**
 * Deletes a deal entirely.
 */
export async function deleteDeal(dealId: string) {
  const user = await getCurrentUser();

  try {
    const deal = await db.deals.findById(dealId);
    if (!deal || deal.user_id !== user.id) {
      throw new Error('Deal not found or unauthorized.');
    }

    // Delete all timeline entries for the deal first
    const timeline = await db.dealTimeline.list(t => t.deal_id === dealId);
    for (const item of timeline) {
      await db.dealTimeline.delete(item.id);
    }

    // Delete the deal
    await db.deals.delete(dealId);

    revalidatePath('/pipeline');
    if (deal.contact_id) {
      revalidatePath(`/contacts/${deal.contact_id}`);
    }
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting deal:', error);
    return { success: false, error: error.message || 'Failed to delete deal.' };
  }
}

/**
 * Server Action wrapper to get AI deal status summary.
 */
export async function getAISummaryAction(dealId: string) {
  const user = await getCurrentUser();
  const deal = await db.deals.findById(dealId);
  if (!deal || deal.user_id !== user.id) {
    throw new Error('Unauthorized');
  }
  return await generateDealSummary(dealId);
}

/**
 * Server Action wrapper to get AI deal next step recommendation.
 */
export async function getAINextStepAction(dealId: string) {
  const user = await getCurrentUser();
  const deal = await db.deals.findById(dealId);
  if (!deal || deal.user_id !== user.id) {
    throw new Error('Unauthorized');
  }
  return await suggestNextStep(dealId);
}

/**
 * Server Action wrapper to generate email draft.
 */
export async function generateEmailDraftAction(contactId: string, prompt: string) {
  const user = await getCurrentUser();
  const contact = await db.contacts.findById(contactId);
  if (!contact || contact.user_id !== user.id) {
    throw new Error('Unauthorized');
  }
  return await generateEmailDraft(contactId, prompt);
}

/**
 * Creates a deal directly from the pipeline view.
 */
export async function createDeal(data: {
  title: string;
  contact_id: string | null;
  value: number;
  stage_id: string;
  close_date?: string;
  notes?: string;
}) {
  const user = await getCurrentUser();
  try {
    if (data.contact_id) {
      const contact = await db.contacts.findById(data.contact_id);
      if (!contact || contact.user_id !== user.id) {
        throw new Error('Contact not found or unauthorized.');
      }
    }

    const defaultPipeline = await db.pipelines.find(p => p.user_id === user.id && p.is_default);
    if (!defaultPipeline) {
      throw new Error('No default pipeline found.');
    }

    const newDeal = await db.deals.insert({
      user_id: user.id,
      contact_id: data.contact_id || null,
      pipeline_id: defaultPipeline.id,
      stage_id: data.stage_id,
      title: data.title,
      value: Number(data.value),
      close_date: data.close_date || null,
      probability: null,
      notes: data.notes || null,
      won_at: null,
      lost_at: null,
      lost_reason: null,
    });

    await db.dealTimeline.insert({
      deal_id: newDeal.id,
      event_type: 'created',
      description: `Deal was created for ${data.title}.`,
    });

    revalidatePath('/pipeline');
    if (data.contact_id) {
      revalidatePath(`/contacts/${data.contact_id}`);
    }
    return { success: true, deal: newDeal };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create deal.' };
  }
}
