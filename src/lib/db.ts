import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

// Path to store JSON database
const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

// Table Interfaces
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  /** scrypt hash — never expose to clients. */
  password_hash?: string | null;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: 'free' | 'pro';
  status: string;
  created_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  title: string | null;
  source: string | null;
  tags: string[];
  notes: string | null;
  is_opted_out: boolean;
  created_at: string;
}

export interface Pipeline {
  id: string;
  user_id: string;
  name: string;
  is_default: boolean;
}

export interface PipelineStage {
  id: string;
  pipeline_id: string;
  name: string;
  order_index: number;
  probability: number;
  color: string | null;
}

export interface Deal {
  id: string;
  user_id: string;
  contact_id: string | null;
  pipeline_id: string;
  stage_id: string;
  title: string;
  value: number;
  close_date: string | null;
  probability: number | null;
  notes: string | null;
  won_at: string | null;
  lost_at: string | null;
  lost_reason: string | null;
}

export interface DealTimeline {
  id: string;
  deal_id: string;
  event_type: string;
  description: string;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  contact_id: string | null;
  deal_id: string | null;
  title: string;
  due_date: string | null;
  type: string; // e.g. 'call', 'email', 'meeting', 'todo'
  is_complete: boolean;
  completed_at: string | null;
}

export interface EmailSequence {
  id: string;
  user_id: string;
  name: string;
  is_active: boolean;
}

export interface SequenceStep {
  id: string;
  sequence_id: string;
  step_number: number;
  delay_days: number;
  subject: string;
  body: string;
}

export interface SequenceEnrollment {
  id: string;
  contact_id: string;
  sequence_id: string;
  enrolled_at: string;
  current_step: number;
  is_active: boolean;
}

export interface ScheduledEmail {
  id: string;
  contact_id: string;
  sequence_id: string | null;
  step_id: string | null;
  scheduled_at: string;
  sent_at: string | null;
  subject: string;
  body: string;
}

// Full Database Schema Interface
export interface DatabaseSchema {
  profiles: Profile[];
  subscriptions: Subscription[];
  contacts: Contact[];
  pipelines: Pipeline[];
  pipeline_stages: PipelineStage[];
  deals: Deal[];
  deal_timeline: DealTimeline[];
  tasks: Task[];
  email_sequences: EmailSequence[];
  sequence_steps: SequenceStep[];
  sequence_enrollments: SequenceEnrollment[];
  scheduled_emails: ScheduledEmail[];
}

