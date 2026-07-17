import React from 'react';
import Link from 'next/link';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  CheckCircle2, 
  ArrowRight, 
  Plus, 
  Mail,
  Clock,
  Briefcase,
  ExternalLink
} from 'lucide-react';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { checkAndSendScheduledEmails } from '@/app/actions/contacts';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await requireUser();

  // 1. Run background check for scheduled emails that are due
  const emailCheck = await checkAndSendScheduledEmails();

  // 2. Fetch data from DB
  const [contacts, deals, tasks] = await Promise.all([
    db.contacts.list(c => c.user_id === user.id),
    db.deals.list(d => d.user_id === user.id),
    db.tasks.list(t => t.user_id === user.id),
  ]);

  // Fetch stages of user's default pipeline for revenue forecasting
  const defaultPipeline = await db.pipelines.find(p => p.user_id === user.id && p.is_default);
  const stages = defaultPipeline 
    ? await db.pipelineStages.list(s => s.pipeline_id === defaultPipeline.id)
    : [];

  // 3. Compute Metrics
  const totalContacts = contacts.length;
  
  // Open deals (where won_at is null and lost_at is null)
  const openDeals = deals.filter(d => d.won_at === null && d.lost_at === null);
  const openDealsValue = openDeals.reduce((sum, d) => sum + (d.value || 0), 0);

  // Revenue forecast (sum of deal value * probability percentage of its current stage)
  const revenueForecast = openDeals.reduce((sum, d) => {
    const stage = stages.find(s => s.id === d.stage_id);
    const probability = stage ? stage.probability : 0;
    return sum + (d.value * (probability / 100));
  }, 0);

  // Pending tasks
  const pendingTasks = tasks.filter(t => !t.is_complete);
  const pendingTasksCount = pendingTasks.length;

  // Recent contacts (limit to 5, sorted by newest)
  const recentContacts = [...contacts]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  // Urgent pending tasks (limit to 5)
  const urgentTasks = [...pendingTasks]
    .sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    })
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Welcome back, <span className="text-[#06b6d4]">{user.full_name || 'Solo Founder'}</span>
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Here's what is happening with your business today.
          </p>
        </div>

        {/* Email send notifier */}
        {emailCheck.success && emailCheck.count && emailCheck.count > 0 ? (
          <div className="flex items-center gap-2.5 bg-[#06b6d4]/10 border border-[#06b6d4]/30 px-4 py-2.5 rounded-xl text-[#06b6d4] text-xs font-semibold">
            <Mail className="w-4 h-4 animate-bounce" />
            Background Job: Sent {emailCheck.count} scheduled email{emailCheck.count > 1 ? 's' : ''}!
          </div>
        ) : null}
      </div>

      {/* Grid: 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Contacts */}
        <div className="bg-[#0f1a1c] border border-[#1a2e30] p-5 rounded-2xl shadow-md flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Total Contacts</p>
            <h3 className="text-3xl font-bold text-white mt-1">{totalContacts}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#06b6d4]/10 border border-[#06b6d4]/20 flex items-center justify-center text-[#06b6d4]">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Open Deals Value */}
        <div className="bg-[#0f1a1c] border border-[#1a2e30] p-5 rounded-2xl shadow-md flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Open Deals Value</p>
            <h3 className="text-3xl font-bold text-white mt-1">
              ${openDealsValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#06b6d4]/10 border border-[#06b6d4]/20 flex items-center justify-center text-[#06b6d4]">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Revenue Forecast */}
        <div className="bg-[#0f1a1c] border border-[#1a2e30] p-5 rounded-2xl shadow-md flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Weighted Forecast</p>
            <h3 className="text-3xl font-bold text-[#06b6d4] mt-1">
              ${revenueForecast.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#06b6d4]/10 border border-[#06b6d4]/20 flex items-center justify-center text-[#06b6d4]">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="bg-[#0f1a1c] border border-[#1a2e30] p-5 rounded-2xl shadow-md flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Pending Tasks</p>
            <h3 className="text-3xl font-bold text-white mt-1">{pendingTasksCount}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#06b6d4]/10 border border-[#06b6d4]/20 flex items-center justify-center text-[#06b6d4]">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Grid: Columns for Quick Links & Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left/Middle Column (2/3 width) - Recent Contacts & Tasks */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Card: Recent Contacts */}
          <div className="bg-[#0f1a1c] border border-[#1a2e30] rounded-2xl p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Recent Contacts</h3>
              <Link
                href="/contacts"
                className="text-xs text-[#06b6d4] hover:text-[#0891b2] font-semibold flex items-center gap-0.5 transition-colors"
              >
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="divide-y divide-[#1a2e30]/40">
              {recentContacts.length === 0 ? (
                <p className="text-sm text-neutral-500 py-4 italic">No contacts added yet. Add some to get started!</p>
              ) : (
                recentContacts.map(c => (
                  <div
                    key={c.id}
                    className="py-3 flex items-center justify-between hover:bg-[#1a2e30]/10 px-2 rounded-xl transition-colors cursor-pointer"
                    onClick={() => {
                      window.location.href = `/contacts/${c.id}`;
                    }}
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {c.first_name} {c.last_name}
                      </p>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {c.title ? `${c.title} at ` : ''}{c.company || 'Independent'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] bg-[#09100f] border border-[#1a2e30] text-neutral-300">
                        {c.source || 'Manual'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Card: Urgent Pending Tasks */}
          <div className="bg-[#0f1a1c] border border-[#1a2e30] rounded-2xl p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Upcoming Tasks</h3>
              <Link
                href="/tasks"
                className="text-xs text-[#06b6d4] hover:text-[#0891b2] font-semibold flex items-center gap-0.5 transition-colors"
              >
                Go to Tasks <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-3">
              {urgentTasks.length === 0 ? (
                <p className="text-sm text-neutral-500 py-2 italic">Nice work! You have no pending tasks.</p>
              ) : (
                urgentTasks.map(t => (
                  <div
                    key={t.id}
                    className="p-3.5 bg-[#09100f] border border-[#1a2e30] rounded-xl flex items-start justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{t.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400">
                          {t.type}
                        </span>
                        {t.contact_id && (
                          <Link
                            href={`/contacts/${t.contact_id}`}
                            className="text-[10px] text-[#06b6d4] hover:underline"
                          >
                            View Contact
                          </Link>
                        )}
                      </div>
                    </div>
                    {t.due_date && (
                      <div className="text-right text-[10px] text-neutral-400 flex items-center gap-1.5 bg-[#0f1a1c] border border-[#1a2e30] px-2.5 py-1 rounded-lg">
                        <Clock className="w-3 h-3 text-[#06b6d4]" />
                        {new Date(t.due_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Right Column (1/3 width) - Quick Links & CRM Tips */}
        <div className="space-y-8">
          
          {/* Card: Quick Links */}
          <div className="bg-[#0f1a1c] border border-[#1a2e30] rounded-2xl p-6 shadow-lg space-y-4">
            <h3 className="text-lg font-bold text-white">Quick Actions</h3>
            <div className="grid grid-cols-1 gap-2.5">
              <Link
                href="/contacts"
                className="flex items-center justify-between p-3.5 rounded-xl bg-[#09100f] border border-[#1a2e30] hover:border-[#06b6d4]/40 hover:bg-[#06b6d4]/5 transition-all text-sm font-medium text-white group"
              >
                <span>Manage Contacts</span>
                <Users className="w-4 h-4 text-neutral-500 group-hover:text-[#06b6d4] transition-colors" />
              </Link>
              <Link
                href="/pipeline"
                className="flex items-center justify-between p-3.5 rounded-xl bg-[#09100f] border border-[#1a2e30] hover:border-[#06b6d4]/40 hover:bg-[#06b6d4]/5 transition-all text-sm font-medium text-white group"
              >
                <span>View Sales Pipeline</span>
                <Briefcase className="w-4 h-4 text-neutral-500 group-hover:text-[#06b6d4] transition-colors" />
              </Link>
              <Link
                href="/tasks"
                className="flex items-center justify-between p-3.5 rounded-xl bg-[#09100f] border border-[#1a2e30] hover:border-[#06b6d4]/40 hover:bg-[#06b6d4]/5 transition-all text-sm font-medium text-white group"
              >
                <span>Organize Tasks</span>
                <CheckCircle2 className="w-4 h-4 text-neutral-500 group-hover:text-[#06b6d4] transition-colors" />
              </Link>
            </div>
          </div>

          {/* Card: Flat Pricing / Billing Details */}
          <div className="bg-[#0f1a1c] border border-[#1a2e30] rounded-2xl p-6 shadow-lg space-y-3">
            <h3 className="font-bold text-white text-md">Subscription & Flat Pricing</h3>
            <div className="bg-[#09100f] border border-[#1a2e30] p-4 rounded-xl space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-400">Current Plan:</span>
                <span className="font-semibold text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-900/40 uppercase tracking-wider text-[10px]">
                  Pro (Active)
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-400">Cost:</span>
                <span className="font-bold text-white">$10/mo flat</span>
              </div>
            </div>
            <p className="text-[11px] text-neutral-500">
              SoloCRM charges exactly $10 per month. No add-ons, no list-size penalties, no user upsells.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
