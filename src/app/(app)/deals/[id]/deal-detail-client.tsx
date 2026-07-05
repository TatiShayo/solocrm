'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  Clock,
  DollarSign,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Deal, PipelineStage, Contact, Task, DealTimeline } from '@/lib/db';
import {
  updateDealDetails,
  markDealWon,
  markDealLost,
  deleteDeal,
  getAISummaryAction,
  getAINextStepAction,
} from '@/app/actions/deals';

interface DealDetailClientProps {
  deal: Deal;
  stages: PipelineStage[];
  contacts: Contact[];
  timelineEvents: DealTimeline[];
}

export default function DealDetailClient({
  deal,
  stages,
  contacts,
  timelineEvents: initialTimelineEvents,
}: DealDetailClientProps) {
  const router = useRouter();
  const [timelineEvents, setTimelineEvents] = useState<DealTimeline[]>(initialTimelineEvents);
  const [isPending, startTransition] = useTransition();

  // Edit Deal Form state
  const [editForm, setEditForm] = useState({
    title: deal.title,
    contact_id: deal.contact_id || '',
    value: deal.value,
    close_date: deal.close_date || '',
    notes: deal.notes || '',
    stage_id: deal.stage_id,
    lost_reason: deal.lost_reason || '',
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // AI Widgets state
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isAiSummaryLoading, setIsAiSummaryLoading] = useState(false);
  const [aiNextStep, setAiNextStep] = useState<string | null>(null);
  const [isAiNextStepLoading, setIsAiNextStepLoading] = useState(false);

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    setSaveSuccess(false);

    const res = await updateDealDetails(deal.id, {
      title: editForm.title,
      contact_id: editForm.contact_id || null,
      value: Number(editForm.value),
      close_date: editForm.close_date || null,
      notes: editForm.notes || null,
      stage_id: editForm.stage_id,
    });

    if (res.success) {
      if (editForm.stage_id === 'stage-lost' && editForm.lost_reason) {
        await markDealLost(deal.id, editForm.lost_reason);
      }
      setSaveSuccess(true);
      router.refresh();
    } else {
      setEditError(res.error || 'Failed to update deal details.');
    }
  };

  // Mark Won
  const handleMarkWon = async () => {
    const res = await markDealWon(deal.id);
    if (res.success) {
      setEditForm(prev => ({ ...prev, stage_id: 'stage-won' }));
      setSaveSuccess(true);
      router.refresh();
    } else {
      alert(res.error || 'Failed to mark deal as Won.');
    }
  };

  // Mark Lost
  const handleMarkLost = async () => {
    if (!editForm.lost_reason) {
      setEditError('Lost reason is required to mark the deal as Lost.');
      return;
    }
    const res = await markDealLost(deal.id, editForm.lost_reason);
    if (res.success) {
      setEditForm(prev => ({ ...prev, stage_id: 'stage-lost' }));
      setSaveSuccess(true);
      router.refresh();
    } else {
      alert(res.error || 'Failed to mark deal as Lost.');
    }
  };

  // Delete Deal
  const handleDelete = async () => {
    if (confirm('Are you sure you want to permanently delete this deal and its timeline history?')) {
      const res = await deleteDeal(deal.id);
      if (res.success) {
        router.push('/pipeline');
        router.refresh();
      } else {
        alert(res.error || 'Failed to delete deal.');
      }
    }
  };

  // Generate AI Summary
  const handleGenerateAISummary = async () => {
    setIsAiSummaryLoading(true);
    try {
      const summary = await getAISummaryAction(deal.id);
      setAiSummary(summary);
    } catch (err) {
      setAiSummary('Error generating AI Summary.');
    } finally {
      setIsAiSummaryLoading(false);
    }
  };

  // Generate AI Next Step
  const handleGenerateAINextStep = async () => {
    setIsAiNextStepLoading(true);
    try {
      const step = await getAINextStepAction(deal.id);
      setAiNextStep(step);
    } catch (err) {
      setAiNextStep('Error suggesting next step.');
    } finally {
      setIsAiNextStepLoading(false);
    }
  };

  const sortedTimeline = timelineEvents
    .filter(t => t.deal_id === deal.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="space-y-6">
      {/* Header & Back Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          href="/pipeline"
          className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" /> Back to Pipeline
        </Link>
        <button
          onClick={handleDelete}
          className="flex items-center gap-2 bg-red-950/20 hover:bg-red-950/40 border border-red-900/40 hover:border-red-900/80 text-red-400 px-4 py-2 rounded-xl font-medium text-sm transition-all cursor-pointer self-start sm:self-auto"
        >
          <Trash2 className="w-4 h-4" /> Delete Deal
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Columns (2/3 size): Forms */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#0f1a1c] border border-[#1a2e30] rounded-2xl p-6 shadow-xl space-y-6">
            <div className="border-b border-[#1a2e30] pb-4 flex justify-between items-center">
              <div>
                <span className="text-[10px] bg-[#06b6d4]/10 text-[#06b6d4] border border-[#06b6d4]/30 px-2 py-0.5 rounded-full font-mono uppercase">
                  Deal details
                </span>
                <h2 className="text-2xl font-bold text-white mt-1">{deal.title}</h2>
              </div>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              {editError && (
                <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-xl text-red-400 text-xs">
                  {editError}
                </div>
              )}
              {saveSuccess && (
                <div className="p-3 bg-green-950/40 border border-green-900/50 rounded-xl text-green-400 text-xs">
                  Changes saved successfully!
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Deal Title</label>
                <input
                  type="text"
                  required
                  value={editForm.title}
                  onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2 px-3 text-white text-sm outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Contact</label>
                  <select
                    value={editForm.contact_id}
                    onChange={e => setEditForm(prev => ({ ...prev, contact_id: e.target.value }))}
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

                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Deal Value ($)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
                    <input
                      type="number"
                      required
                      value={editForm.value}
                      onChange={e => setEditForm(prev => ({ ...prev, value: Number(e.target.value) }))}
                      className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2 pl-9 pr-3 text-white text-sm outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Pipeline Stage</label>
                  <select
                    value={editForm.stage_id}
                    onChange={e => setEditForm(prev => ({ ...prev, stage_id: e.target.value }))}
                    className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2 px-3 text-white text-sm outline-none transition-colors"
                  >
                    {stages.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.probability}%)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Close Date</label>
                  <input
                    type="date"
                    value={editForm.close_date}
                    onChange={e => setEditForm(prev => ({ ...prev, close_date: e.target.value }))}
                    className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2 px-3 text-white text-sm outline-none transition-colors"
                  />
                </div>
              </div>

              {editForm.stage_id === 'stage-lost' && (
                <div>
                  <label className="block text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">Lost Reason *</label>
                  <input
                    type="text"
                    required
                    placeholder="Why was this deal lost?"
                    value={editForm.lost_reason}
                    onChange={e => setEditForm(prev => ({ ...prev, lost_reason: e.target.value }))}
                    className="w-full bg-[#09100f] border border-red-900/50 focus:border-red-500 rounded-xl py-2 px-3 text-white text-sm outline-none transition-colors"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Notes</label>
                <textarea
                  placeholder="Notes on scope, timeline, conversations..."
                  value={editForm.notes}
                  onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={6}
                  className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2 px-3 text-white text-sm outline-none transition-colors resize-none"
                />
              </div>

              <div className="flex flex-wrap gap-3 pt-4 border-t border-[#1a2e30]">
                <button
                  type="submit"
                  className="bg-[#06b6d4] hover:bg-[#0891b2] text-[#09100f] font-bold px-6 py-2.5 rounded-xl text-sm transition-colors cursor-pointer"
                >
                  Save Changes
                </button>
                {editForm.stage_id !== 'stage-won' && (
                  <button
                    type="button"
                    onClick={handleMarkWon}
                    className="bg-green-950/20 border border-green-900/40 hover:border-green-800 text-green-400 px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Mark Won
                  </button>
                )}
                {editForm.stage_id !== 'stage-lost' && (
                  <button
                    type="button"
                    onClick={handleMarkLost}
                    className="bg-red-950/20 border border-red-900/40 hover:border-red-800 text-red-400 px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <AlertTriangle className="w-4 h-4" /> Mark Lost
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: AI Assistant & Timeline */}
        <div className="space-y-6">
          {/* AI Status Summary Widget */}
          <div className="bg-[#0f1a1c] border border-[#1a2e30] p-6 rounded-2xl shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#06b6d4]" /> AI Status Summary
              </h3>
              <button
                onClick={handleGenerateAISummary}
                disabled={isAiSummaryLoading}
                className="text-xs text-[#06b6d4] hover:text-[#0891b2] font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {isAiSummaryLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...
                  </>
                ) : (
                  'Generate'
                )}
              </button>
            </div>
            {aiSummary ? (
              <div className="bg-[#09100f] border border-[#1a2e30] p-4 rounded-xl text-sm text-neutral-200 leading-relaxed italic">
                "{aiSummary}"
              </div>
            ) : (
              <p className="text-xs text-neutral-500">
                Generate an AI summary of this deal's history transitions, age, and forecast.
              </p>
            )}
          </div>

          {/* AI Next Step Widget */}
          <div className="bg-[#0f1a1c] border border-[#1a2e30] p-6 rounded-2xl shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#06b6d4]" /> AI Next Step Suggestion
              </h3>
              <button
                onClick={handleGenerateAINextStep}
                disabled={isAiNextStepLoading}
                className="text-xs text-[#06b6d4] hover:text-[#0891b2] font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {isAiNextStepLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...
                  </>
                ) : (
                  'Generate'
                )}
              </button>
            </div>
            {aiNextStep ? (
              <div className="bg-[#09100f] border border-[#1a2e30] p-4 rounded-xl text-sm text-neutral-200 leading-relaxed font-medium">
                💡 {aiNextStep}
              </div>
            ) : (
              <p className="text-xs text-neutral-500">
                Get AI advice on what action to take next based on the deal stage and timeline.
              </p>
            )}
          </div>

          {/* Timeline History */}
          <div className="bg-[#0f1a1c] border border-[#1a2e30] p-6 rounded-2xl shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white border-b border-[#1a2e30] pb-2">Timeline History</h3>
            <div className="max-h-[300px] overflow-y-auto pr-1 space-y-4 scrollbar-thin">
              {sortedTimeline.length === 0 ? (
                <p className="text-xs text-neutral-500 italic">No activity logged on this deal.</p>
              ) : (
                sortedTimeline.map(event => (
                  <div key={event.id} className="relative pl-5 border-l border-[#1a2e30] pb-1 space-y-1">
                    <div className="absolute -left-[5.5px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#1a2e30] border border-[#09100f]" />
                    <div className="flex justify-between items-baseline">
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {new Date(event.created_at).toLocaleDateString()} at{' '}
                        {new Date(event.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="text-[9px] bg-[#1a2e30] text-neutral-400 px-1 py-0.2 rounded uppercase">
                        {event.event_type}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-300">{event.description}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
