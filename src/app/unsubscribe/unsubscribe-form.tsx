'use client';

import React, { useState } from 'react';
import { optOutContactPublicAction } from '@/app/actions/contacts';
import { MailCheck, MailX, Loader2 } from 'lucide-react';

interface UnsubscribeFormProps {
  contactId: string;
  email: string | null;
}

export function UnsubscribeForm({ contactId, email }: UnsubscribeFormProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUnsubscribe = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await optOutContactPublicAction(contactId);
      if (res.success) {
        setSuccess(true);
      } else {
        setError(res.error || 'Failed to unsubscribe.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-[#0f1a1c] border border-[#1a2e30] p-8 rounded-2xl max-w-md w-full text-center space-y-6 shadow-xl">
        <div className="w-16 h-16 rounded-full bg-[#06b6d4]/10 border border-[#06b6d4]/30 flex items-center justify-center mx-auto text-[#06b6d4]">
          <MailCheck className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Unsubscribed successfully</h1>
          <p className="text-neutral-400 text-sm">
            {email ? `The email address ${email} has been unsubscribed.` : 'You have been unsubscribed.'}
          </p>
        </div>
        <p className="text-neutral-400 text-xs">
          You will no longer receive any automated sequence emails from our team.
        </p>
        <div className="w-16 h-1 bg-[#06b6d4] mx-auto rounded"></div>
      </div>
    );
  }

  return (
    <div className="bg-[#0f1a1c] border border-[#1a2e30] p-8 rounded-2xl max-w-md w-full text-center space-y-6 shadow-xl">
      <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
        <MailX className="w-8 h-8" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white">Unsubscribe Confirmation</h1>
        <p className="text-neutral-300 text-sm">
          Are you sure you want to unsubscribe {email ? <span className="text-cyan-400 font-semibold">{email}</span> : 'from our automated emails'}?
        </p>
      </div>

      {error && (
        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 py-2 px-3 rounded-lg">
          {error}
        </p>
      )}

      <button
        onClick={handleUnsubscribe}
        disabled={loading}
        className="w-full py-3 px-4 bg-[#06b6d4] hover:bg-[#0891b2] disabled:bg-[#06b6d4]/50 text-[#09100f] font-bold rounded-xl transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/20 cursor-pointer"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Unsubscribing...
          </>
        ) : (
          'Confirm Unsubscribe'
        )}
      </button>

      <p className="text-neutral-500 text-xs">
        If you unsubscribe, you will immediately stop receiving any pending sequence emails.
      </p>
    </div>
  );
}
