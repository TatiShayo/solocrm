'use server';

import { db, Contact, Deal, Task, SequenceEnrollment, ScheduledEmail } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// Helper to merge template tags with HTML escaping to prevent HTML injection
function mergeTemplate(template: string, contact: Contact) {
  return template
    .replace(/\{\{first_name\}\}/g, escapeHtml(contact.first_name || ''))
    .replace(/\{\{last_name\}\}/g, escapeHtml(contact.last_name || ''))
    .replace(/\{\{company\}\}/g, escapeHtml(contact.company || ''))
    .replace(/\{\{email\}\}/g, escapeHtml(contact.email || ''))
    .replace(/\{\{title\}\}/g, escapeHtml(contact.title || ''));
}

/**
 * Creates a single contact for the current user.
 */
export async function createContact(data: {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  title: string | null;
  source: string | null;
  tags: string[];
  notes: string | null;
}) {
  const user = await getCurrentUser();

  if (data.email) {
    const existing = await db.contacts.find(
      c => c.user_id === user.id && c.email?.toLowerCase() === data.email?.toLowerCase()
    );
    if (existing) {
      return { success: false, error: 'A contact with this email already exists.' };
    }
  }

  try {
    const newContact = await db.contacts.insert({
      user_id: user.id,
      first_name: data.first_name || '',
      last_name: data.last_name || '',
      email: data.email || '',
      phone: data.phone || '',
      company: data.company || '',
      title: data.title || '',
      source: data.source || 'Manual',
      tags: data.tags || [],
      notes: data.notes || '',
      is_opted_out: false,
    });
    revalidatePath('/contacts');
    return { success: true, contact: newContact };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create contact.' };
  }
}

/**
 * Updates an existing contact.
 */
export async function updateContact(id: string, data: Partial<Contact>) {
  const user = await getCurrentUser();
  try {
    const contact = await db.contacts.findById(id);
    if (!contact || contact.user_id !== user.id) {
      return { success: false, error: 'Unauthorized or contact not found.' };
    }
    const updated = await db.contacts.update(id, data);
    revalidatePath('/contacts');
    revalidatePath(`/contacts/${id}`);
    return { success: true, contact: updated };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update contact.' };
  }
}

/**
 * Deletes a contact.
 */
export async function deleteContact(id: string) {
  const user = await getCurrentUser();
  try {
    const contact = await db.contacts.findById(id);
    if (!contact || contact.user_id !== user.id) {
      return { success: false, error: 'Unauthorized or contact not found.' };
    }
    await db.contacts.delete(id);
    // Also clean up tasks, deals, and enrollments linked to this contact to prevent dangling references
    const tasks = await db.tasks.list(t => t.contact_id === id);
    for (const t of tasks) {
      await db.tasks.delete(t.id);
    }
    const enrollments = await db.sequenceEnrollments.list(se => se.contact_id === id);
    for (const se of enrollments) {
      await db.sequenceEnrollments.delete(se.id);
    }
    const emails = await db.scheduledEmails.list(e => e.contact_id === id);
    for (const e of emails) {
      await db.scheduledEmails.delete(e.id);
    }
    
    // We update deals to un-link them (or we can delete them, but setting contact_id to null is safer)
    const deals = await db.deals.list(d => d.contact_id === id);
    for (const d of deals) {
      await db.deals.update(d.id, { contact_id: null });
    }

    revalidatePath('/contacts');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete contact.' };
  }
}

/**
 * Bulk inserts contacts.
 */
export async function bulkInsertContacts(contactsList: Array<{
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  title: string | null;
  source: string | null;
  tags: string[];
  notes: string | null;
}>) {
  const user = await getCurrentUser();

  try {
    const inserted = [];
    for (const c of contactsList) {
      // Check for duplicate emails for this user to avoid imports overriding existing data
      let skip = false;
      if (c.email) {
        const existing = await db.contacts.find(
          ec => ec.user_id === user.id && ec.email?.toLowerCase() === c.email?.toLowerCase()
        );
        if (existing) {
          skip = true;
        }
      }

      if (!skip) {
        const newContact = await db.contacts.insert({
          user_id: user.id,
          first_name: c.first_name || '',
          last_name: c.last_name || '',
          email: c.email || '',
          phone: c.phone || '',
          company: c.company || '',
          title: c.title || '',
          source: c.source || 'CSV Import',
          tags: c.tags || [],
          notes: c.notes || '',
          is_opted_out: false,
        });
        inserted.push(newContact);
      }
    }
    revalidatePath('/contacts');
    return { success: true, count: inserted.length };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to bulk import contacts.' };
  }
}