// Seed Data
const SEED_DATA: DatabaseSchema = {
  profiles: [
    {
      id: 'default-user',
      email: 'solo@founder.com',
      full_name: 'Solo Founder',
      created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
    }
  ],
  subscriptions: [
    {
      id: 'sub-default',
      user_id: 'default-user',
      plan: 'pro',
      status: 'active',
      created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
    }
  ],
  pipelines: [
    {
      id: 'pipeline-sales',
      user_id: 'default-user',
      name: 'Sales Pipeline',
      is_default: true
    }
  ],
  pipeline_stages: [
    { id: 'stage-lead', pipeline_id: 'pipeline-sales', name: 'Lead', order_index: 0, probability: 10, color: '#3b82f6' },
    { id: 'stage-contacted', pipeline_id: 'pipeline-sales', name: 'Contacted', order_index: 1, probability: 30, color: '#a855f7' },
    { id: 'stage-proposal', pipeline_id: 'pipeline-sales', name: 'Proposal', order_index: 2, probability: 60, color: '#eab308' },
    { id: 'stage-negotiation', pipeline_id: 'pipeline-sales', name: 'Negotiation', order_index: 3, probability: 80, color: '#f97316' },
    { id: 'stage-won', pipeline_id: 'pipeline-sales', name: 'Won', order_index: 4, probability: 100, color: '#22c55e' },
    { id: 'stage-lost', pipeline_id: 'pipeline-sales', name: 'Lost', order_index: 5, probability: 0, color: '#ef4444' }
  ],
  contacts: [
    {
      id: 'contact-1',
      user_id: 'default-user',
      first_name: 'Alice',
      last_name: 'Smith',
      email: 'alice@acme.com',
      phone: '555-0101',
      company: 'Acme Corp',
      title: 'VP of Product',
      source: 'LinkedIn',
      tags: ['Enterprise', 'SaaS'],
      notes: 'Interested in enterprise collaboration features.',
      is_opted_out: false,
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'contact-2',
      user_id: 'default-user',
      first_name: 'Bob',
      last_name: 'Jones',
      email: 'bob@globex.com',
      phone: '555-0102',
      company: 'Globex Inc',
      title: 'Director of IT',
      source: 'Cold Email',
      tags: ['Outbound', 'Tech'],
      notes: 'Follow up in early July.',
      is_opted_out: false,
      created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'contact-3',
      user_id: 'default-user',
      first_name: 'Charlie',
      last_name: 'Brown',
      email: 'charlie@peanuts.com',
      phone: '555-0103',
      company: 'Peanuts Media',
      title: 'Creative Director',
      source: 'Referral',
      tags: ['Media', 'Design'],
      notes: 'Referred by Sally. Looking for a custom plan.',
      is_opted_out: false,
      created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'contact-4',
      user_id: 'default-user',
      first_name: 'Diana',
      last_name: 'Prince',
      email: 'diana@themyscira.org',
      phone: '555-0104',
      company: 'Themyscira Org',
      title: 'CEO',
      source: 'Inbound',
      tags: ['Non-Profit', 'VIP'],
      notes: 'High intent lead. Budget approved.',
      is_opted_out: false,
      created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'contact-5',
      user_id: 'default-user',
      first_name: 'Evan',
      last_name: 'Wright',
      email: 'evan@hooli.xyz',
      phone: '555-0105',
      company: 'Hooli',
      title: 'Software Architect',
      source: 'Website',
      tags: ['SaaS'],
      notes: 'Signed up for trial.',
      is_opted_out: false,
      created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'contact-6',
      user_id: 'default-user',
      first_name: 'Fiona',
      last_name: 'Gallagher',
      email: 'fiona@southside.co',
      phone: '555-0106',
      company: 'Southside Co',
      title: 'Manager',
      source: 'Cold Call',
      tags: ['Retail'],
      notes: 'Price-sensitive but interested.',
      is_opted_out: false,
      created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'contact-7',
      user_id: 'default-user',
      first_name: 'George',
      last_name: 'Costanza',
      email: 'george@vandelay.com',
      phone: '555-0107',
      company: 'Vandelay Industries',
      title: 'Importer/Exporter',
      source: 'Referral',
      tags: ['Late Stage', 'Tech'],
      notes: 'Prefers email communication.',
      is_opted_out: false,
      created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'contact-8',
      user_id: 'default-user',
      first_name: 'Hannah',
      last_name: 'Baker',
      email: 'hannah@liberty.edu',
      phone: '555-0108',
      company: 'Liberty High',
      title: 'Counselor',
      source: 'Website',
      tags: ['Education'],
      notes: 'Inquired through web form.',
      is_opted_out: true,
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'contact-9',
      user_id: 'default-user',
      first_name: 'Ian',
      last_name: 'Malcolm',
      email: 'ian@jurassic.com',
      phone: '555-0109',
      company: 'InGen',
      title: 'Chief Mathematician',
      source: 'LinkedIn',
      tags: ['Consulting'],
      notes: 'Interested in chaos theory analytics.',
      is_opted_out: false,
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'contact-10',
      user_id: 'default-user',
      first_name: 'Julia',
      last_name: 'Roberts',
      email: 'julia@pretty.com',
      phone: '555-0110',
      company: 'Pretty Woman Inc',
      title: 'Partner',
      source: 'Inbound',
      tags: ['VIP'],
      notes: 'Met at networking event.',
      is_opted_out: false,
      created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'contact-11',
      user_id: 'default-user',
      first_name: 'Kevin',
      last_name: 'Malone',
      email: 'kevin@dundermifflin.com',
      phone: '555-0111',
      company: 'Dunder Mifflin',
      title: 'Accountant',
      source: 'Website',
      tags: ['Paper', 'Local'],
      notes: 'Interested in CRM accounting sync.',
      is_opted_out: false,
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'contact-12',
      user_id: 'default-user',
      first_name: 'Laura',
      last_name: 'Palmer',
      email: 'laura@twinpeaks.gov',
      phone: '555-0112',
      company: 'Twin Peaks Co',
      title: 'Coordinator',
      source: 'Cold Call',
      tags: ['Government'],
      notes: 'Hard to reach.',
      is_opted_out: false,
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    }
  ],
  deals: [
    {
      id: 'deal-1',
      user_id: 'default-user',
      contact_id: 'contact-1',
      pipeline_id: 'pipeline-sales',
      stage_id: 'stage-lead',
      title: 'Acme CRM License',
      value: 1500.00,
      close_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      probability: 10,
      notes: 'Initial outreach regarding CRM licenses.',
      won_at: null,
      lost_at: null,
      lost_reason: null
    },
    {
      id: 'deal-2',
      user_id: 'default-user',
      contact_id: 'contact-2',
      pipeline_id: 'pipeline-sales',
      stage_id: 'stage-contacted',
      title: 'Globex Cloud Integration',
      value: 4500.00,
      close_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      probability: 30,
      notes: 'Sent introductory demo links.',
      won_at: null,
      lost_at: null,
      lost_reason: null
    },
    {
      id: 'deal-3',
      user_id: 'default-user',
      contact_id: 'contact-3',
      pipeline_id: 'pipeline-sales',
      stage_id: 'stage-proposal',
      title: 'Peanuts Custom Development',
      value: 8000.00,
      close_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      probability: 60,
      notes: 'Proposal sent. Waiting on approval.',
      won_at: null,
      lost_at: null,
      lost_reason: null
    },
    {
      id: 'deal-4',
      user_id: 'default-user',
      contact_id: 'contact-4',
      pipeline_id: 'pipeline-sales',
      stage_id: 'stage-negotiation',
      title: 'Themyscira Retainer',
      value: 12000.00,
      close_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      probability: 80,
      notes: 'Negotiating discount terms.',
      won_at: null,
      lost_at: null,
      lost_reason: null
    },
    {
      id: 'deal-5',
      user_id: 'default-user',
      contact_id: 'contact-5',
      pipeline_id: 'pipeline-sales',
      stage_id: 'stage-won',
      title: 'Hooli Expansion Deal',
      value: 20000.00,
      close_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      probability: 100,
      notes: 'Expansion approved, contract signed!',
      won_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      lost_at: null,
      lost_reason: null
    },
    {
      id: 'deal-6',
      user_id: 'default-user',
      contact_id: 'contact-6',
      pipeline_id: 'pipeline-sales',
      stage_id: 'stage-lost',
      title: 'Southside Software Setup',
      value: 3000.00,
      close_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      probability: 0,
      notes: 'Decided to go with a cheaper competitor.',
      won_at: null,
      lost_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      lost_reason: 'Budget constraints, chose competitor.'
    },
    {
      id: 'deal-7',
      user_id: 'default-user',
      contact_id: 'contact-7',
      pipeline_id: 'pipeline-sales',
      stage_id: 'stage-lead',
      title: 'Vandelay Latex Sales',
      value: 2500.00,
      close_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      probability: 10,
      notes: 'Warm referral. Need to follow up.',
      won_at: null,
      lost_at: null,
      lost_reason: null
    },
    {
      id: 'deal-8',
      user_id: 'default-user',
      contact_id: 'contact-9',
      pipeline_id: 'pipeline-sales',
      stage_id: 'stage-proposal',
      title: 'InGen Analytics Suite',
      value: 15000.00,
      close_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      probability: 60,
      notes: 'Analytics suite proposal submitted.',
      won_at: null,
      lost_at: null,
      lost_reason: null
    }
  ],
  deal_timeline: [
    {
      id: 'dt-1',
      deal_id: 'deal-1',
      event_type: 'created',
      description: 'Deal was created for Acme CRM License.',
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'dt-2',
      deal_id: 'deal-2',
      event_type: 'created',
      description: 'Deal was created for Globex Cloud Integration.',
      created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'dt-3',
      deal_id: 'deal-3',
      event_type: 'created',
      description: 'Deal was created for Peanuts Custom Development.',
      created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'dt-4',
      deal_id: 'deal-4',
      event_type: 'created',
      description: 'Deal was created for Themyscira Retainer.',
      created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'dt-5',
      deal_id: 'deal-5',
      event_type: 'created',
      description: 'Deal was created for Hooli Expansion Deal.',
      created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'dt-6',
      deal_id: 'deal-5',
      event_type: 'stage_change',
      description: 'Deal moved to Won.',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'dt-7',
      deal_id: 'deal-6',
      event_type: 'created',
      description: 'Deal was created for Southside Software Setup.',
      created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'dt-8',
      deal_id: 'deal-6',
      event_type: 'stage_change',
      description: 'Deal was marked Lost. Reason: Budget constraints, chose competitor.',
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'dt-9',
      deal_id: 'deal-7',
      event_type: 'created',
      description: 'Deal was created for Vandelay Latex Sales.',
      created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'dt-10',
      deal_id: 'deal-8',
      event_type: 'created',
      description: 'Deal was created for InGen Analytics Suite.',
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    }
  ],
  tasks: [],
  email_sequences: [],
  sequence_steps: [],
  sequence_enrollments: [],
  scheduled_emails: []
};

