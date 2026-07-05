'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  DollarSign,
  Edit2,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Send,
  Trash2,
  User,
  X,
  Check,
  Loader2,
  AlertCircle,
  ChevronRight,
  TrendingUp,
  MailOpen,
  Info,
  Sparkles
} from 'lucide-react';
import { Contact, Deal, Task, SequenceEnrollment, ScheduledEmail, EmailSequence, PipelineStage } from '@/lib/db';
import {
  updateContact,
  deleteContact,
  createDealForContact,
  addTaskForContact,
  toggleTaskComplete,
  enrollInSequence,
  optOutContact
} from '@/app/actions/contacts';
import { generateEmailDraftAction } from '@/app/actions/deals';

interface TimelineEvent {
  id: string;
  type: 'contact_created' | 'deal_created' | 'task_created' | 'task_completed' | 'sequence_enrolled' | 'email_scheduled' | 'email_sent';
  title: string;
  description: string;
  date: string;
}

interface ContactDetailClientProps {
  contact: Contact;
  deals: Deal[];
  tasks: Task[];
  enrollments: SequenceEnrollment[];
  scheduledEmails: ScheduledEmail[];
  sequences: EmailSequence[];
  pipelineStages: PipelineStage[];
  timelineEvents: TimelineEvent[];
}

