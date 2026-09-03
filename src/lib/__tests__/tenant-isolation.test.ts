import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '../db';
import { updateContact, deleteContact, addTaskForContact } from '../../app/actions/contacts';
import { updateDealStage, updateDealDetails, deleteDeal } from '../../app/actions/deals';
import { deleteSequence, addSequenceStep, deleteSequenceStep } from '../../app/actions/sequences';

vi.mock('next/cache', () => ({
  revalidatePath: () => {},
}));

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: () => undefined,
    set: () => {},
    delete: () => {},
  }),
  headers: () => ({
    get: () => undefined,
  }),
}));

describe('Tenant Isolation & Authorization Access Control', () => {
  beforeEach(async () => {
    await db.reset();
  });

  it('prevents modifying a contact owned by a different user', async () => {
    // Insert contact owned by attacker / user-2
    const otherUserContact = await db.contacts.insert({
      user_id: 'user-tenant-2',
      first_name: 'Victim',
      last_name: 'Target',
      email: 'victim@tenant2.com',
      phone: '555-0000',
      company: 'Tenant 2 Corp',
      title: 'CEO',
      source: 'Private',
      tags: ['Confidential'],
      notes: 'Internal financials',
      is_opted_out: false,
    });

    // Attempt to update as default-user
    const updateRes = await updateContact(otherUserContact.id, {
      notes: 'Hacked note',
    });
    expect(updateRes.success).toBe(false);
    expect(updateRes.error).toContain('Unauthorized');

    // Attempt to delete as default-user
    const deleteRes = await deleteContact(otherUserContact.id);
    expect(deleteRes.success).toBe(false);
    expect(deleteRes.error).toContain('Unauthorized');

    // Verify contact was not modified or deleted
    const check = await db.contacts.findById(otherUserContact.id);
    expect(check).toBeDefined();
    expect(check!.notes).toBe('Internal financials');
  });

  it('prevents modifying or deleting a deal owned by a different user', async () => {
    // Insert pipeline and stage for tenant 2
    const otherPipeline = await db.pipelines.insert({
      user_id: 'user-tenant-2',
      name: 'Tenant 2 Pipeline',
      is_default: true,
    });

    const otherStage = await db.pipelineStages.insert({
      pipeline_id: otherPipeline.id,
      name: 'Prospect',
      order_index: 0,
      probability: 20,
      color: null,
    });

    const otherDeal = await db.deals.insert({
      user_id: 'user-tenant-2',
      contact_id: null,
      pipeline_id: otherPipeline.id,
      stage_id: otherStage.id,
      title: 'Confidential M&A Deal',
      value: 1000000,
      close_date: '2026-12-31',
      probability: 20,
      notes: 'Secret acquisition',
      won_at: null,
      lost_at: null,
      lost_reason: null,
    });

    // Attempt to update deal stage as default-user
    const stageRes = await updateDealStage(otherDeal.id, otherStage.id);
    expect(stageRes.success).toBe(false);
    expect(stageRes.error).toContain('unauthorized');

    // Attempt to update deal details as default-user
    const detailsRes = await updateDealDetails(otherDeal.id, {
      title: 'Tampered Deal',
      value: 1,
      probability: 0,
      close_date: null,
      notes: 'Hacked',
    });
    expect(detailsRes.success).toBe(false);
    expect(detailsRes.error).toContain('unauthorized');

    // Attempt to delete deal as default-user
    const deleteRes = await deleteDeal(otherDeal.id);
    expect(deleteRes.success).toBe(false);
    expect(deleteRes.error).toContain('unauthorized');

    // Verify deal is intact
    const check = await db.deals.findById(otherDeal.id);
    expect(check!.title).toBe('Confidential M&A Deal');
    expect(check!.value).toBe(1000000);
  });

  it('prevents adding sequence steps or deleting sequences owned by another user', async () => {
    const otherSequence = await db.emailSequences.insert({
      user_id: 'user-tenant-2',
      name: 'Private Campaign',
      is_active: true,
    });

    const step = await db.sequenceSteps.insert({
      sequence_id: otherSequence.id,
      step_number: 1,
      delay_days: 1,
      subject: 'Secret Email',
      body: 'Body text',
    });

    // Attempt to delete sequence as default-user
    const deleteSeqRes = await deleteSequence(otherSequence.id);
    expect(deleteSeqRes.success).toBe(false);
    expect(deleteSeqRes.error?.toLowerCase()).toContain('unauthorized');

    // Attempt to delete step as default-user
    const deleteStepRes = await deleteSequenceStep(otherSequence.id, step.id);
    expect(deleteStepRes.success).toBe(false);
    expect(deleteStepRes.error?.toLowerCase()).toContain('unauthorized');

    // Attempt to add step as default-user
    const addStepRes = await addSequenceStep(otherSequence.id, {
      delay_days: 3,
      subject: 'Malicious Step',
      body: 'Malicious Body',
    });
    expect(addStepRes.success).toBe(false);
    expect(addStepRes.error?.toLowerCase()).toContain('unauthorized');
  });

  it('prevents adding a task to another user contact', async () => {
    const otherContact = await db.contacts.insert({
      user_id: 'user-tenant-2',
      first_name: 'Other',
      last_name: 'Tenant',
      email: 'other@tenant.com',
      phone: null,
      company: null,
      title: null,
      source: 'Direct',
      tags: [],
      notes: null,
      is_opted_out: false,
    });

    const res = await addTaskForContact({
      contact_id: otherContact.id,
      title: 'Sneak task',
      type: 'todo',
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain('Unauthorized');
  });
});
