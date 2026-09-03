import { Task, Contact, Deal } from './db';

/**
 * Checks if a task is overdue relative to a reference date/time.
 */
export function isTaskOverdue(task: Task, referenceDate: Date = new Date()): boolean {
  if (task.is_complete || !task.due_date) return false;
  const refTime = new Date(referenceDate).getTime();
  const dueTime = new Date(task.due_date).getTime();
  return dueTime < refTime;
}

/**
 * Filters a list of tasks for those that are incomplete and overdue.
 */
export function getOverdueTasks(tasks: Task[], referenceDate: Date = new Date()): Task[] {
  return tasks.filter(t => isTaskOverdue(t, referenceDate));
}

/**
 * Filters tasks due within a certain time window (e.g. within next 24 hours).
 */
export function getTasksDueWithin(
  tasks: Task[],
  withinHours: number = 24,
  referenceDate: Date = new Date()
): Task[] {
  const refTime = new Date(referenceDate).getTime();
  const windowEndTime = refTime + withinHours * 60 * 60 * 1000;

  return tasks.filter(t => {
    if (t.is_complete || !t.due_date) return false;
    const dueTime = new Date(t.due_date).getTime();
    return dueTime >= refTime && dueTime <= windowEndTime;
  });
}

export interface TaskCompletionStats {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  completionRatePct: number;
}

/**
 * Calculates overall task completion stats.
 */
export function calculateTaskStats(tasks: Task[], referenceDate: Date = new Date()): TaskCompletionStats {
  const total = tasks.length;
  const completed = tasks.filter(t => t.is_complete).length;
  const pending = tasks.filter(t => !t.is_complete).length;
  const overdue = tasks.filter(t => isTaskOverdue(t, referenceDate)).length;
  const completionRatePct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    total,
    completed,
    pending,
    overdue,
    completionRatePct,
  };
}

/**
 * Groups tasks by user ID.
 */
export function groupTasksByUser(tasks: Task[]): Record<string, Task[]> {
  const result: Record<string, Task[]> = {};
  for (const task of tasks) {
    if (!result[task.user_id]) {
      result[task.user_id] = [];
    }
    result[task.user_id].push(task);
  }
  return result;
}

/**
 * Groups tasks by contact ID.
 */
export function groupTasksByContact(tasks: Task[]): Record<string, Task[]> {
  const result: Record<string, Task[]> = {};
  for (const task of tasks) {
    const key = task.contact_id || 'unassigned';
    if (!result[key]) {
      result[key] = [];
    }
    result[key].push(task);
  }
  return result;
}
