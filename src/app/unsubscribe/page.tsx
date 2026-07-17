import React from 'react';
import { db } from '@/lib/db';
import { verifyUnsubscribeToken } from '@/lib/unsubscribe-token';
import { UnsubscribeForm } from './unsubscribe-form';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-[#09100f] text-neutral-100 flex items-center justify-center p-4">
      <div className="bg-[#0f1a1c] border border-[#1a2e30] p-8 rounded-2xl max-w-md w-full text-center space-y-4 shadow-xl">
        <p className="text-red-400">{message}</p>
      </div>
    </div>
  );
}

export default async function UnsubscribePage({ searchParams }: PageProps) {
  const { token } = await searchParams;

  if (!token) {
    return <ErrorCard message="Invalid unsubscribe link." />;
  }

  // Only an HMAC-signed token minted by this server resolves to a contact.
  // Raw contact IDs are rejected, so contacts cannot be enumerated or
  // opted out cross-tenant.
  const contactId = verifyUnsubscribeToken(token);
  if (!contactId) {
    return <ErrorCard message="Invalid or expired unsubscribe link." />;
  }

  const contact = await db.contacts.findById(contactId);
  if (!contact) {
    return <ErrorCard message="Contact not found or invalid link." />;
  }

  return (
    <div className="min-h-screen bg-[#09100f] text-neutral-100 flex items-center justify-center p-4">
      <UnsubscribeForm token={token} email={contact.email} />
    </div>
  );
}
