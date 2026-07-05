'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  DragEndEvent,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Briefcase,
  Calendar,
  Clock,
  DollarSign,
  TrendingUp,
  Plus,
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileText,
  User,
  Trash2,
  ChevronRight,
  TrendingDown,
  Loader2,
  Info,
} from 'lucide-react';
import { Deal, PipelineStage, Contact, Task, DealTimeline } from '@/lib/db';
import {
  updateDealStage,
  updateDealDetails,
  markDealWon,
  markDealLost,
  deleteDeal,
  getAISummaryAction,
  getAINextStepAction,
  createDeal,
} from '@/app/actions/deals';

interface PipelineClientProps {
  initialDeals: Deal[];
  stages: PipelineStage[];
  contacts: Contact[];
  tasks: Task[];
  timelineEvents: DealTimeline[];
}

export default function PipelineClient({
  initialDeals,
  stages,
  contacts,
  tasks,
  timelineEvents: initialTimelineEvents,
}: PipelineClientProps) {
  const router = useRouter();
  const [deals, setDeals] = useState<Deal[]>(initialDeals);
  const [timelineEvents, setTimelineEvents] = useState<DealTimeline[]>(initialTimelineEvents);
  const [isPending, startTransition] = useTransition();

  // Sensors for DnD kit, Pointer constraint allows click handler to fire
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Modal / Drawer state
  const [activeDealId, setActiveDealId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // AI Widgets state
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isAiSummaryLoading, setIsAiSummaryLoading] = useState(false);
  const [aiNextStep, setAiNextStep] = useState<string | null>(null);
  const [isAiNextStepLoading, setIsAiNextStepLoading] = useState(false);

  // Edit Deal Form state
  const [editForm, setEditForm] = useState({
    title: '',
    contact_id: '' as string | null,
    value: 0,
    close_date: '',
    notes: '',
    stage_id: '',
    lost_reason: '',
  });
  const [editError, setEditError] = useState<string | null>(null);

  // Add Deal Form state
  const [addForm, setAddForm] = useState({
    title: '',
    contact_id: '',
    value: '',
    close_date: '',
    notes: '',
    stage_id: stages[0]?.id || '',
  });
  const [addError, setAddError] = useState<string | null>(null);

  // Open active deal details in modal/drawer
  const openDealDetails = (dealId: string) => {
    const deal = deals.find(d => d.id === dealId);
    if (!deal) return;

    setActiveDealId(dealId);
    setEditForm({
      title: deal.title,
      contact_id: deal.contact_id || '',
      value: deal.value,
      close_date: deal.close_date || '',
      notes: deal.notes || '',
      stage_id: deal.stage_id,
      lost_reason: deal.lost_reason || '',
    });
    setEditError(null);
    setAiSummary(null);
    setAiNextStep(null);
  };

  // Close active deal details
  const closeDealDetails = () => {
    setActiveDealId(null);
  };

  // Forecast calculations (Open deals = stage is not won and not lost)
  const openDeals = deals.filter(
    d => d.stage_id !== 'stage-won' && d.stage_id !== 'stage-lost'
  );
  
  const weightedForecast = openDeals.reduce((sum, deal) => {
    const stage = stages.find(s => s.id === deal.stage_id);
    const prob = stage ? stage.probability : 0;
    return sum + deal.value * (prob / 100);
  }, 0);

  const totalValueForecast = openDeals.reduce((sum, d) => sum + d.value, 0);

  // Drag and Drop End handler
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    let targetStageId = overId;
    const isOverStage = stages.some(s => s.id === overId);

    if (!isOverStage) {
      const targetDeal = deals.find(d => d.id === overId);
      if (targetDeal) {
        targetStageId = targetDeal.stage_id;
      } else {
        return;
      }
    }

    const activeDeal = deals.find(d => d.id === activeId);
    if (!activeDeal) return;

    if (activeDeal.stage_id !== targetStageId) {
      const originalDeals = [...deals];
      // Optimistic state update
      setDeals(prev =>
        prev.map(d => (d.id === activeId ? { ...d, stage_id: targetStageId } : d))
      );

      const res = await updateDealStage(activeId, targetStageId);
      if (res.success) {
        // Fetch new timeline events
        router.refresh();
      } else {
        // Revert on failure
        setDeals(originalDeals);
        alert(res.error || 'Failed to update deal stage.');
      }
    }
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDealId) return;

    setEditError(null);
    const res = await updateDealDetails(activeDealId, {
      title: editForm.title,
      contact_id: editForm.contact_id || null,
      value: Number(editForm.value),
      close_date: editForm.close_date || null,
      notes: editForm.notes || null,
      stage_id: editForm.stage_id,
    });

    if (res.success) {
      if (editForm.stage_id === 'stage-lost' && editForm.lost_reason) {
        await markDealLost(activeDealId, editForm.lost_reason);
      }
      
      // Update local state deals
      setDeals(prev =>
        prev.map(d =>
          d.id === activeDealId
            ? {
                ...d,
                title: editForm.title,
                contact_id: editForm.contact_id || null,
                value: Number(editForm.value),
                close_date: editForm.close_date || null,
                notes: editForm.notes || null,
                stage_id: editForm.stage_id,
                lost_reason: editForm.stage_id === 'stage-lost' ? editForm.lost_reason : null,
              }
            : d
        )
      );

      router.refresh();
      closeDealDetails();
    } else {
      setEditError(res.error || 'Failed to update deal details.');
    }
  };

  // Mark Won
  const handleMarkWon = async () => {
    if (!activeDealId) return;
    const res = await markDealWon(activeDealId);
    if (res.success) {
      setDeals(prev =>
        prev.map(d =>
          d.id === activeDealId
            ? { ...d, stage_id: 'stage-won', won_at: new Date().toISOString(), lost_at: null, lost_reason: null, probability: 100 }
            : d
        )
      );
      setEditForm(prev => ({ ...prev, stage_id: 'stage-won' }));
      router.refresh();
      closeDealDetails();
    } else {
      alert(res.error || 'Failed to mark deal as Won.');
    }
  };

  // Mark Lost
  const handleMarkLost = async () => {
    if (!activeDealId) return;
    if (!editForm.lost_reason) {
      setEditError('Lost reason is required to mark the deal as Lost.');
      return;
    }
    const res = await markDealLost(activeDealId, editForm.lost_reason);
    if (res.success) {
      setDeals(prev =>
        prev.map(d =>
          d.id === activeDealId
            ? { ...d, stage_id: 'stage-lost', lost_at: new Date().toISOString(), lost_reason: editForm.lost_reason, won_at: null, probability: 0 }
            : d
        )
      );
      setEditForm(prev => ({ ...prev, stage_id: 'stage-lost' }));
      router.refresh();
      closeDealDetails();
    } else {
      alert(res.error || 'Failed to mark deal as Lost.');
    }
  };

  // Delete Deal
  const handleDeleteDeal = async () => {
    if (!activeDealId) return;
    if (confirm('Are you sure you want to permanently delete this deal and its timeline events?')) {
      const res = await deleteDeal(activeDealId);
      if (res.success) {
        setDeals(prev => prev.filter(d => d.id !== activeDealId));
        router.refresh();
        closeDealDetails();
      } else {
        alert(res.error || 'Failed to delete deal.');
      }
    }
  };

  // Generate AI Summary
  const handleGenerateAISummary = async () => {
    if (!activeDealId) return;
    setIsAiSummaryLoading(true);
    try {
      const summary = await getAISummaryAction(activeDealId);
      setAiSummary(summary);
    } catch (err: any) {
      console.error(err);
      setAiSummary('Error generating AI Summary.');
    } finally {
      setIsAiSummaryLoading(false);
    }
  };

  // Generate AI Next Step
  const handleGenerateAINextStep = async () => {
    if (!activeDealId) return;
    setIsAiNextStepLoading(true);
    try {
      const step = await getAINextStepAction(activeDealId);
      setAiNextStep(step);
    } catch (err: any) {
      console.error(err);
      setAiNextStep('Error suggesting next step.');
    } finally {
      setIsAiNextStepLoading(false);
    }
  };

  // Handle Add Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    if (!addForm.title || !addForm.value) {
      setAddError('Title and Value are required.');
      return;
    }

    const res = await createDeal({
      title: addForm.title,
      contact_id: addForm.contact_id || null,
      value: Number(addForm.value),
      stage_id: addForm.stage_id,
      close_date: addForm.close_date || undefined,
      notes: addForm.notes || undefined,
    });

    if (res.success && res.deal) {
      setDeals(prev => [...prev, res.deal!]);
      setAddForm({
        title: '',
        contact_id: '',
        value: '',
        close_date: '',
        notes: '',
        stage_id: stages[0]?.id || '',
      });
      setIsAddModalOpen(false);
      router.refresh();
    } else {
      setAddError(res.error || 'Failed to create deal.');
    }
  };

  const activeDeal = deals.find(d => d.id === activeDealId);
  const activeDealTimeline = timelineEvents
    .filter(t => t.deal_id === activeDealId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Sales Pipeline</h1>
          <p className="text-neutral-400 text-sm mt-1">
            Drag & drop deals to update stages and manage your forecast.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-[#06b6d4] hover:bg-[#0891b2] text-[#09100f] px-4 py-2.5 rounded-xl font-bold text-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Deal
          </button>
        </div>
      </div>

      {/* Forecast Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-[#0f1a1c] border border-[#1a2e30] p-6 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#06b6d4]/10 border border-[#06b6d4]/20 flex items-center justify-center text-[#06b6d4]">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-neutral-400 font-medium uppercase tracking-wider">Weighted Forecast</span>
            <h3 className="text-2xl font-bold text-white mt-0.5">${weightedForecast.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          </div>
        </div>
        <div className="bg-[#0f1a1c] border border-[#1a2e30] p-6 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#06b6d4]/10 border border-[#06b6d4]/20 flex items-center justify-center text-[#06b6d4]">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-neutral-400 font-medium uppercase tracking-wider">Total Pipeline (Open)</span>
            <h3 className="text-2xl font-bold text-white mt-0.5">${totalValueForecast.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          </div>
        </div>
        <div className="bg-[#0f1a1c] border border-[#1a2e30] p-6 rounded-2xl flex items-center gap-4 sm:col-span-2 lg:col-span-1">
          <div className="w-12 h-12 rounded-xl bg-[#06b6d4]/10 border border-[#06b6d4]/20 flex items-center justify-center text-[#06b6d4]">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-neutral-400 font-medium uppercase tracking-wider">Active Deals</span>
            <h3 className="text-2xl font-bold text-white mt-0.5">{openDeals.length} deals</h3>
          </div>
        </div>
      </div>

      {/* Kanban Board Container */}
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="flex overflow-x-auto pb-4 gap-4 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent snap-x snap-mandatory min-h-[600px] w-full">
          {stages.map(stage => {
            const stageDeals = deals.filter(d => d.stage_id === stage.id);
            const stageSum = stageDeals.reduce((sum, d) => sum + d.value, 0);

            return (
              <PipelineColumn
                key={stage.id}
                stage={stage}
                deals={stageDeals}
                totalValue={stageSum}
                contacts={contacts}
                tasks={tasks}
                timelineEvents={timelineEvents}
                onCardClick={openDealDetails}
              />
            );
          })}
        </div>
      </DndContext>

      {/* Add Deal Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-[#09100f]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f1a1c] border border-[#1a2e30] w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-[#1a2e30]">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-[#06b6d4]" /> Add New Deal
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {addError && (
                <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-xl text-red-400 text-xs">
                  {addError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Deal Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Enterprise License"
                  value={addForm.title}
                  onChange={e => setAddForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2 px-3 text-white text-sm outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Contact</label>
                  <select
                    value={addForm.contact_id}
                    onChange={e => setAddForm(prev => ({ ...prev, contact_id: e.target.value }))}
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
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Deal Value ($) *</label>
                  <input
                    type="number"
                    required
                    placeholder="0.00"
                    value={addForm.value}
                    onChange={e => setAddForm(prev => ({ ...prev, value: e.target.value }))}
                    className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2 px-3 text-white text-sm outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Stage</label>
                  <select
                    value={addForm.stage_id}
                    onChange={e => setAddForm(prev => ({ ...prev, stage_id: e.target.value }))}
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
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Expected Close Date</label>
                  <input
                    type="date"
                    value={addForm.close_date}
                    onChange={e => setAddForm(prev => ({ ...prev, close_date: e.target.value }))}
                    className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2 px-3 text-white text-sm outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Notes</label>
                <textarea
                  placeholder="Provide details about the deal..."
                  value={addForm.notes}
                  onChange={e => setAddForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2 px-3 text-white text-sm outline-none transition-colors resize-none"
                />
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
                  Create Deal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deal Details Drawer/Modal */}
      {activeDealId && activeDeal && (
        <div className="fixed inset-0 bg-[#09100f]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f1a1c] border border-[#1a2e30] w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#1a2e30]">
              <div>
                <span className="text-[10px] bg-[#06b6d4]/10 text-[#06b6d4] border border-[#06b6d4]/30 px-2 py-0.5 rounded-full font-mono uppercase">
                  Deal Details
                </span>
                <h3 className="text-xl font-bold text-white mt-1">{activeDeal.title}</h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDeleteDeal}
                  className="p-2 text-red-400 hover:bg-red-950/20 hover:text-red-300 rounded-xl transition-colors cursor-pointer"
                  title="Delete Deal"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button
                  onClick={closeDealDetails}
                  className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content (Scrollable Grid) */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Left Column: Edit Form */}
              <div className="space-y-6">
                <form onSubmit={handleEditSubmit} className="space-y-4">
                  <h4 className="text-sm font-bold text-neutral-300 border-b border-[#1a2e30] pb-2">Properties</h4>
                  {editError && (
                    <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-xl text-red-400 text-xs">
                      {editError}
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
                        value={editForm.contact_id || ''}
                        onChange={e => setEditForm(prev => ({ ...prev, contact_id: e.target.value || null }))}
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
                      <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Value ($)</label>
                      <input
                        type="number"
                        required
                        value={editForm.value}
                        onChange={e => setEditForm(prev => ({ ...prev, value: Number(e.target.value) }))}
                        className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2 px-3 text-white text-sm outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Stage</label>
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
                      placeholder="Notes regarding client interaction..."
                      value={editForm.notes}
                      onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                      rows={4}
                      className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2 px-3 text-white text-sm outline-none transition-colors resize-none"
                    />
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-[#1a2e30]">
                    <button
                      type="submit"
                      className="bg-[#0f1a1c] hover:bg-[#1a2e30] border border-[#1a2e30] text-neutral-200 px-4 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                    >
                      Save Changes
                    </button>
                    {editForm.stage_id !== 'stage-won' && (
                      <button
                        type="button"
                        onClick={handleMarkWon}
                        className="bg-green-950/20 border border-green-900/40 hover:border-green-800 text-green-400 px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Mark Won
                      </button>
                    )}
                    {editForm.stage_id !== 'stage-lost' && (
                      <button
                        type="button"
                        onClick={handleMarkLost}
                        className="bg-red-950/20 border border-red-900/40 hover:border-red-800 text-red-400 px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <AlertTriangle className="w-4 h-4" /> Mark Lost
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Right Column: AI Assistant & History */}
              <div className="space-y-6">
                
                {/* AI Summary Widget */}
                <div className="bg-[#09100f] border border-[#1a2e30] p-5 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <h5 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#06b6d4]" /> AI Status Summary
                    </h5>
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
                    <div className="bg-[#0f1a1c] border border-[#1a2e30] p-3.5 rounded-xl text-sm text-neutral-200 leading-relaxed italic">
                      "{aiSummary}"
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-500">
                      Click generate to run AI deal progress analysis on this deal's timeline history.
                    </p>
                  )}
                </div>

                {/* AI Next Step Widget */}
                <div className="bg-[#09100f] border border-[#1a2e30] p-5 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <h5 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#06b6d4]" /> AI Next Step Suggestion
                    </h5>
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
                    <div className="bg-[#0f1a1c] border border-[#1a2e30] p-3.5 rounded-xl text-sm text-neutral-200 leading-relaxed font-medium">
                      💡 {aiNextStep}
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-500">
                      Click generate to get an AI action suggestion based on current stage and timeline.
                    </p>
                  )}
                </div>

                {/* Timeline History */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-neutral-300 border-b border-[#1a2e30] pb-2">Timeline History</h4>
                  <div className="max-h-[220px] overflow-y-auto pr-1 space-y-3 scrollbar-thin">
                    {activeDealTimeline.length === 0 ? (
                      <p className="text-xs text-neutral-500 italic py-2">No activity logged on this deal.</p>
                    ) : (
                      activeDealTimeline.map(event => (
                        <div key={event.id} className="relative pl-4 border-l border-[#1a2e30] pb-1 space-y-1">
                          <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#1a2e30] border border-[#09100f]" />
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
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   PIPELINE COLUMN COMPONENT
   ============================================================================ */
interface PipelineColumnProps {
  stage: PipelineStage;
  deals: Deal[];
  totalValue: number;
  contacts: Contact[];
  tasks: Task[];
  timelineEvents: DealTimeline[];
  onCardClick: (dealId: string) => void;
}

function PipelineColumn({
  stage,
  deals,
  totalValue,
  contacts,
  tasks,
  timelineEvents,
  onCardClick,
}: PipelineColumnProps) {
  const { setNodeRef, isOver } = useSortable({ id: stage.id });

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-80 md:w-96 snap-align-start rounded-2xl flex flex-col max-h-[85vh] transition-colors ${
        isOver ? 'bg-[#0f1a1c] border-2 border-dashed border-[#06b6d4]/40' : 'bg-[#0f1a1c]/60 border border-[#1a2e30]'
      }`}
    >
      {/* Column Header */}
      <div className="p-4 border-b border-[#1a2e30] flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: stage.color || '#06b6d4' }}
            />
            <h3 className="font-bold text-white text-sm">{stage.name}</h3>
            <span className="text-neutral-500 text-xs">({deals.length})</span>
          </div>
          <span className="text-[10px] text-neutral-400 block mt-1">
            Prob: {stage.probability}% • Total: ${totalValue.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Sortable Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
        <SortableContext items={deals.map(d => d.id)} strategy={verticalListSortingStrategy}>
          {deals.length === 0 ? (
            <div className="h-24 border border-dashed border-[#1a2e30]/80 rounded-xl flex items-center justify-center text-xs text-neutral-600">
              Drag deals here
            </div>
          ) : (
            deals.map(deal => {
              const contact = contacts.find(c => c.id === deal.contact_id);
              const contactName = contact
                ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
                : 'No Contact';

              // Days in stage
              const dealEvents = timelineEvents.filter(t => t.deal_id === deal.id);
              const lastChange = [...dealEvents]
                .filter(t => t.event_type === 'stage_change' || t.event_type === 'created')
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
              const lastTime = lastChange ? new Date(lastChange.created_at).getTime() : new Date().getTime();
              const daysInStage = Math.max(0, Math.floor((Date.now() - lastTime) / (1000 * 60 * 60 * 24)));

              // Next scheduled task
              const dealTask = tasks
                .filter(
                  t =>
                    (t.deal_id === deal.id || (t.contact_id === deal.contact_id && t.deal_id === null)) &&
                    !t.is_complete &&
                    t.due_date
                )
                .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())[0];

              return (
                <SortableDealCard
                  key={deal.id}
                  deal={deal}
                  contactName={contactName}
                  stageProbability={stage.probability}
                  daysInStage={daysInStage}
                  nextTask={dealTask}
                  onClick={() => onCardClick(deal.id)}
                />
              );
            })
          )}
        </SortableContext>
      </div>
    </div>
  );
}

/* ============================================================================
   SORTABLE DEAL CARD COMPONENT
   ============================================================================ */
interface SortableDealCardProps {
  deal: Deal;
  contactName: string;
  stageProbability: number;
  daysInStage: number;
  nextTask: Task | undefined;
  onClick: () => void;
}

function SortableDealCard({
  deal,
  contactName,
  stageProbability,
  daysInStage,
  nextTask,
  onClick,
}: SortableDealCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deal.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className="bg-[#09100f] border border-[#1a2e30] hover:border-[#06b6d4]/40 p-4 rounded-xl space-y-3 cursor-pointer group shadow-sm transition-all duration-200"
    >
      {/* Card Header (Drag handle trigger) */}
      <div {...attributes} {...listeners} className="flex justify-between items-start cursor-grab active:cursor-grabbing">
        <h4 className="font-semibold text-white text-sm group-hover:text-[#06b6d4] transition-colors line-clamp-1">
          {deal.title}
        </h4>
        <span className="text-[10px] bg-[#1a2e30] text-neutral-300 px-1.5 py-0.5 rounded font-mono">
          {stageProbability}%
        </span>
      </div>

      <div className="flex justify-between items-center text-xs text-neutral-400">
        <span>{contactName}</span>
        <span className="font-semibold text-neutral-200">${deal.value.toLocaleString()}</span>
      </div>

      <div className="flex flex-col gap-1.5 border-t border-[#1a2e30] pt-2.5 text-[10px] text-neutral-500">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-neutral-400" />
          <span>
            {daysInStage} {daysInStage === 1 ? 'day' : 'days'} in stage
          </span>
        </div>
        {nextTask && (
          <div className="flex items-center gap-1.5 text-[#06b6d4]/80">
            <Calendar className="w-3.5 h-3.5 text-[#06b6d4]" />
            <span className="line-clamp-1">
              Next: {nextTask.title} ({new Date(nextTask.due_date!).toLocaleDateString()})
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
