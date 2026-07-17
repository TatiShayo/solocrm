import React from 'react';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import TasksClient from './tasks-client';

export const dynamic = 'force-dynamic';

export default async function TasksPage() {
  const user = await requireUser();

  // Fetch tasks and contacts
  const [tasks, contacts] = await Promise.all([
    db.tasks.list(t => t.user_id === user.id),
    db.contacts.list(c => c.user_id === user.id),
  ]);

  return <TasksClient initialTasks={tasks} contacts={contacts} />;
}