/**
 * Creates a deal for a contact.
 */
export async function createDealForContact(data: {
  contact_id: string;
  title: string;
  value: number;
  stage_id?: string;
  pipeline_id?: string;
  close_date?: string;
  notes?: string;
}) {
  const user = await getCurrentUser();
  try {
    const contact = await db.contacts.findById(data.contact_id);
    if (!contact || contact.user_id !== user.id) {
      return { success: false, error: 'Unauthorized or contact not found.' };
    }

    let pipelineId = data.pipeline_id;
    let stageId = data.stage_id;

    if (!pipelineId || !stageId) {
      const defaultPipeline = await db.pipelines.find(p => p.user_id === user.id && p.is_default);
      if (!defaultPipeline) {
        throw new Error('No default pipeline found.');
      }
      pipelineId = defaultPipeline.id;
      const stages = await db.pipelineStages.list(s => s.pipeline_id === defaultPipeline.id);
      const firstStage = stages.sort((a, b) => a.order_index - b.order_index)[0];
      if (!firstStage) {
        throw new Error('No pipeline stages found.');
      }
      stageId = firstStage.id;
    }

    const newDeal = await db.deals.insert({
      user_id: user.id,
      contact_id: data.contact_id,
      pipeline_id: pipelineId,
      stage_id: stageId,
      title: data.title,
      value: Number(data.value),
      close_date: data.close_date || null,
      probability: null,
      notes: data.notes || null,
      won_at: null,
      lost_at: null,
      lost_reason: null,
    });

    // Also add to deal timeline
    await db.dealTimeline.insert({
      deal_id: newDeal.id,
      event_type: 'created',
      description: `Deal was created for ${data.title}.`,
    });

    revalidatePath(`/contacts/${data.contact_id}`);
    revalidatePath('/contacts');
    return { success: true, deal: newDeal };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create deal.' };
  }
}

/**
 * Creates a task for a contact.
 */
export async function addTaskForContact(data: {
  contact_id: string;
  title: string;
  due_date?: string;
  type?: string;
}) {
  const user = await getCurrentUser();
  try {
    const contact = await db.contacts.findById(data.contact_id);
    if (!contact || contact.user_id !== user.id) {
      return { success: false, error: 'Unauthorized or contact not found.' };
    }

    const newTask = await db.tasks.insert({
      user_id: user.id,
      contact_id: data.contact_id,
      deal_id: null,
      title: data.title,
      due_date: data.due_date || null,
      type: data.type || 'todo',
      is_complete: false,
      completed_at: null,
    });
    revalidatePath(`/contacts/${data.contact_id}`);
    revalidatePath('/contacts');
    return { success: true, task: newTask };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to add task.' };
  }
}

/**
 * Toggles completion status of a task.
 */
export async function toggleTaskComplete(taskId: string, isComplete: boolean) {
  const user = await getCurrentUser();
  try {
    const task = await db.tasks.findById(taskId);
    if (!task) {
      return { success: false, error: 'Task not found.' };
    }

    let authorized = task.user_id === user.id;
    if (!authorized && task.contact_id) {
      const contact = await db.contacts.findById(task.contact_id);
      if (contact && contact.user_id === user.id) {
        authorized = true;
      }
    }

    if (!authorized) {
      return { success: false, error: 'Unauthorized.' };
    }

    const updated = await db.tasks.update(taskId, {
      is_complete: isComplete,
      completed_at: isComplete ? new Date().toISOString() : null,
    });
    if (updated && updated.contact_id) {
      revalidatePath(`/contacts/${updated.contact_id}`);
    }
    revalidatePath('/contacts');
    revalidatePath('/tasks');
    return { success: true, task: updated };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update task.' };
  }
}

/**
 * Creates a task across contacts.
 */
