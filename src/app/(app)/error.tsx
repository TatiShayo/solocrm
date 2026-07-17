'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log for observability; never surface raw error text to the user.
    console.error('App route error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="bg-[#0f1a1c] border border-[#1a2e30] rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-xl">
        <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold text-white">Something went wrong</h1>
        <p className="text-sm text-neutral-400">
          We hit an unexpected error loading this page. You can try again.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 bg-[#06b6d4] hover:bg-[#0891b2] text-[#09100f] font-bold py-2.5 px-5 rounded-xl transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          Try again
        </button>
      </div>
    </div>
  );
}
