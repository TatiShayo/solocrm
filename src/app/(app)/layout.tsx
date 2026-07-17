import React from 'react';
import { requireUser } from '@/lib/auth';
import NavigationSidebar from './navigation-sidebar';

export const metadata = {
  title: 'SoloCRM App',
  description: 'Manage your solopreneur business in one simple command center.',
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="min-h-screen bg-[#09100f] text-neutral-100 flex flex-col md:flex-row">
      <NavigationSidebar userEmail={user.email} userFullName={user.full_name} />
      <div className="flex-1 flex flex-col md:pl-64 min-w-[375px] w-full">
        <main className="flex-1 p-4 sm:p-8 w-full max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
