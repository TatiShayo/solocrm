import React from 'react';
import { db } from '@/lib/db';
import { UnsubscribeForm } from './unsubscribe-form';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ contactId?: string }>;
}

export default async function UnsubscribePage({ searchParams }: PageProps) {
  const { contactId } = await searchParams;

  if (!contactId) {
    return (
      <div className="min-h-screen bg-[#09100f] text-neutral-100 flex items-center justify-center p-4">
        <div className="bg-[#0f1a1c] border border-[#1a2e30] p-8 rounded-2xl max-w-md w-full text-center space-y-4 shadow-xl">
          <p className="text-red-400">Invalid unsubscribe link. Contact ID is missing.</p>
        </div>
      </div>
    );
  }

  const contact = await db.contacts.findById(contactId);
  if (!contact) {
    return (
      <div className="min-h-screen bg-[#09100f] text-neutral-100 flex items-center justify-center p-4">
        <div className="bg-[#0f1a1c] border border-[#1a2e30] p-8 rounded-2xl max-w-md w-full text-center space-y-4 shadow-xl">
          <p className="text-red-400">Contact not found or invalid link.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09100f] text-neutral-100 flex items-center justify-center p-4">
      <UnsubscribeForm contactId={contactId} email={contact.email} />
    </div>
  );
}
