import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { db } from '../db';
import { enrollInSequence } from '../../app/actions/contacts';

vi.mock('next/cache', () => ({
  revalidatePath: () => {},
}));

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: () => undefined,
  }),
  headers: () => ({
    get: () => undefined,
  }),
}));

describe('Sequence Scheduling Logic', () => {
  beforeEach(async () => {
    await db.reset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should enroll a contact and schedule the first step email with correct delay', async () => {
    const mockNow = new Date('2026-06-30T07:00:00.000Z');
    vi.setSystemTime(mockNow);

    // 1. Create a contact
    const contact = await db.contacts.insert({
      user_id: 'default-user',
      first_name: 'Jane',
      last_name: 'Doe',
      email: 'jane@example.com',
      phone: null,
      company: 'Testing Corp',
      title: 'QA Lead',
      source: 'Test Suite',
      tags: [],
      notes: null,
      is_opted_out: false,
    });

    // 2. Create a sequence
    const sequence = await db.emailSequences.insert({
      user_id: 'default-user',
      name: 'Welcome Sequence',
      is_active: true,
    });

    // 3. Create a step for that sequence
    const delayDays = 3;
    const step = await db.sequenceSteps.insert({
      sequence_id: sequence.id,
      step_number: 1,
      delay_days: delayDays,
      subject: 'Welcome {{first_name}} to SoloCRM!',
      body: 'Hello {{first_name}} {{last_name}}, we are glad to have you at {{company}}.',
    });

    // 4. Enroll in the sequence
    const result = await enrollInSequence(contact.id, sequence.id);
    expect(result.success).toBe(true);

    // 5. Verify enrollment record
    const enrollments = await db.sequenceEnrollments.list(se => se.contact_id === contact.id);
    expect(enrollments).toHaveLength(1);
    expect(enrollments[0].sequence_id).toBe(sequence.id);
    expect(enrollments[0].current_step).toBe(1);
    expect(enrollments[0].is_active).toBe(true);

    // 6. Verify scheduled email record
    const emails = await db.scheduledEmails.list(e => e.contact_id === contact.id);
    expect(emails).toHaveLength(1);
    
    const email = emails[0];
    expect(email.sequence_id).toBe(sequence.id);
    expect(email.step_id).toBe(step.id);
    expect(email.sent_at).toBeNull();
    expect(email.subject).toBe('Welcome Jane to SoloCRM!');
    expect(email.body).toBe('Hello Jane Doe, we are glad to have you at Testing Corp.');

    // Calculate expected date: mockNow + 3 days
    const expectedDate = new Date(mockNow.getTime());
    expectedDate.setDate(expectedDate.getDate() + delayDays);
    
    expect(email.scheduled_at).toBe(expectedDate.toISOString());
  });
});
