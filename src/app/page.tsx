import Link from 'next/link';
import { Check, X, Shield, ArrowRight } from 'lucide-react';
import { getSessionUser } from '@/lib/auth';

export const metadata = {
  title: 'SoloCRM - The Anti-Enterprise CRM for Solopreneurs',
  description: 'Every lead. Every deal. No BS pricing. $10/mo flat. No upsells.',
};

export default async function LandingPage() {
  const user = await getSessionUser();

  return (
    <div className="min-h-screen bg-[#09100f] text-neutral-100 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-[#1a2e30] bg-[#0f1a1c]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#06b6d4] flex items-center justify-center font-bold text-[#09100f]">
              S
            </div>
            <span className="font-bold text-xl tracking-tight text-white">
              Solo<span className="text-[#06b6d4]">CRM</span>
            </span>
          </div>
          <nav className="flex items-center gap-6">
            {user ? (
              <>
                <span className="text-sm text-neutral-400 hidden sm:inline">{user.email}</span>
                <Link
                  href="/dashboard"
                  className="bg-[#06b6d4] hover:bg-[#0891b2] text-[#09100f] font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1 text-sm"
                >
                  Dashboard <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium hover:text-[#06b6d4] transition-colors">
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="bg-[#06b6d4] hover:bg-[#0891b2] text-[#09100f] font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
                >
                  Get Started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto px-4 py-16 sm:py-24 flex flex-col items-center">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#1a2e30] bg-[#0f1a1c] text-xs text-neutral-400 mb-6">
            <span className="w-2 h-2 rounded-full bg-[#06b6d4] animate-pulse"></span>
            Built exclusively for Solopreneurs
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Every lead. Every deal. <br className="hidden sm:inline" />
            <span className="text-[#06b6d4]">No BS pricing.</span>
          </h1>
          <p className="text-lg sm:text-2xl text-neutral-400 mb-10 max-w-2xl mx-auto">
            The anti-enterprise CRM for solopreneurs. <strong className="text-white">$10/mo flat.</strong> No upsells.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {user ? (
              <Link
                href="/dashboard"
                className="w-full sm:w-auto bg-[#06b6d4] hover:bg-[#0891b2] text-[#09100f] text-lg font-bold px-8 py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.15)] flex items-center justify-center gap-2"
              >
                Go to Dashboard
                <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/signup"
                  className="w-full sm:w-auto bg-[#06b6d4] hover:bg-[#0891b2] text-[#09100f] text-lg font-bold px-8 py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.15)] flex items-center justify-center gap-2"
                >
                  Get Started for Free
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/login"
                  className="w-full sm:w-auto bg-[#0f1a1c] hover:bg-[#1a2e30] text-neutral-200 border border-[#1a2e30] text-lg font-semibold px-8 py-4 rounded-xl transition-all flex items-center justify-center"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-4">
            No credit card required. Pre-seeded with sandbox data.
          </p>
        </div>

        {/* Comparison Section */}
        <div className="w-full max-w-4xl mb-24">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-4xl font-bold text-white mb-4">
              Stop paying for bloated enterprise features
            </h2>
            <p className="text-neutral-400 max-w-lg mx-auto">
              CRM giants want to charge you hundreds per month for features you never use and limits you constantly hit.
            </p>
          </div>

          <div className="bg-[#0f1a1c] border border-[#1a2e30] rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#09100f] border-b border-[#1a2e30]">
                    <th className="p-4 sm:p-6 text-sm font-semibold text-neutral-400">Feature</th>
                    <th className="p-4 sm:p-6 text-sm font-semibold text-neutral-400">HubSpot / Salesforce</th>
                    <th className="p-4 sm:p-6 text-sm font-semibold text-[#06b6d4] bg-[#0f1a1c]">SoloCRM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a2e30]/55">
                  <tr>
                    <td className="p-4 sm:p-6 font-medium text-white">Pricing model</td>
                    <td className="p-4 sm:p-6 text-neutral-400 text-sm">
                      $20 to $500+/mo. Scales aggressively with team and list size.
                    </td>
                    <td className="p-4 sm:p-6 bg-[#0f1a1c]/40 text-[#06b6d4] font-semibold text-sm">
                      $10/mo flat. Keep all your profits.
                    </td>
                  </tr>
                  <tr>
                    <td className="p-4 sm:p-6 font-medium text-white">Contact limits</td>
                    <td className="p-4 sm:p-6 text-neutral-400 text-sm">
                      Pay per 1,000 extra contacts. Up to 10x price spikes.
                    </td>
                    <td className="p-4 sm:p-6 bg-[#0f1a1c]/40 text-neutral-200 text-sm">
                      <span className="flex items-center gap-1.5">
                        <Check className="w-4 h-4 text-[#06b6d4]" /> Unlimited
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-4 sm:p-6 font-medium text-white">Email Sequences</td>
                    <td className="p-4 sm:p-6 text-neutral-400 text-sm">
                      Premium/Enterprise tier only ($90+/mo).
                    </td>
                    <td className="p-4 sm:p-6 bg-[#0f1a1c]/40 text-neutral-200 text-sm">
                      <span className="flex items-center gap-1.5">
                        <Check className="w-4 h-4 text-[#06b6d4]" /> Unlimited cold & warm sequencing
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-4 sm:p-6 font-medium text-white">AI Capabilities</td>
                    <td className="p-4 sm:p-6 text-neutral-400 text-sm">
                      Paid add-on packages. High pricing tiers.
                    </td>
                    <td className="p-4 sm:p-6 bg-[#0f1a1c]/40 text-neutral-200 text-sm">
                      <span className="flex items-center gap-1.5">
                        <Check className="w-4 h-4 text-[#06b6d4]" /> Included at no extra cost
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-4 sm:p-6 font-medium text-white">Complexity</td>
                    <td className="p-4 sm:p-6 text-neutral-400 text-sm">
                      Requires certified consultants or weeks of setup.
                    </td>
                    <td className="p-4 sm:p-6 bg-[#0f1a1c]/40 text-neutral-200 text-sm">
                      <span className="flex items-center gap-1.5">
                        <Check className="w-4 h-4 text-[#06b6d4]" /> Zero config, works instantly
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
          <div className="bg-[#0f1a1c] border border-[#1a2e30] p-6 rounded-2xl">
            <div className="w-10 h-10 rounded-lg bg-[#06b6d4]/10 border border-[#06b6d4]/30 flex items-center justify-center mb-4 text-[#06b6d4]">
              <Check className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Simplicity First</h3>
            <p className="text-neutral-400 text-sm">
              We ditched multi-user permissions, audit logs, and compliance forms. Just your pipeline, tasks, contacts, and emails.
            </p>
          </div>
          <div className="bg-[#0f1a1c] border border-[#1a2e30] p-6 rounded-2xl">
            <div className="w-10 h-10 rounded-lg bg-[#06b6d4]/10 border border-[#06b6d4]/30 flex items-center justify-center mb-4 text-[#06b6d4]">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Complete Autonomy</h3>
            <p className="text-neutral-400 text-sm">
              Manage contacts, view automated timelines, send sequences, and organize tasks from one clean dashboard.
            </p>
          </div>
          <div className="bg-[#0f1a1c] border border-[#1a2e30] p-6 rounded-2xl">
            <div className="w-10 h-10 rounded-lg bg-[#06b6d4]/10 border border-[#06b6d4]/30 flex items-center justify-center mb-4 text-[#06b6d4]">
              <ArrowRight className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Bulk CSV Import</h3>
            <p className="text-neutral-400 text-sm">
              Migrate from HubSpot or custom spreadsheets in seconds. Map your CSV fields client-side and upload instantly.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1a2e30] bg-[#09100f] py-8 text-center text-xs text-neutral-500">
        <p>&copy; {new Date().getFullYear()} SoloCRM. Built for makers. Flat $10/mo.</p>
      </footer>
    </div>
  );
}
