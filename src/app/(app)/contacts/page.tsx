import React from 'react';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import ContactsClient from './contacts-client';

export const dynamic = 'force-dynamic';

export default async function ContactsPage() {
  const user = await requireUser();
  
  // Load contacts and deals for the authenticated user
  const contacts = await db.contacts.list(c => c.user_id === user.id);
  const deals = await db.deals.list(d => d.user_id === user.id);

  return (
    <ContactsClient 
      initialContacts={contacts} 
      initialDeals={deals} 
    />
  );
}
