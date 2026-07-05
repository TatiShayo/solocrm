import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { db } from '../db';
import { 
  createContact, 
  createDealForContact, 
  addTaskForContact, 
  toggleTaskComplete,
  enrollInSequence,
  checkAndSendScheduledEmails
} from '../../app/actions/contacts';
import { updateDealStage, markDealWon } from '../../app/actions/deals';

vi.mock('next/cache', () => ({
  revalidatePath: () => {},
}));

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: () => undefined,
    set: () => {},
    delete: () => {},
  }),
  headers: () => {
    const headersMap = new Map();
    return {
      get: (key: string) => headersMap.get(key),
    };
  },
}));

describe('CRM Integration Flow Test', () => {
  beforeEach(async () => {
    await db.reset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should run the complete CRM workflow successfully', async () => {
    const mockNow = new Date('2026-06-30T07:00:00.000Z');
    vi.setSystemTime(mockNow);

    // 1. Reset database already completed in beforeEach
    
    // 2. Insert a contact
    const contactResult = await createContact({
      first_name: 'Peter',
      last_name: 'Parker',
      email: 'peter.parker@dailybugle.com',
      phone: '555-0900',
      company: 'Daily Bugle',
      title: 'Photographer',
      source: 'Manual',
      tags: ['Press', 'VIP'],
      notes: 'Spider-man candidate?',
    });
    expect(contactResult.success).toBe(true);
    const contact = contactResult.contact!;
    expect(contact.first_name).toBe('Peter');

    // 3. Create a deal for that contact
    const dealResult = await createDealForContact({
      contact_id: contact.id,
      title: 'Bugle Front Page Photo',
      value: 500,
    });
    expect(dealResult.success).toBe(true);
    const deal = dealResult.deal!;
    expect(deal.value).toBe(500);

    // 4. Verify that a timeline event was created
    const timelineEvents = await db.dealTimeline.list(dt => dt.deal_id === deal.id);
    expect(timelineEvents).toHaveLength(1);
    expect(timelineEvents[0].event_type).toBe('created');
    expect(timelineEvents[0].description).toContain('Bugle Front Page Photo');

    // 5. Complete a task for the contact and check that it was updated
    const taskResult = await addTaskForContact({
      contact_id: contact.id,
      title: 'Call J. Jonah Jameson',
      type: 'call',
    });
    expect(taskResult.success).toBe(true);
    const task = taskResult.task!;
    expect(task.is_complete).toBe(false);

    // Complete the task
    const completeResult = await toggleTaskComplete(task.id, true);
    expect(completeResult.success).toBe(true);
    expect(completeResult.task!.is_complete).toBe(true);
    expect(completeResult.task!.completed_at).toBe(mockNow.toISOString());

    // 6. Move the deal stage, verifying the stage and timeline changes
    // Default stages are seeded: stage-lead, stage-contacted, stage-proposal, stage-negotiation, stage-won, stage-lost
    const moveResult = await updateDealStage(deal.id, 'stage-contacted');
    expect(moveResult.success).toBe(true);

    const updatedDeal = await db.deals.findById(deal.id);
    expect(updatedDeal!.stage_id).toBe('stage-contacted');
    expect(updatedDeal!.probability).toBe(30); // Contacted stage is 30% probability

    const timelineAfterMove = await db.dealTimeline.list(dt => dt.deal_id === deal.id);
    expect(timelineAfterMove).toHaveLength(2); // created + stage_change
    expect(timelineAfterMove[1].event_type).toBe('stage_change');
    expect(timelineAfterMove[1].description).toContain('Contacted');

    // 7. Mark the deal as Won and verify probability and won_at time
    const wonResult = await markDealWon(deal.id);
    expect(wonResult.success).toBe(true);

    const wonDeal = await db.deals.findById(deal.id);
    expect(wonDeal!.stage_id).toBe('stage-won');
    expect(wonDeal!.probability).toBe(100);
    expect(wonDeal!.won_at).toBe(mockNow.toISOString());

    // 8. Run a background check on scheduled emails to verify progression
    // 8.1 Setup a sequence with 2 steps
    const sequence = await db.emailSequences.insert({
      user_id: 'default-user',
      name: 'Nurture Sequence',
      is_active: true,
    });

    const step1 = await db.sequenceSteps.insert({
      sequence_id: sequence.id,
      step_number: 1,
      delay_days: 0, // due immediately
      subject: 'Hey {{first_name}}, deal is won!',
      body: 'Thanks for sending photos from {{company}}.',
    });

    const step2 = await db.sequenceSteps.insert({
      sequence_id: sequence.id,
      step_number: 2,
      delay_days: 2, // due in 2 days
      subject: 'Follow-up {{first_name}}',
      body: 'Do you have more photos?',
    });

    // 8.2 Enroll in sequence
    const enrollResult = await enrollInSequence(contact.id, sequence.id);
    expect(enrollResult.success).toBe(true);

    // Verify step 1 email is scheduled for now
    let scheduledEmails = await db.scheduledEmails.list(e => e.contact_id === contact.id);
    expect(scheduledEmails).toHaveLength(1);
    expect(scheduledEmails[0].sent_at).toBeNull();
    expect(scheduledEmails[0].scheduled_at).toBe(mockNow.toISOString());
    expect(scheduledEmails[0].subject).toBe('Hey Peter, deal is won!');

    // 8.3 Run checkAndSendScheduledEmails to process immediate emails (step 1)
    const sendResult1 = await checkAndSendScheduledEmails();
    expect(sendResult1.success).toBe(true);
    expect(sendResult1.count).toBe(1);

    // Verify step 1 email is sent
    const email1 = await db.scheduledEmails.findById(scheduledEmails[0].id);
    expect(email1!.sent_at).toBe(mockNow.toISOString());

    // Verify enrollment has progressed to step 2
    const enrollment = await db.sequenceEnrollments.find(
      se => se.contact_id === contact.id && se.sequence_id === sequence.id
    );
    expect(enrollment!.current_step).toBe(2);
    expect(enrollment!.is_active).toBe(true);

    // Verify step 2 email is scheduled for mockNow + 2 days
    scheduledEmails = await db.scheduledEmails.list(e => e.contact_id === contact.id && e.sent_at === null);
    expect(scheduledEmails).toHaveLength(1);
    
    const expectedStep2Date = new Date(mockNow.getTime());
    expectedStep2Date.setDate(expectedStep2Date.getDate() + 2);
    expect(scheduledEmails[0].scheduled_at).toBe(expectedStep2Date.toISOString());
    expect(scheduledEmails[0].subject).toBe('Follow-up Peter');

    // 8.4 Move forward 2 days and send step 2 email
    const twoDaysLater = new Date(mockNow.getTime());
    twoDaysLater.setDate(twoDaysLater.getDate() + 2);
    vi.setSystemTime(twoDaysLater);

    const sendResult2 = await checkAndSendScheduledEmails();
    expect(sendResult2.success).toBe(true);
    expect(sendResult2.count).toBe(1);

    // Verify step 2 email is sent
    const email2 = await db.scheduledEmails.findById(scheduledEmails[0].id);
    expect(email2!.sent_at).toBe(twoDaysLater.toISOString());

    // Verify enrollment is now completed (inactive) since no more steps exist
    const finalEnrollment = await db.sequenceEnrollments.find(
      se => se.contact_id === contact.id && se.sequence_id === sequence.id
    );
    expect(finalEnrollment!.is_active).toBe(false);
  });
});