export async function createTask(data: {
  title: string;
  contact_id: string | null;
  due_date: string | null;
  type: string;
}) {
  const user = await getCurrentUser();
  try {
    if (data.contact_id) {
      const contact = await db.contacts.findById(data.contact_id);
      if (!contact || contact.user_id !== user.id) {
        return { success: false, error: 'Unauthorized or contact not found.' };
      }
    }

    const newTask = await db.tasks.insert({
      user_id: user.id,
      contact_id: data.contact_id || null,
      deal_id: null,
      title: data.title,
      due_date: data.due_date || null,
      type: data.type || 'todo',
      is_complete: false,
      completed_at: null,
    });

    if (data.contact_id) {
      revalidatePath(`/contacts/${data.contact_id}`);
    }
    revalidatePath('/tasks');
    revalidatePath('/contacts');
    return { success: true, task: newTask };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create task.' };
  }
}

/**
 * Enrolls a contact in a sequence.
 */
export async function enrollInSequence(contactId: string, sequenceId: string) {
  const user = await getCurrentUser();
  try {
    const contact = await db.contacts.findById(contactId);
    if (!contact || contact.user_id !== user.id) throw new Error('Contact not found or unauthorized.');

    const sequence = await db.emailSequences.findById(sequenceId);
    if (!sequence || sequence.user_id !== user.id) throw new Error('Sequence not found or unauthorized.');

    // Check if already active in this sequence
    const existing = await db.sequenceEnrollments.find(
      se => se.contact_id === contactId && se.sequence_id === sequenceId && se.is_active
    );
    if (existing) {
      throw new Error('Contact is already active in this sequence.');
    }

    const steps = await db.sequenceSteps.list(s => s.sequence_id === sequenceId);
    if (steps.length === 0) {
      throw new Error('This sequence has no steps to schedule.');
    }
    const firstStep = steps.sort((a, b) => a.step_number - b.step_number)[0];

    // Create enrollment
    await db.sequenceEnrollments.insert({
      contact_id: contactId,
      sequence_id: sequenceId,
      enrolled_at: new Date().toISOString(),
      current_step: firstStep.step_number,
      is_active: true,
    });

    // Schedule email
    const delayDays = firstStep.delay_days;
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + delayDays);

    await db.scheduledEmails.insert({
      contact_id: contactId,
      sequence_id: sequenceId,
      step_id: firstStep.id,
      scheduled_at: scheduledDate.toISOString(),
      sent_at: null,
      subject: mergeTemplate(firstStep.subject, contact),
      body: mergeTemplate(firstStep.body, contact),
    });

    revalidatePath(`/contacts/${contactId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to enroll in sequence.' };
  }
}

/**
 * Opts a contact in or out.
 */
export async function optOutContact(contactId: string, isOptedOut: boolean) {
  const user = await getCurrentUser();
  try {
    const contact = await db.contacts.findById(contactId);
    if (!contact || contact.user_id !== user.id) {
      return { success: false, error: 'Unauthorized or contact not found.' };
    }
    await db.contacts.update(contactId, { is_opted_out: isOptedOut });

    if (isOptedOut) {
      // Deactivate all active sequence enrollments
      const enrollments = await db.sequenceEnrollments.list(se => se.contact_id === contactId && se.is_active);
      for (const se of enrollments) {
        await db.sequenceEnrollments.update(se.id, { is_active: false });
      }

      // Cancel scheduled emails that aren't sent yet
      const scheduled = await db.scheduledEmails.list(e => e.contact_id === contactId && e.sent_at === null);
      for (const e of scheduled) {
        await db.scheduledEmails.delete(e.id);
      }
    }

    revalidatePath(`/contacts/${contactId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update opt-out status.' };
  }
}

async function getAppUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  try {
    const headersList = await headers();
    const host = headersList.get('host') || headersList.get('x-forwarded-host');
    const proto = headersList.get('x-forwarded-proto') || 'http';
    if (host) {
      return `${proto}://${host}`;
    }
  } catch {
    // Ignore error when called outside request context (e.g. CLI/cron)
  }
  return 'http://localhost:3000';
}

/**
 * Checks for and sends any scheduled emails that are due (scheduled_at <= now and sent_at is null).
 */
