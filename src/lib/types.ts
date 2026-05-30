export interface Contact {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  title: string | null;
  source: "cold" | "referral" | "inbound" | null;
  tags: string[] | null;
  notes: string | null;
  meeting_notes: string | null;
  is_opted_out: boolean;
  created_at: string;
  updated_at: string;
}

export interface Deal {
  id: string;
  user_id: string;
  contact_id: string;
  title: string;
  value: number;
  probability: number;
  stage_id: string;
  close_date: string | null;
  notes: string | null;
  status: "open" | "won" | "lost";
  lost_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Pipeline {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface Stage {
  id: string;
  pipeline_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  contact_id: string | null;
  deal_id: string | null;
  title: string;
  type: "call" | "email" | "meeting" | "follow-up";
  due_date: string;
  completed: boolean;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  user_id: string;
  contact_id: string | null;
  deal_id: string | null;
  type: "note" | "email" | "call" | "task_completed" | "deal_change" | "contact_created" | "contact_updated";
  description: string;
  created_at: string;
}

export interface Sequence {
  id: string;
  user_id: string;
  name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SequenceStep {
  id: string;
  sequence_id: string;
  sort_order: number;
  delay_days: number;
  subject: string;
  body: string;
  created_at: string;
}

export interface SequenceEnrollment {
  id: string;
  sequence_id: string;
  contact_id: string;
  user_id: string;
  current_step: number;
  active: boolean;
  enrolled_at: string;
  completed_at: string | null;
}

export interface ScheduledEmail {
  id: string;
  user_id: string;
  contact_id: string;
  sequence_id: string;
  enrollment_id: string;
  step_id: string;
  subject: string;
  body: string;
  scheduled_at: string;
  sent_at: string | null;
  created_at: string;
}
