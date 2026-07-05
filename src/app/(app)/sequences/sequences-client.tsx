'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mail,
  Plus,
  Trash2,
  Play,
  Pause,
  ChevronRight,
  ArrowLeft,
  Sparkles,
  Info,
  CheckCircle2,
  Calendar,
  Layers,
} from 'lucide-react';
import { EmailSequence, SequenceStep, SequenceEnrollment } from '@/lib/db';
import {
  createSequence,
  updateSequenceStatus,
  deleteSequence,
  addSequenceStep,
  deleteSequenceStep,
} from '@/app/actions/sequences';

interface SequencesClientProps {
  initialSequences: EmailSequence[];
  allSteps: SequenceStep[];
  enrollments: SequenceEnrollment[];
}

export default function SequencesClient({
  initialSequences,
  allSteps: initialSteps,
  enrollments,
}: SequencesClientProps) {
  const router = useRouter();
  const [sequences, setSequences] = useState<EmailSequence[]>(initialSequences);
  const [steps, setSteps] = useState<SequenceStep[]>(initialSteps);
  const [selectedSequenceId, setSelectedSequenceId] = useState<string | null>(
    initialSequences[0]?.id || null
  );

  // Loading States
  const [isPending, startTransition] = useTransition();

  // Create Sequence State
  const [newSeqName, setNewSeqName] = useState('');
  const [seqError, setSeqError] = useState<string | null>(null);

  // New Step Form State
  const [newStep, setNewStep] = useState({
    subject: '',
    body: '',
    delay_days: 1,
  });
  const [stepError, setStepError] = useState<string | null>(null);

  // Get selected sequence steps
  const currentSteps = steps
    .filter(s => s.sequence_id === selectedSequenceId)
    .sort((a, b) => a.step_number - b.step_number);

  const selectedSequence = sequences.find(s => s.id === selectedSequenceId);

  // Get enrollment counts
  const getEnrollmentCount = (seqId: string) => {
    return enrollments.filter(e => e.sequence_id === seqId && e.is_active).length;
  };

  // Handle Create Sequence
  const handleCreateSeq = async (e: React.FormEvent) => {
    e.preventDefault();
    setSeqError(null);
    if (!newSeqName.trim()) return;

    const res = await createSequence(newSeqName.trim());
    if (res.success && res.sequence) {
      setSequences(prev => [...prev, res.sequence!]);
      setSelectedSequenceId(res.sequence.id);
      setNewSeqName('');
      router.refresh();
    } else {
      setSeqError(res.error || 'Failed to create sequence.');
    }
  };

  // Toggle Activation
  const handleToggleStatus = async (seqId: string, currentStatus: boolean) => {
    const original = [...sequences];
    const newStatus = !currentStatus;

    setSequences(prev =>
      prev.map(s => (s.id === seqId ? { ...s, is_active: newStatus } : s))
    );

    const res = await updateSequenceStatus(seqId, newStatus);
    if (res.success) {
      router.refresh();
    } else {
      setSequences(original);
      alert('Failed to update sequence status.');
    }
  };

  // Handle Delete Sequence
  const handleDeleteSeq = async (seqId: string) => {
    if (
      confirm(
        'Are you sure you want to delete this sequence? This will remove all of its steps and cancel scheduled emails.'
      )
    ) {
      const res = await deleteSequence(seqId);
      if (res.success) {
        setSequences(prev => prev.filter(s => s.id !== seqId));
        setSteps(prev => prev.filter(s => s.sequence_id !== seqId));
        if (selectedSequenceId === seqId) {
          const remaining = sequences.filter(s => s.id !== seqId);
          setSelectedSequenceId(remaining[0]?.id || null);
        }
        router.refresh();
      } else {
        alert(res.error || 'Failed to delete sequence.');
      }
    }
  };

  // Handle Add Step
  const handleAddStep = async (e: React.FormEvent) => {
    e.preventDefault();
    setStepError(null);
    if (!selectedSequenceId) return;

    if (!newStep.subject || !newStep.body) {
      setStepError('Subject and Body are required.');
      return;
    }

    const res = await addSequenceStep(selectedSequenceId, {
      subject: newStep.subject,
      body: newStep.body,
      delay_days: Number(newStep.delay_days),
    });

    if (res.success && res.step) {
      setSteps(prev => [...prev, res.step!]);
      setNewStep({
        subject: '',
        body: '',
        delay_days: 1,
      });
      router.refresh();
    } else {
      setStepError(res.error || 'Failed to add sequence step.');
    }
  };

  // Handle Delete Step
  const handleDeleteStep = async (stepId: string) => {
    if (!selectedSequenceId) return;
    if (confirm('Are you sure you want to delete this step?')) {
      const res = await deleteSequenceStep(selectedSequenceId, stepId);
      if (res.success) {
        // Fetch reordered steps
        setSteps(prev => prev.filter(s => s.id !== stepId));
        // Force refresh from server to fetch the newly renumbered order
        router.refresh();
        // Simple trick to sync local step numbers:
        setSteps(prev => {
          const others = prev.filter(s => s.sequence_id !== selectedSequenceId || s.id !== stepId);
          const currentSeq = prev.filter(s => s.sequence_id === selectedSequenceId && s.id !== stepId);
          const sorted = currentSeq.sort((a, b) => a.step_number - b.step_number);
          const renumbered = sorted.map((s, idx) => ({ ...s, step_number: idx + 1 }));
          return [...others, ...renumbered];
        });
      } else {
        alert(res.error || 'Failed to delete step.');
      }
    }
  };

  // Insert Template Tag
  const insertTag = (tag: string) => {
    setNewStep(prev => ({
      ...prev,
      body: prev.body + tag,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white">Email Sequences</h1>
        <p className="text-neutral-400 text-sm mt-1">
          Design drip campaigns and schedule follow-ups for your contacts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Sequences List */}
        <div className="space-y-6">
          <div className="bg-[#0f1a1c] border border-[#1a2e30] rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#1a2e30] pb-3">
              Your Campaigns
            </h3>

            {seqError && (
              <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-xl text-red-400 text-xs">
                {seqError}
              </div>
            )}

            {/* Inline creator */}
            <form onSubmit={handleCreateSeq} className="flex gap-2">
              <input
                type="text"
                required
                placeholder="e.g. Lead Follow-Up"
                value={newSeqName}
                onChange={e => setNewSeqName(e.target.value)}
                className="flex-1 bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2 px-3 text-white text-xs outline-none transition-colors"
              />
              <button
                type="submit"
                className="bg-[#06b6d4] hover:bg-[#0891b2] text-[#09100f] px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Create
              </button>
            </form>

            <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin">
              {sequences.length === 0 ? (
                <p className="text-neutral-500 text-xs italic py-4">No campaigns created yet.</p>
              ) : (
                sequences.map(seq => {
                  const isSelected = seq.id === selectedSequenceId;
                  const stepCount = steps.filter(s => s.sequence_id === seq.id).length;
                  const activeEnrolled = getEnrollmentCount(seq.id);

                  return (
                    <div
                      key={seq.id}
                      onClick={() => setSelectedSequenceId(seq.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-[#1a2e30]/40 border-[#06b6d4]/65'
                          : 'bg-[#09100f]/60 border-[#1a2e30] hover:bg-[#1a2e30]/20'
                      }`}
                    >
                      <div className="min-w-0">
                        <h4 className="font-semibold text-white text-xs truncate">{seq.name}</h4>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-neutral-400">
                          <span>{stepCount} {stepCount === 1 ? 'step' : 'steps'}</span>
                          <span>•</span>
                          <span className="text-[#06b6d4]/90 font-medium">
                            {activeEnrolled} active
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        {/* Play/Pause switch */}
                        <button
                          onClick={() => handleToggleStatus(seq.id, seq.is_active)}
                          className={`p-1.5 rounded-lg border transition-all ${
                            seq.is_active
                              ? 'bg-green-950/20 border-green-800 text-green-400 hover:bg-green-950/40'
                              : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:text-white'
                          }`}
                          title={seq.is_active ? 'Pause Campaign' : 'Activate Campaign'}
                        >
                          {seq.is_active ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
                        </button>

                        {/* Delete button */}
                        <button
                          onClick={() => handleDeleteSeq(seq.id)}
                          className="p-1.5 rounded-lg bg-red-950/10 border border-red-900/30 text-red-400 hover:border-red-800 hover:bg-red-950/30 transition-all"
                          title="Delete Campaign"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Columns: Sequence Step Builder */}
        <div className="lg:col-span-2">
          {selectedSequenceId && selectedSequence ? (
            <div className="bg-[#0f1a1c] border border-[#1a2e30] rounded-2xl p-6 shadow-xl space-y-6">
              
              {/* Header Info */}
              <div className="flex items-center justify-between border-b border-[#1a2e30] pb-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl font-bold text-white">{selectedSequence.name}</h2>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        selectedSequence.is_active
                          ? 'bg-green-950/30 border border-green-900/40 text-green-400'
                          : 'bg-neutral-900 border border-neutral-800 text-neutral-500'
                      }`}
                    >
                      {selectedSequence.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    Manage steps and template contents for this campaign.
                  </p>
                </div>
              </div>

              {/* Steps List */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#06b6d4]" /> Sequence Steps
                </h3>

                {currentSteps.length === 0 ? (
                  <div className="bg-[#09100f]/40 border border-dashed border-[#1a2e30] rounded-2xl p-8 text-center text-xs text-neutral-500">
                    No steps added yet. Use the form below to add Step 1.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {currentSteps.map(step => (
                      <div
                        key={step.id}
                        className="bg-[#09100f]/80 border border-[#1a2e30] rounded-xl p-4 flex flex-col md:flex-row justify-between gap-4"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="bg-[#06b6d4] text-[#09100f] w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold">
                              {step.step_number}
                            </span>
                            <h4 className="font-bold text-white text-xs sm:text-sm">
                              {step.subject}
                            </h4>
                          </div>
                          <p className="text-[10px] text-neutral-400 font-medium">
                            Delay: Send{' '}
                            <span className="text-[#06b6d4] font-semibold">
                              {step.delay_days} day{step.delay_days === 1 ? '' : 's'}
                            </span>{' '}
                            after enrollment/previous step.
                          </p>
                          <div className="bg-[#0f1a1c] border border-[#1a2e30] p-3 rounded-lg text-xs text-neutral-300 whitespace-pre-wrap font-sans mt-2 max-h-[120px] overflow-y-auto leading-relaxed">
                            {step.body}
                          </div>
                        </div>

                        <div className="flex-shrink-0 self-start">
                          <button
                            onClick={() => handleDeleteStep(step.id)}
                            className="text-neutral-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-950/20 transition-all cursor-pointer"
                            title="Delete Step"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Step Form */}
              <div className="border-t border-[#1a2e30] pt-6 space-y-4">
                <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                  Add Step {currentSteps.length + 1}
                </h3>

                <form onSubmit={handleAddStep} className="space-y-4">
                  {stepError && (
                    <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-xl text-red-400 text-xs">
                      {stepError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="sm:col-span-3">
                      <label className="block text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                        Subject Line *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Quick question regarding your product plans"
                        value={newStep.subject}
                        onChange={e => setNewStep(prev => ({ ...prev, subject: e.target.value }))}
                        className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2 px-3 text-white text-xs outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                        Delay (Days) *
                      </label>
                      <input
                        type="number"
                        min={0}
                        required
                        value={newStep.delay_days}
                        onChange={e =>
                          setNewStep(prev => ({ ...prev, delay_days: Number(e.target.value) }))
                        }
                        className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2 px-3 text-white text-xs outline-none transition-colors font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                      Email Body *
                    </label>
                    <textarea
                      required
                      placeholder="Write your email template body here. Use tags to personalize."
                      value={newStep.body}
                      onChange={e => setNewStep(prev => ({ ...prev, body: e.target.value }))}
                      rows={6}
                      className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-2 px-3 text-white text-xs outline-none transition-colors resize-none font-sans leading-relaxed"
                    />

                    {/* Merge Tag Helpers */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                      <span className="text-[10px] text-neutral-500 font-semibold mr-1">
                        Insert Merge Tags:
                      </span>
                      {['{{first_name}}', '{{last_name}}', '{{company}}', '{{title}}', '{{email}}'].map(
                        tag => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => insertTag(tag)}
                            className="bg-[#09100f] hover:bg-[#06b6d4]/10 border border-[#1a2e30] hover:border-[#06b6d4]/40 text-neutral-400 hover:text-[#06b6d4] text-[9px] px-2 py-0.5 rounded font-mono transition-colors cursor-pointer"
                          >
                            {tag}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="bg-[#06b6d4] hover:bg-[#0891b2] text-[#09100f] px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Step
                    </button>
                  </div>
                </form>
              </div>

            </div>
          ) : (
            <div className="bg-[#0f1a1c] border border-[#1a2e30] rounded-2xl p-12 text-center text-neutral-400">
              <Mail className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">No Campaign Selected</h3>
              <p className="text-xs">Create or select a campaign in the left pane to edit drip steps.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