export default function ContactDetailClient({
  contact,
  deals: initialDeals,
  tasks: initialTasks,
  enrollments: initialEnrollments,
  scheduledEmails: initialScheduledEmails,
  sequences,
  pipelineStages,
  timelineEvents: initialTimelineEvents,
}: ContactDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: contact.first_name || '',
    last_name: contact.last_name || '',
    email: contact.email || '',
    phone: contact.phone || '',
    company: contact.company || '',
    title: contact.title || '',
    source: contact.source || '',
    tags: contact.tags ? contact.tags.join(', ') : '',
    notes: contact.notes || '',
  });
  const [editError, setEditError] = useState<string | null>(null);

  // Modal states
  const [dealModalOpen, setDealModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);

  // New Deal state
  const [dealTitle, setDealTitle] = useState('');
  const [dealValue, setDealValue] = useState('');
  const [dealStage, setDealStage] = useState(pipelineStages[0]?.id || '');
  const [dealCloseDate, setDealCloseDate] = useState('');
  const [dealNotes, setDealNotes] = useState('');
  const [dealError, setDealError] = useState<string | null>(null);

  // New Task state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskType, setTaskType] = useState('todo');
  const [taskError, setTaskError] = useState<string | null>(null);

  // Sequence Enrollment state
  const [selectedSequenceId, setSelectedSequenceId] = useState('');
  const [sequenceError, setSequenceError] = useState<string | null>(null);

  // AI Email Draft State
  const [aiDraftPrompt, setAiDraftPrompt] = useState('');
  const [isAiDraftLoading, setIsAiDraftLoading] = useState(false);
  const [aiDraftResult, setAiDraftResult] = useState<{ subject: string; body: string } | null>(null);

  const handleGenerateEmailDraft = async () => {
    setIsAiDraftLoading(true);
    try {
      const res = await generateEmailDraftAction(contact.id, aiDraftPrompt);
      setAiDraftResult(res);
    } catch (err) {
      alert('Failed to generate email draft.');
    } finally {
      setIsAiDraftLoading(false);
    }
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    const tagsArray = editForm.tags
      .split(',')
      .map(t => t.trim())
      .filter(t => t !== '');

    const res = await updateContact(contact.id, {
      first_name: editForm.first_name,
      last_name: editForm.last_name,
      email: editForm.email,
      phone: editForm.phone,
      company: editForm.company,
      title: editForm.title,
      source: editForm.source,
      tags: tagsArray,
      notes: editForm.notes,
    });

    if (res.success) {
      setIsEditing(false);
      router.refresh();
    } else {
      setEditError(res.error || 'Failed to update contact.');
    }
  };

  // Handle Delete Contact
  const handleDelete = async () => {
    if (confirm('Are you sure you want to permanently delete this contact and all associated tasks?')) {
      const res = await deleteContact(contact.id);
      if (res.success) {
        router.push('/contacts');
        router.refresh();
      } else {
        alert(res.error || 'Failed to delete contact.');
      }
    }
  };

  // Handle Create Deal
  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    setDealError(null);
    if (!dealTitle || !dealValue) {
      setDealError('Please fill in required fields.');
      return;
    }

    const res = await createDealForContact({
      contact_id: contact.id,
      title: dealTitle,
      value: Number(dealValue),
      stage_id: dealStage,
      close_date: dealCloseDate || undefined,
      notes: dealNotes || undefined,
    });

    if (res.success) {
      setDealTitle('');
      setDealValue('');
      setDealCloseDate('');
      setDealNotes('');
      setDealModalOpen(false);
      router.refresh();
    } else {
      setDealError(res.error || 'Failed to create deal.');
    }
  };

  // Handle Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setTaskError(null);
    if (!taskTitle) {
      setTaskError('Please enter a task title.');
      return;
    }

    const res = await addTaskForContact({
      contact_id: contact.id,
      title: taskTitle,
      due_date: taskDueDate || undefined,
      type: taskType,
    });

    if (res.success) {
      setTaskTitle('');
      setTaskDueDate('');
      setTaskType('todo');
      setTaskModalOpen(false);
      router.refresh();
    } else {
      setTaskError(res.error || 'Failed to create task.');
    }
  };

  // Handle Toggle Task
  const handleToggleTask = async (taskId: string, currentStatus: boolean) => {
    const res = await toggleTaskComplete(taskId, !currentStatus);
    if (res.success) {
      router.refresh();
    } else {
      alert('Failed to update task.');
    }
  };

  // Handle Sequence Enrollment
  const handleEnroll = async () => {
    setSequenceError(null);
    if (!selectedSequenceId) return;

    const res = await enrollInSequence(contact.id, selectedSequenceId);
    if (res.success) {
      setSelectedSequenceId('');
      router.refresh();
    } else {
      setSequenceError(res.error || 'Failed to enroll contact.');
    }
  };

  // Handle Opt Out Toggle
  const handleOptOutToggle = async (newVal: boolean) => {
    if (confirm(newVal ? 'Opt-out this contact? They will be removed from all active email sequences.' : 'Opt this contact back in?')) {
      const res = await optOutContact(contact.id, newVal);
      if (res.success) {
        router.refresh();
      } else {
        alert('Failed to update opt-out status.');
      }
    }
  };

  // Active Enrollments Helper
  const activeEnrollments = initialEnrollments.filter(e => e.is_active);

  return (
    <div className="space-y-6">
      {/* Back link & Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          href="/contacts"
          className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" /> Back to Contacts
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-2 bg-[#0f1a1c] hover:bg-[#1a2e30] border border-[#1a2e30] text-neutral-200 px-4 py-2.5 rounded-xl font-medium text-sm transition-all cursor-pointer"
          >
            <Edit2 className="w-4 h-4" /> {isEditing ? 'Cancel Edit' : 'Edit Contact'}
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 bg-red-950/20 hover:bg-red-950/40 border border-red-900/40 hover:border-red-900/80 text-red-400 px-4 py-2.5 rounded-xl font-medium text-sm transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>

      {/* Grid: 2 columns (Left: Details/Forms/Timeline, Right: Deals/Tasks/Sequences) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (2/3 width on large screens) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card: Basic Info / Edit Form */}
          <div className="bg-[#0f1a1c] border border-[#1a2e30] rounded-2xl p-6 shadow-xl">
            {isEditing ? (
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <h3 className="text-lg font-bold text-white mb-4">Edit Contact Details</h3>
                {editError && (
                  <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-xl text-red-400 text-xs">
                    {editError}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">First Name</label>
                    <input
                      type="text"
                      required
                      value={editForm.first_name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, first_name: e.target.value }))}
                      className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2 px-3 text-white text-sm outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Last Name</label>
                    <input
                      type="text"
                      required
                      value={editForm.last_name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, last_name: e.target.value }))}
                      className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2 px-3 text-white text-sm outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Email</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2 px-3 text-white text-sm outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Phone</label>
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2 px-3 text-white text-sm outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Company</label>
                    <input
                      type="text"
                      value={editForm.company}
                      onChange={(e) => setEditForm(prev => ({ ...prev, company: e.target.value }))}
                      className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2 px-3 text-white text-sm outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Job Title</label>
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2 px-3 text-white text-sm outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Source</label>
                    <input
                      type="text"
                      value={editForm.source}
                      onChange={(e) => setEditForm(prev => ({ ...prev, source: e.target.value }))}
                      className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2 px-3 text-white text-sm outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Tags (Comma-separated)</label>
                    <input
                      type="text"
                      value={editForm.tags}
                      onChange={(e) => setEditForm(prev => ({ ...prev, tags: e.target.value }))}
                      className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2 px-3 text-white text-sm outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Notes</label>
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={4}
                    className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2 px-3 text-white text-sm outline-none transition-colors resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="bg-transparent border border-[#1a2e30] hover:bg-[#1a2e30] text-neutral-300 px-4 py-2 rounded-xl text-sm transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-[#06b6d4] hover:bg-[#0891b2] text-[#09100f] font-bold px-5 py-2 rounded-xl text-sm transition-colors cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                {/* Header Profile Name */}
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-full bg-[#1a2e30] flex items-center justify-center text-3xl font-bold text-[#06b6d4] border border-[#06b6d4]/10">
                    {contact.first_name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-2xl font-extrabold text-white">
                      {contact.first_name} {contact.last_name}
                    </h2>
                    <p className="text-sm text-neutral-400 flex items-center gap-1.5 mt-1">
                      {contact.title && <span>{contact.title}</span>}
                      {contact.title && contact.company && <span className="text-neutral-600">•</span>}
                      {contact.company && <span className="text-neutral-300">{contact.company}</span>}
                    </p>
                    {contact.is_opted_out && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-950/30 border border-red-900/40 text-red-400 text-xs mt-2 font-medium">
                        <AlertCircle className="w-3 h-3" /> Opted Out of Emails
                      </span>
                    )}
                  </div>
                </div>

                {/* Details Table */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-[#1a2e30] pt-6">
                  <div className="space-y-1">
                    <p className="text-xs text-neutral-500 uppercase font-semibold">Email Address</p>
                    <p className="text-sm text-white flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-neutral-500" />
                      {contact.email || <span className="text-neutral-600">No email</span>}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-neutral-500 uppercase font-semibold">Phone Number</p>
                    <p className="text-sm text-white flex items-center gap-1.5">
                      <Phone className="w-4 h-4 text-neutral-500" />
                      {contact.phone || <span className="text-neutral-600">No phone</span>}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-neutral-500 uppercase font-semibold">Lead Source</p>
                    <p className="text-sm text-white">{contact.source || 'Manual'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-neutral-500 uppercase font-semibold">Date Created</p>
                    <p className="text-sm text-white flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-neutral-500" />
                      {new Date(contact.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <p className="text-xs text-neutral-500 uppercase font-semibold mb-2">Segment Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {contact.tags && contact.tags.length > 0 ? (
                      contact.tags.map(t => (
                        <span
                          key={t}
                          className="px-2.5 py-0.5 rounded-lg text-xs bg-[#06b6d4]/10 text-[#06b6d4] border border-[#06b6d4]/20"
                        >
                          {t}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-neutral-500 italic">No tags associated</span>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {contact.notes && (
                  <div className="bg-[#09100f] border border-[#1a2e30] p-4 rounded-xl">
                    <p className="text-xs text-neutral-500 uppercase font-semibold mb-2.5">Notes & Context</p>
                    <p className="text-sm text-neutral-300 whitespace-pre-line">{contact.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Activity Timeline Section */}
          <div className="bg-[#0f1a1c] border border-[#1a2e30] rounded-2xl p-6 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-6">Activity Timeline</h3>
            <div className="space-y-6 relative before:absolute before:inset-y-0 before:left-3.5 before:w-0.5 before:bg-[#1a2e30]">
              {initialTimelineEvents.map(event => {
                const getEventColors = (type: TimelineEvent['type']) => {
                  switch (type) {
                    case 'contact_created':
                      return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                    case 'deal_created':
                      return 'bg-green-500/10 text-green-400 border-green-500/20';
                    case 'task_created':
                      return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
                    case 'task_completed':
                      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                    case 'sequence_enrolled':
                      return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
                    case 'email_sent':
                      return 'bg-[#06b6d4]/10 text-[#06b6d4] border-[#06b6d4]/20';
                    case 'email_scheduled':
                      return 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20';
                    default:
                      return 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20';
                  }
                };

                return (
                  <div key={event.id} className="relative pl-8 group">
                    {/* Circle Indicator */}
                    <div className="absolute left-1.5 top-1.5 w-4 h-4 rounded-full border-2 border-[#09100f] bg-[#0f1a1c] group-hover:scale-110 transition-transform">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#1a2e30] mx-auto my-0.5"></div>
                    </div>
                    
                    {/* Event Card */}
                    <div className="bg-[#09100f] border border-[#1a2e30] p-4 rounded-xl space-y-1">
                      <div className="flex justify-between items-start gap-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${getEventColors(event.type)}`}>
                          {event.title}
                        </span>
                        <span className="text-[10px] text-neutral-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(event.date).toLocaleDateString()} {new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-300 mt-1">{event.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Column (1/3 width on large screens) */}
        <div className="space-y-6">

          {/* Card: Linked Deals */}
          <div className="bg-[#0f1a1c] border border-[#1a2e30] rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-md flex items-center gap-2">
                <TrendingUp className="w-4.5 h-4.5 text-[#06b6d4]" /> Linked Deals
              </h3>
              <button
                onClick={() => setDealModalOpen(true)}
                className="text-xs text-[#06b6d4] hover:text-[#0891b2] font-semibold flex items-center gap-0.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Deal
              </button>
            </div>

            <div className="space-y-2">
              {initialDeals.length === 0 ? (
                <p className="text-xs text-neutral-500 italic py-2">No deals linked to this contact.</p>
              ) : (
                initialDeals.map(deal => (
                  <div
                    key={deal.id}
                    className="p-3 bg-[#09100f] border border-[#1a2e30] rounded-xl flex items-center justify-between hover:border-[#06b6d4]/40 transition-colors"
                  >
                    <div>
                      {/* We link to /pipeline because that's where deals are managed */}
                      <Link href={`/pipeline?dealId=${deal.id}`} className="text-sm font-semibold text-white hover:text-[#06b6d4] transition-colors block">
                        {deal.title}
                      </Link>
                      <span className="text-[10px] text-neutral-500 uppercase">
                        {pipelineStages.find(s => s.id === deal.stage_id)?.name || 'Stage'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-sm text-[#06b6d4]">
                        ${deal.value.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Card: Tasks Checklist */}
          <div className="bg-[#0f1a1c] border border-[#1a2e30] rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-md flex items-center gap-2">
                <CheckCircle2 className="w-4.5 h-4.5 text-[#06b6d4]" /> Tasks Checklist
              </h3>
              <button
                onClick={() => setTaskModalOpen(true)}
                className="text-xs text-[#06b6d4] hover:text-[#0891b2] font-semibold flex items-center gap-0.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Task
              </button>
            </div>

            <div className="space-y-2.5">
              {initialTasks.length === 0 ? (
                <p className="text-xs text-neutral-500 italic py-2">No tasks created for this contact.</p>
              ) : (
                initialTasks.map(task => (
                  <div
                    key={task.id}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border transition-colors ${
                      task.is_complete
                        ? 'bg-[#09100f]/40 border-[#1a2e30] opacity-60'
                        : 'bg-[#09100f] border-[#1a2e30] hover:border-[#1a2e30]*1.5'
                    }`}
                  >
                    <button
                      onClick={() => handleToggleTask(task.id, task.is_complete)}
                      className="mt-0.5 text-neutral-500 hover:text-[#06b6d4] transition-colors"
                    >
                      {task.is_complete ? (
                        <CheckCircle2 className="w-4.5 h-4.5 text-[#06b6d4]" />
                      ) : (
                        <Circle className="w-4.5 h-4.5" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium text-white break-words ${task.is_complete ? 'line-through text-neutral-500' : ''}`}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400">
                          {task.type}
                        </span>
                        {task.due_date && (
                          <span className="text-[9px] text-neutral-500 flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" /> Due {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Card: Email Sequence Enrollment */}
          <div className="bg-[#0f1a1c] border border-[#1a2e30] rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-white text-md flex items-center gap-2">
              <MailOpen className="w-4.5 h-4.5 text-[#06b6d4]" /> Email Sequences
            </h3>

            {/* Opt-out Controls */}
            <div className="bg-[#09100f] p-3 border border-[#1a2e30] rounded-xl flex items-center justify-between text-xs">
              <span className="text-neutral-300">Opt-out / Opt-in status:</span>
              <button
                onClick={() => handleOptOutToggle(!contact.is_opted_out)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                  contact.is_opted_out
                    ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-900/40 hover:bg-emerald-900/20'
                    : 'bg-red-950/20 text-red-400 border border-red-900/30 hover:bg-red-950/40'
                }`}
              >
                {contact.is_opted_out ? 'Opt In Contact' : 'Opt Out Contact'}
              </button>
            </div>

            {/* Sequence Enrollment form if not opted out */}
            {!contact.is_opted_out ? (
              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-400 uppercase">Enroll in Sequence</label>
                  <div className="flex gap-2">
                    <select
                      value={selectedSequenceId}
                      onChange={(e) => setSelectedSequenceId(e.target.value)}
                      className="flex-1 bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2 px-3 text-white text-xs outline-none cursor-pointer"
                    >
                      <option value="">Select a sequence...</option>
                      {sequences.map(seq => (
                        <option key={seq.id} value={seq.id}>{seq.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleEnroll}
                      disabled={!selectedSequenceId}
                      className="bg-[#06b6d4] hover:bg-[#0891b2] disabled:opacity-50 text-[#09100f] px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" /> Enroll
                    </button>
                  </div>
                  {sequenceError && <p className="text-[10px] text-red-400">{sequenceError}</p>}
                </div>

                {/* List Active Sequences */}
                <div className="space-y-2 mt-4">
                  <p className="text-xs font-semibold text-neutral-400 uppercase">Active Enrollments</p>
                  {activeEnrollments.length === 0 ? (
                    <p className="text-xs text-neutral-500 italic">Not enrolled in any active sequence.</p>
                  ) : (
                    activeEnrollments.map(enrollment => {
                      const seq = sequences.find(s => s.id === enrollment.sequence_id);
                      return (
                        <div key={enrollment.id} className="p-3 bg-[#09100f] border border-[#1a2e30] rounded-xl text-xs space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-white">{seq?.name || 'Sequence'}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#06b6d4]/10 text-[#06b6d4]">Active</span>
                          </div>
                          <p className="text-[10px] text-neutral-400">
                            Enrolled on {new Date(enrollment.enrolled_at).toLocaleDateString()}
                          </p>
                          <p className="text-[10px] text-neutral-300">
                            Current step: <strong className="text-white">Step {enrollment.current_step}</strong>
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-red-950/15 border border-red-900/30 rounded-xl text-xs text-red-400 flex items-start gap-2">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>This contact is opted out of emails. Opt them back in to enroll them in email sequences.</p>
              </div>
            )}
          </div>

          {/* Card: AI Email Draft Assistant */}
          <div className="bg-[#0f1a1c] border border-[#1a2e30] rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-white text-md flex items-center gap-2">
              <Sparkles className="w-4.5 h-4.5 text-[#06b6d4]" /> AI Email Draft Assistant
            </h3>
            
            <div className="space-y-3">
              <p className="text-xs text-neutral-400">
                Provide instructions/guidelines, and the AI will draft a personalized email for this contact.
              </p>
              
              <textarea
                placeholder="e.g. Write a friendly follow-up email about their product interest..."
                value={aiDraftPrompt}
                onChange={(e) => setAiDraftPrompt(e.target.value)}
                rows={3}
                className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2 px-3 text-white text-xs outline-none transition-colors resize-none font-sans"
              />
              
              <button
                onClick={handleGenerateEmailDraft}
                disabled={isAiDraftLoading || !aiDraftPrompt.trim()}
                className="w-full bg-[#06b6d4] hover:bg-[#0891b2] disabled:opacity-50 text-[#09100f] py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isAiDraftLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Drafting...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" /> Draft Email
                  </>
                )}
              </button>

              {aiDraftResult && (
                <div className="space-y-2 mt-3 bg-[#09100f] p-3 border border-[#1a2e30] rounded-xl text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] text-neutral-500 font-bold uppercase">Subject</span>
                    <p className="text-white font-semibold">{aiDraftResult.subject}</p>
                  </div>
                  <div className="space-y-1 border-t border-[#1a2e30] pt-2">
                    <span className="text-[10px] text-neutral-500 font-bold uppercase">Body</span>
                    <p className="text-neutral-300 whitespace-pre-wrap leading-relaxed">{aiDraftResult.body}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Add Deal Modal */}
      {dealModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-[#09100f]/80 backdrop-blur-sm" onClick={() => setDealModalOpen(false)}></div>
          <div className="relative w-full max-w-md bg-[#0f1a1c] border border-[#1a2e30] rounded-2xl shadow-2xl p-6">
            <button
              onClick={() => setDealModalOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-lg border border-[#1a2e30]"
            >
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#06b6d4]" /> Add Deal for Contact
            </h2>

            {dealError && (
              <div className="mb-4 p-3 bg-red-950/40 border border-red-900/50 rounded-xl text-red-400 text-xs">
                {dealError}
              </div>
            )}

            <form onSubmit={handleCreateDeal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Deal Title *</label>
                <input
                  type="text"
                  required
                  value={dealTitle}
                  onChange={(e) => setDealTitle(e.target.value)}
                  className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2 px-3 text-white text-sm outline-none transition-colors"
                  placeholder="e.g. Acme CRM Expansion"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Value ($) *</label>
                  <input
                    type="number"
                    required
                    value={dealValue}
                    onChange={(e) => setDealValue(e.target.value)}
                    className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2 px-3 text-white text-sm outline-none transition-colors"
                    placeholder="5000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Initial Stage</label>
                  <select
                    value={dealStage}
                    onChange={(e) => setDealStage(e.target.value)}
                    className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2 px-3 text-white text-sm outline-none transition-colors cursor-pointer"
                  >
                    {pipelineStages.map(stage => (
                      <option key={stage.id} value={stage.id}>{stage.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Expected Close Date</label>
                <input
                  type="date"
                  value={dealCloseDate}
                  onChange={(e) => setDealCloseDate(e.target.value)}
                  className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2 px-3 text-white text-sm outline-none transition-colors cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Notes</label>
                <textarea
                  value={dealNotes}
                  onChange={(e) => setDealNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2 px-3 text-white text-sm outline-none transition-colors resize-none"
                  placeholder="Notes about the deal opportunity..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setDealModalOpen(false)}
                  className="bg-transparent border border-[#1a2e30] hover:bg-[#1a2e30] text-neutral-300 px-4 py-2 rounded-xl text-sm transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#06b6d4] hover:bg-[#0891b2] text-[#09100f] font-bold px-5 py-2 rounded-xl text-sm transition-colors cursor-pointer"
                >
                  Add Deal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {taskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-[#09100f]/80 backdrop-blur-sm" onClick={() => setTaskModalOpen(false)}></div>
          <div className="relative w-full max-w-md bg-[#0f1a1c] border border-[#1a2e30] rounded-2xl shadow-2xl p-6">
            <button
              onClick={() => setTaskModalOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-lg border border-[#1a2e30]"
            >
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#06b6d4]" /> Add Task for Contact
            </h2>

            {taskError && (
              <div className="mb-4 p-3 bg-red-950/40 border border-red-900/50 rounded-xl text-red-400 text-xs">
                {taskError}
              </div>
            )}

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Task Title *</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2 px-3 text-white text-sm outline-none transition-colors"
                  placeholder="e.g. Schedule introductory call"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Task Type</label>
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value)}
                    className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2 px-3 text-white text-sm outline-none transition-colors cursor-pointer"
                  >
                    <option value="todo">To Do</option>
                    <option value="call">Call</option>
                    <option value="email">Email</option>
                    <option value="meeting">Meeting</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Due Date</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2 px-3 text-white text-sm outline-none transition-colors cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setTaskModalOpen(false)}
                  className="bg-transparent border border-[#1a2e30] hover:bg-[#1a2e30] text-neutral-300 px-4 py-2 rounded-xl text-sm transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#06b6d4] hover:bg-[#0891b2] text-[#09100f] font-bold px-5 py-2 rounded-xl text-sm transition-colors cursor-pointer"
                >
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