// Queue for serializing read/write file access
class TaskQueue {
  private queue: Promise<any> = Promise.resolve();

  async enqueue<T>(task: () => Promise<T>): Promise<T> {
    const res = new Promise<T>((resolve, reject) => {
      this.queue = this.queue.then(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
    });
    return res;
  }
}

const dbQueue = new TaskQueue();

// In-process read cache. All access is serialized through dbQueue, so this is
// safe: reads reuse the last parsed snapshot instead of re-reading and
// re-parsing the whole JSON file on every query (a read-heavy page previously
// did one disk read + JSON.parse per table access — 5+ per render). Writes
// refresh the cache with the just-persisted data, keeping it authoritative.
let cachedDb: DatabaseSchema | null = null;

async function readDbRaw(): Promise<DatabaseSchema> {
  if (cachedDb) return cachedDb;
  try {
    await fs.mkdir(DB_DIR, { recursive: true });
    try {
      const data = await fs.readFile(DB_FILE, 'utf-8');
      cachedDb = JSON.parse(data) as DatabaseSchema;
      return cachedDb;
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        // File does not exist, write seed data
        await writeDbRaw(SEED_DATA);
        cachedDb = JSON.parse(JSON.stringify(SEED_DATA)) as DatabaseSchema;
        return cachedDb;
      }
      throw err;
    }
  } catch (err) {
    console.error('Failed to read database file:', err);
    throw err;
  }
}

