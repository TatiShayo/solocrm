import React from 'react';
import { Loader2 } from 'lucide-react';

export default function AppLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex items-center gap-3 text-neutral-400">
        <Loader2 className="w-5 h-5 animate-spin text-[#06b6d4]" />
        <span className="text-sm">Loading…</span>
      </div>
    </div>
  );
}
