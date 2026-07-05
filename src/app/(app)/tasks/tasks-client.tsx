'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CheckSquare,
  Square,
  Calendar,
  Phone,
  Mail,
  Users,
  AlertCircle,
  Plus,
  X,
  Clock,
  Briefcase,
  CheckCircle2,
} from 'lucide-react';
import { Task, Contact } from '@/lib/db';
import { toggleTaskComplete, createTask } from '@/app/actions/contacts';

interface TasksClientProps {
  initialTasks: Task[];
  contacts: Contact[];
}

export default function TasksClient({ initialTasks, contacts }: TasksClientProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [isPending, startTransition] = useTransition();

  // Filter States
  const [statusFilter, setStatusFilter] = useState<'pending' | 'completed' | 'all'>('pending');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'due_date_asc' | 'due_date_desc'>('due_date_asc');

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Task Form State
  const [form, setForm] = useState({
    title: '',
    contact_id: '',
    due_date: '',
    type: 'todo',
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Toggle Completion
  const handleToggle = async (task: Task) => {
    const originalTasks = [...tasks];
    const newStatus = !task.is_complete;

    // Optimistic Update
    setTasks(prev =>
      prev.map(t =>
        t.id === task.id
          ? {
              ...t,
              is_complete: newStatus,
              completed_at: newStatus ? new Date().toISOString() : null,
            }
          : t
      )
    );

    const res = await toggleTaskComplete(task.id, newStatus);
    if (res.success) {
      router.refresh();
    } else {
      // Revert on failure
      setTasks(originalTasks);
      alert('Failed to update task.');
    }
  };

  // Create Task
  const handleCreateTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.title) {
      setFormError('Task title is required.');
      return;
    }

    const res = await createTask({
      title: form.title,
      contact_id: form.contact_id || null,
      due_date: form.due_date || null,
      type: form.type,
    });

    if (res.success && res.task) {
      setTasks(prev => [...prev, res.task!]);
      setForm({
        title: '',
        contact_id: '',
        due_date: '',
        type: 'todo',
      });
      setIsAddModalOpen(false);
      router.refresh();
    } else {
      setFormError(res.error || 'Failed to create task.');
    }
  };

  // Helper: check if overdue
  const isOverdue = (task: Task) => {
    if (task.is_complete || !task.due_date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(task.due_date);
    due.setHours(0, 0, 0, 0);
    return due < today;
  };

  // Filter & Sort logic
  const filteredTasks = tasks
    .filter(t => {
      // Status filter
      if (statusFilter === 'pending') return !t.is_complete;
      if (statusFilter === 'completed') return t.is_complete;
      return true;
    })
    .filter(t => {
      // Type filter
      if (typeFilter === 'all') return true;
      return t.type === typeFilter;
    })
    .sort((a, b) => {
      // Sort logic (null dates go to the bottom)
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      const dateA = new Date(a.due_date).getTime();
      const dateB = new Date(b.due_date).getTime();
      return sortBy === 'due_date_asc' ? dateA - dateB : dateB - dateA;
    });

  // Type Helpers
  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'call':
        return <Phone className="w-3.5 h-3.5" />;
      case 'email':
        return <Mail className="w-3.5 h-3.5" />;
      case 'meeting':
        return <Users className="w-3.5 h-3.5" />;
      default:
        return <CheckCircle2 className="w-3.5 h-3.5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'call':
        return 'text-blue-400 bg-blue-950/30 border-blue-900/40';
      case 'email':
        return 'text-purple-400 bg-purple-950/30 border-purple-900/40';
      case 'meeting':
        return 'text-yellow-400 bg-yellow-950/30 border-yellow-900/40';
      default:
        return 'text-[#06b6d4] bg-[#06b6d4]/10 border-[#06b6d4]/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Tasks & Follow-Ups</h1>
          <p className="text-neutral-400 text-sm mt-1">
            Keep track of your actions and stay on top of outreach.
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 bg-[#06b6d4] hover:bg-[#0891b2] text-[#09100f] px-4 py-2.5 rounded-xl font-bold text-sm transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Task
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-[#0f1a1c] border border-[#1a2e30] p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex bg-[#09100f] p-1 rounded-xl border border-[#1a2e30] self-start">
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'pending' ? 'bg-[#06b6d4] text-[#09100f]' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'completed' ? 'bg-[#06b6d4] text-[#09100f]' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Completed
          </button>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'all' ? 'bg-[#06b6d4] text-[#09100f]' : 'text-neutral-400 hover:text-white'
            }`}
          >
            All
          </button>
        </div>

        {/* Search/Sort Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Type Filter */}
          <div className="flex items-center gap-2 bg-[#09100f] border border-[#1a2e30] px-3 py-1.5 rounded-xl text-xs text-neutral-300">
            <span className="text-neutral-500 font-medium">Type:</span>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="bg-transparent border-none outline-none text-white cursor-pointer font-semibold"
            >
              <option value="all">All Types</option>
              <option value="todo">To-Do</option>
              <option value="call">Call</option>
              <option value="email">Email</option>
              <option value="meeting">Meeting</option>
            </select>
          </div>

          {/* Date Sorting */}
          <div className="flex items-center gap-2 bg-[#09100f] border border-[#1a2e30] px-3 py-1.5 rounded-xl text-xs text-neutral-300">
            <span className="text-neutral-500 font-medium">Sort:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-transparent border-none outline-none text-white cursor-pointer font-semibold"
            >
              <option value="due_date_asc">Due Date (Oldest First)</option>
              <option value="due_date_desc">Due Date (Newest First)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="bg-[#0f1a1c] border border-[#1a2e30] rounded-2xl overflow-hidden shadow-xl">
        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
            <p className="text-neutral-400 text-sm">No tasks found matching your filters.</p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-4 text-xs font-semibold text-[#06b6d4] hover:underline cursor-pointer"
            >
              Create a task
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#1a2e30]">
            {filteredTasks.map(task => {
              const contact = contacts.find(c => c.id === task.contact_id);
              const contactName = contact ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim() : null;
              const overdue = isOverdue(task);

              return (
                <div
                  key={task.id}
                  className={`p-4 sm:p-5 flex items-center justify-between gap-4 transition-colors hover:bg-[#132224]/30 ${
                    task.is_complete ? 'opacity-65' : ''
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Checkbox */}
                    <button
                      onClick={() => handleToggle(task)}
                      className="text-neutral-500 hover:text-white transition-colors cursor-pointer flex-shrink-0"
                    >
                      {task.is_complete ? (
                        <CheckSquare className="w-5 h-5 text-[#06b6d4]" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>

                    {/* Title & Contact Details */}
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-semibold text-white leading-tight ${
                          task.is_complete ? 'line-through text-neutral-500' : ''
                        }`}
                      >
                        {task.title}
                      </p>
                      {contactName && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] text-neutral-500">Linked Contact:</span>
                          <Link
                            href={`/contacts/${task.contact_id}`}
                            className="text-[10px] text-[#06b6d4] hover:underline font-medium"
                          >
                            {contactName}
                          </Link>
                          {contact?.company && (
                            <span className="text-[10px] text-neutral-500 font-mono">
                              ({contact.company})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Badges / Dates */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Overdue Badge */}
                    {overdue && (
                      <span className="hidden sm:inline-flex items-center gap-1 bg-red-950/40 text-red-400 border border-red-900/50 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        <AlertCircle className="w-3 h-3" /> Overdue
                      </span>
                    )}

                    {/* Type Badge */}
                    <span
                      className={`inline-flex items-center gap-1 border text-[10px] px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider ${getTypeColor(
                        task.type
                      )}`}
                    >
                      {getTypeIcon(task.type)}
                      <span className="hidden xs:inline">{task.type}</span>
                    </span>

                    {/* Due Date */}
                    {task.due_date ? (
                      <span
                        className={`text-xs font-medium font-mono ${
                          overdue ? 'text-red-400' : 'text-neutral-400'
                        }`}
                      >
                        {new Date(task.due_date).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    ) : (
                      <span className="text-xs text-neutral-600 font-mono italic">No due date</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Task Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-[#09100f]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f1a1c] border border-[#1a2e30] w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-[#1a2e30]">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-[#06b6d4]" /> Add New Task
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTaskSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-xl text-red-400 text-xs">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Call client for feedback"
                  value={form.title}
                  onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2 px-3 text-white text-sm outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                  Contact
                </label>
                <select
                  value={form.contact_id}
                  onChange={e => setForm(prev => ({ ...prev, contact_id: e.target.value }))}
                  className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2 px-3 text-white text-sm outline-none transition-colors"
                >
                  <option value="">-- No Contact --</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name} ({c.company || 'No Company'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={e => setForm(prev => ({ ...prev, due_date: e.target.value }))}
                    className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2 px-3 text-white text-sm outline-none transition-colors font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                    Type
                  </label>
                  <select
                    value={form.type}
                    onChange={e => setForm(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2 px-3 text-white text-sm outline-none transition-colors"
                  >
                    <option value="todo">To-Do</option>
                    <option value="call">Call</option>
                    <option value="email">Email</option>
                    <option value="meeting">Meeting</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#1a2e30]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="bg-[#0f1a1c] hover:bg-[#1a2e30] border border-[#1a2e30] text-neutral-300 px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#06b6d4] hover:bg-[#0891b2] text-[#09100f] px-4 py-2 rounded-xl text-sm font-bold transition-colors cursor-pointer"
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