export async function checkAndSendScheduledEmails() {
  try {
    const now = new Date();
    const emails = await db.scheduledEmails.list(
      e => e.sent_at === null && new Date(e.scheduled_at) <= now
    );

    if (emails.length === 0) {
      return { success: true, count: 0 };
    }

    const sentIds = [];
    const appUrl = await getAppUrl();

    for (const email of emails) {
      const contact = await db.contacts.findById(email.contact_id);
      
      // If contact is not found or is opted out, remove/skip the scheduled email
      if (!contact || contact.is_opted_out) {
        await db.scheduledEmails.delete(email.id);
        continue;
      }

      // Append unsubscribe link
      const unsubscribeLink = `\n\n--\nTo unsubscribe, click here: ${appUrl}/unsubscribe?contactId=${contact.id}`;
      const emailBodyWithUnsubscribe = email.body + unsubscribeLink;

      // Mock sending email
      console.log(`[Email Sequence] Sending email to ${contact.email}`);
      console.log(`Subject: ${email.subject}`);
      console.log(`Body: ${emailBodyWithUnsubscribe}`);
      
      if (process.env.RESEND_API_KEY) {
        try {
          const res = await fetch('https://api.resend.com/v1/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
            },
            body: JSON.stringify({
              from: 'SoloCRM <onboarding@resend.dev>',
              to: contact.email,
              subject: email.subject,
              html: emailBodyWithUnsubscribe.replace(/\n/g, '<br />'),
            })
          });
          const result = await res.json();
          console.log('[Resend API Response]:', result);
        } catch (err) {
          console.error('[Resend Error] Falling back to mock:', err);
        }
      }

      // Update email sent_at
      const sentTime = new Date().toISOString();
      await db.scheduledEmails.update(email.id, {
        sent_at: sentTime
      });

      // Progress sequence enrollment
      if (email.sequence_id && email.step_id) {
        const enrollment = await db.sequenceEnrollments.find(
          se => se.contact_id === email.contact_id && se.sequence_id === email.sequence_id && se.is_active
        );

        if (enrollment) {
          const steps = await db.sequenceSteps.list(s => s.sequence_id === email.sequence_id!);
          const sortedSteps = steps.sort((a, b) => a.step_number - b.step_number);
          
          const currentStepIndex = sortedSteps.findIndex(s => s.id === email.step_id);
          const nextStep = sortedSteps[currentStepIndex + 1];

          if (nextStep) {
            // Update enrollment to next step
            await db.sequenceEnrollments.update(enrollment.id, {
              current_step: nextStep.step_number
            });

            // Schedule the next email step
            const delayDays = nextStep.delay_days;
            const scheduledDate = new Date();
            scheduledDate.setDate(scheduledDate.getDate() + delayDays);

            await db.scheduledEmails.insert({
              contact_id: email.contact_id,
              sequence_id: email.sequence_id,
              step_id: nextStep.id,
              scheduled_at: scheduledDate.toISOString(),
              sent_at: null,
              subject: mergeTemplate(nextStep.subject, contact),
              body: mergeTemplate(nextStep.body, contact),
            });
          } else {
            // No more steps, complete sequence enrollment
            await db.sequenceEnrollments.update(enrollment.id, {
              is_active: false
            });
          }
        }
      }

      sentIds.push(email.id);
    }

    return { success: true, count: sentIds.length };
  } catch (error: any) {
    console.error('Error executing checkAndSendScheduledEmails:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Public action to unsubscribe a contact (without authentication check).
 * Verifies that the contact ID exists in the database.
 */
export async function optOutContactPublicAction(contactId: string) {
  try {
    const contact = await db.contacts.findById(contactId);
    if (!contact) {
      return { success: false, error: 'Contact not found.' };
    }

    // Opt out the contact
    await db.contacts.update(contactId, { is_opted_out: true });

    // Deactivate all active sequence enrollments
    const enrollments = await db.sequenceEnrollments.list(se => se.contact_id === contactId && se.is_active);
    for (const se of enrollments) {
      await db.sequenceEnrollments.update(se.id, { is_active: false });
    }

    // Cancel scheduled emails that aren't sent yet
    const scheduled = await db.scheduledEmails.list(e => e.contact_id === contactId && e.sent_at === null);
    for (const e of scheduled) {
      await db.scheduledEmails.delete(e.id);
    }

    revalidatePath(`/contacts/${contactId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to unsubscribe.' };
  }
}
