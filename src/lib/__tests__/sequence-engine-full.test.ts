import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { db } from '../db';
import { enrollInSequence, checkAndSendScheduledEmails, optOutContact } from '../../app/actions/contacts';

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

describe('Sequence Engine, Scheduling & Opt-Out Flow', () => {
  const mockNow = new Date('2026-08-01T09:00:00.000Z');

  beforeEach(async () => {
    await db.reset();
    vi.useFakeTimers();
    vi.setSystemTime(mockNow);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('enrolls a contact, formats merge tags, and advances sequence steps over time', async () => {
    const contact = await db.contacts.insert({
      user_id: 'default-user',
      first_name: 'Tony',
      last_name: 'Stark',
      email: 'tony@starkindustries.com',
      phone: '555-3000',
      company: 'Stark Industries',
      title: 'CEO',
      source: 'Direct',
      tags: ['VIP'],
      notes: null,
      is_opted_out: false,
    });

    const sequence = await db.emailSequences.insert({
      user_id: 'default-user',
      name: 'Executive Intro',
      is_active: true,
    });

    await db.sequenceSteps.insert({
      sequence_id: sequence.id,
      step_number: 1,
      delay_days: 0,
      subject: 'Hello {{first_name}} from SoloCRM',
      body: 'Hi {{first_name}} {{last_name}}, we love what you do at {{company}}.',
    });

    await db.sequenceSteps.insert({
      sequence_id: sequence.id,
      step_number: 2,
      delay_days: 5,
      subject: 'Follow-up for {{company}}',
      body: 'Hey {{first_name}}, following up on our proposal.',
    });

    // 1. Enroll
    const enrollRes = await enrollInSequence(contact.id, sequence.id);
    expect(enrollRes.success).toBe(true);

    // 2. Step 1 email should be scheduled for right now
    let scheduled = await db.scheduledEmails.list(e => e.contact_id === contact.id && e.sent_at === null);
    expect(scheduled).toHaveLength(1);
    expect(scheduled[0].subject).toBe('Hello Tony from SoloCRM');
    expect(scheduled[0].body).toBe('Hi Tony Stark, we love what you do at Stark Industries.');
    expect(scheduled[0].scheduled_at).toBe(mockNow.toISOString());

    // 3. Process scheduled emails for today
    const sendRes1 = await checkAndSendScheduledEmails();
    expect(sendRes1.success).toBe(true);
    expect(sendRes1.count).toBe(1);

    // 4. Verify step 1 marked sent and step 2 scheduled for 5 days later
    const email1 = await db.scheduledEmails.findById(scheduled[0].id);
    expect(email1!.sent_at).toBe(mockNow.toISOString());

    const enrollmentAfterStep1 = await db.sequenceEnrollments.find(
      se => se.contact_id === contact.id && se.sequence_id === sequence.id
    );
    expect(enrollmentAfterStep1!.current_step).toBe(2);
    expect(enrollmentAfterStep1!.is_active).toBe(true);

    const step2Email = await db.scheduledEmails.find(
      e => e.contact_id === contact.id && e.sent_at === null
    );
    expect(step2Email).toBeDefined();
    const expectedStep2Time = new Date(mockNow.getTime() + 5 * 24 * 60 * 60 * 1000);
    expect(step2Email!.scheduled_at).toBe(expectedStep2Time.toISOString());

    // 5. Advance time by 5 days and process step 2
    vi.setSystemTime(expectedStep2Time);
    const sendRes2 = await checkAndSendScheduledEmails();
    expect(sendRes2.success).toBe(true);
    expect(sendRes2.count).toBe(1);

    // 6. Verify enrollment completed (is_active: false)
    const finalEnrollment = await db.sequenceEnrollments.find(
      se => se.contact_id === contact.id && se.sequence_id === sequence.id
    );
    expect(finalEnrollment!.is_active).toBe(false);
  });

  it('cancels pending emails and halts sequences when contact is opted out', async () => {
    const contact = await db.contacts.insert({
      user_id: 'default-user',
      first_name: 'Pepper',
      last_name: 'Potts',
      email: 'pepper@starkindustries.com',
      phone: null,
      company: 'Stark Industries',
      title: 'COO',
      source: 'Direct',
      tags: [],
      notes: null,
      is_opted_out: false,
    });

    const sequence = await db.emailSequences.insert({
      user_id: 'default-user',
      name: 'Onboarding',
      is_active: true,
    });

    await db.sequenceSteps.insert({
      sequence_id: sequence.id,
      step_number: 1,
      delay_days: 1,
      subject: 'Welcome',
      body: 'Welcome body',
    });

    await enrollInSequence(contact.id, sequence.id);

    // Opt out contact
    const optOutRes = await optOutContact(contact.id);
    expect(optOutRes.success).toBe(true);

    // Verify contact is opted out
    const updatedContact = await db.contacts.findById(contact.id);
    expect(updatedContact!.is_opted_out).toBe(true);

    // Verify scheduled emails were deleted
    const pendingEmails = await db.scheduledEmails.list(
      e => e.contact_id === contact.id && e.sent_at === null
    );
    expect(pendingEmails).toHaveLength(0);

    // Verify enrollments deactivated
    const enrollments = await db.sequenceEnrollments.list(
      se => se.contact_id === contact.id
    );
    expect(enrollments.every(se => !se.is_active)).toBe(true);
  });
});
