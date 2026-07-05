'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { registerAction } from '@/app/actions/auth';
import { ArrowRight, Loader2, Mail, User } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !fullName) return;

    setLoading(true);
    setError(null);

    try {
      const res = await registerAction(email, fullName);
      if (res.success) {
        router.push('/dashboard');
        router.refresh();
      } else {
        setError(res.error || 'Failed to create an account.');
        setLoading(false);
      }
    } catch (err: any) {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09100f] text-neutral-100 flex flex-col justify-center items-center px-4 font-sans">
      {/* Brand Logo */}
      <Link href="/" className="flex items-center gap-2 mb-8 group">
        <div className="w-10 h-10 rounded-lg bg-[#06b6d4] flex items-center justify-center font-bold text-[#09100f] transition-transform group-hover:scale-105">
          S
        </div>
        <span className="font-bold text-2xl tracking-tight text-white">
          Solo<span className="text-[#06b6d4]">CRM</span>
        </span>
      </Link>

      {/* Main card */}
      <div className="w-full max-w-md bg-[#0f1a1c] border border-[#1a2e30] rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">Get Started</h1>
          <p className="text-sm text-neutral-400">
            Create your account to start managing your leads.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-950/40 border border-red-900/60 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-neutral-300 mb-2">
              Full Name
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-500">
                <User className="w-5 h-5" />
              </span>
              <input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-3 pl-11 pr-4 text-white text-sm placeholder-neutral-600 outline-none transition-colors"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-neutral-300 mb-2">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-500">
                <Mail className="w-5 h-5" />
              </span>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-[#09100f] border border-[#1a2e30] focus:border-[#06b6d4] rounded-xl py-3 pl-11 pr-4 text-white text-sm placeholder-neutral-600 outline-none transition-colors"
                disabled={loading}
              />
            </div>
          </div>

          <div className="bg-[#09100f] border border-[#1a2e30] rounded-xl p-4 text-xs text-neutral-400 space-y-1.5">
            <p className="font-semibold text-neutral-300">During the sandbox testing phase:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>You get an automatic <strong>Pro Tier Trial</strong> ($10/mo flat).</li>
              <li>A default Sales Pipeline will be created for you.</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#06b6d4] hover:bg-[#0891b2] disabled:opacity-50 text-[#09100f] font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Creating Account...
              </>
            ) : (
              <>
                Get Started <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#1a2e30] text-center">
          <p className="text-sm text-neutral-400">
            Already have an account?{' '}
            <Link href="/login" className="text-[#06b6d4] hover:underline font-medium">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