async function writeDbRaw(data: DatabaseSchema): Promise<void> {
  try {
    await fs.mkdir(DB_DIR, { recursive: true });
    const tmpFile = `${DB_FILE}.tmp`;
    await fs.writeFile(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
    await fs.rename(tmpFile, DB_FILE);
    cachedDb = data; // keep the cache authoritative after a successful write
  } catch (err) {
    cachedDb = null; // drop possibly-stale cache on write failure
    console.error('Failed to write database file:', err);
    throw err;
  }
}

class TableAccess<T extends { id: string }> {
  constructor(private tableName: keyof DatabaseSchema) {}

  async list(filter?: (item: T) => boolean): Promise<T[]> {
    return dbQueue.enqueue(async () => {
      const db = await readDbRaw();
      const items = (db[this.tableName] || []) as unknown as T[];
      if (filter) {
        return items.filter(filter);
      }
      return items;
    });
  }

  async find(filter: (item: T) => boolean): Promise<T | null> {
    return dbQueue.enqueue(async () => {
      const db = await readDbRaw();
      const items = (db[this.tableName] || []) as unknown as T[];
      return items.find(filter) || null;
    });
  }

  async findById(id: string): Promise<T | null> {
    return this.find(item => item.id === id);
  }

  async insert(item: Omit<T, 'id' | 'created_at'> & { id?: string; created_at?: string }): Promise<T> {
    return dbQueue.enqueue(async () => {
      const db = await readDbRaw();
      const newItem = {
        id: item.id || randomUUID(),
        created_at: item.created_at || new Date().toISOString(),
        ...item,
      } as unknown as T;

      if (!db[this.tableName]) {
        db[this.tableName] = [] as any;
      }
      (db[this.tableName] as any).push(newItem);
      await writeDbRaw(db);
      return newItem;
    });
  }

  async update(id: string, updates: Partial<T>): Promise<T | null> {
    return dbQueue.enqueue(async () => {
      const db = await readDbRaw();
      const items = db[this.tableName] as any[];
      if (!items) return null;
      const idx = items.findIndex(item => item.id === id);
      if (idx === -1) return null;

      const updated = {
        ...items[idx],
        ...updates,
      };
      items[idx] = updated;
      await writeDbRaw(db);
      return updated;
    });
  }

  async delete(id: string): Promise<boolean> {
    return dbQueue.enqueue(async () => {
      const db = await readDbRaw();
      const items = db[this.tableName] as any[];
      if (!items) return false;
      const idx = items.findIndex(item => item.id === id);
      if (idx === -1) return false;

      items.splice(idx, 1);
      await writeDbRaw(db);
      return true;
    });
  }
}

// Database exports for all tables
export const db = {
  profiles: new TableAccess<Profile>('profiles'),
  subscriptions: new TableAccess<Subscription>('subscriptions'),
  contacts: new TableAccess<Contact>('contacts'),
  pipelines: new TableAccess<Pipeline>('pipelines'),
  pipelineStages: new TableAccess<PipelineStage>('pipeline_stages'),
  deals: new TableAccess<Deal>('deals'),
  dealTimeline: new TableAccess<DealTimeline>('deal_timeline'),
  tasks: new TableAccess<Task>('tasks'),
  emailSequences: new TableAccess<EmailSequence>('email_sequences'),
  sequenceSteps: new TableAccess<SequenceStep>('sequence_steps'),
  sequenceEnrollments: new TableAccess<SequenceEnrollment>('sequence_enrollments'),
  scheduledEmails: new TableAccess<ScheduledEmail>('scheduled_emails'),
  
  // Direct helper to read full database or reset/seed (useful for testing or custom aggregations)
  readRaw: () => dbQueue.enqueue(async () => readDbRaw()),
  writeRaw: (data: DatabaseSchema) => dbQueue.enqueue(async () => writeDbRaw(data)),
  reset: () => dbQueue.enqueue(async () => {
    // Clone so seeded writes/inserts never mutate the shared SEED_DATA constant.
    await writeDbRaw(JSON.parse(JSON.stringify(SEED_DATA)) as DatabaseSchema);
  })
};
