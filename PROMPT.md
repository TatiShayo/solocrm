You are a senior fullstack engineer. Build SoloCRM — a dead-simple CRM for solopreneurs at $10/mo flat — in this Next.js project. YOLO MODE.

PRODUCT: SoloCRM. HubSpot alternative. $10/mo, nothing gated, no upsells. Features: contacts, pipeline, tasks, email sequences, AI assistant.

READ PLAN.md FIRST. Complete every [ ] task in order. Git commit after each.

DESIGN: Dark theme. Cyan accent #06b6d4. Background #09100f. Surface #0f1a1c. Border #1a2e30. Clean, no-nonsense aesthetic. The anti-enterprise CRM. Fast, readable, frictionless.

KEY IMPLEMENTATIONS:

Kanban pipeline (install dnd-kit: npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities):
  DndContext + SortableContext per column. onDragEnd → update deal.stage_id in Supabase + log move to timeline. Optimistic UI: update locally first, sync to DB in background.

Email sequences (scheduling):
  When contact enrolled in sequence, create scheduled_emails records. scheduled_emails: id, contact_id, sequence_id, step_number, scheduled_at, sent_at, opened_at. A check on dashboard load: SELECT * FROM scheduled_emails WHERE scheduled_at <= now() AND sent_at IS NULL → send via Resend → mark sent.

Merge tags: Replace {{firstName}}, {{lastName}}, {{company}}, {{dealTitle}} before sending. Function: replaceMergeTags(template, contact) → string

KEY DB SCHEMA (create supabase/schema.sql):
  profiles, subscriptions (standard)
  contacts: id, user_id, first_name, last_name, email, phone, company, title, source, tags text[], notes, is_opted_out, created_at
  pipelines: id, user_id, name, is_default
  pipeline_stages: id, pipeline_id, name, order_index, probability, color
  deals: id, user_id, contact_id, pipeline_id, stage_id, title, value, close_date, probability, notes, won_at, lost_at, lost_reason
  deal_timeline: id, deal_id, event_type, description, created_at
  tasks: id, user_id, contact_id, deal_id, title, due_date, type, is_complete, completed_at
  email_sequences: id, user_id, name, is_active
  sequence_steps: id, sequence_id, step_number, delay_days, subject, body
  sequence_enrollments: id, contact_id, sequence_id, enrolled_at, current_step, is_active
  scheduled_emails: id, contact_id, sequence_id, step_id, scheduled_at, sent_at, subject, body

Seed: 1 demo pipeline "Sales Pipeline" with stages (Lead/Contacted/Proposal/Negotiation/Won/Lost), 12 fake contacts, 8 fake deals spread across stages.

NEVER STOP. PLAN.md. First [ ] task. Go.
