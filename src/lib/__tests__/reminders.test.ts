import { describe, it, expect } from 'vitest';
import {
  isTaskOverdue,
  getOverdueTasks,
  getTasksDueWithin,
  calculateTaskStats,
  groupTasksByUser,
  groupTasksByContact,
} from '../reminders';
import { Task } from '../db';

describe('Activity Reminders & Task Operations', () => {
  const baseTime = new Date('2026-06-30T12:00:00.000Z');

  const mockTasks: Task[] = [
    {
      id: 'task-1',
      user_id: 'user-1',
      contact_id: 'contact-1',
      deal_id: null,
      title: 'Call client for check-in',
      due_date: '2026-06-29T10:00:00.000Z', // Overdue by 26 hours
      type: 'call',
      is_complete: false,
      completed_at: null,
    },
    {
      id: 'task-2',
      user_id: 'user-1',
      contact_id: 'contact-1',
      deal_id: 'deal-1',
      title: 'Send contract draft',
      due_date: '2026-06-30T18:00:00.000Z', // Due in 6 hours (due soon)
      type: 'email',
      is_complete: false,
      completed_at: null,
    },
    {
      id: 'task-3',
      user_id: 'user-2',
      contact_id: 'contact-2',
      deal_id: null,
      title: 'Follow up on proposal',
      due_date: '2026-07-05T12:00:00.000Z', // Due in 5 days
      type: 'todo',
      is_complete: false,
      completed_at: null,
    },
    {
      id: 'task-4',
      user_id: 'user-1',
      contact_id: null,
      deal_id: null,
      title: 'Quarterly review',
      due_date: '2026-06-28T12:00:00.000Z', // Completed overdue task
      type: 'meeting',
      is_complete: true,
      completed_at: '2026-06-28T15:00:00.000Z',
    },
    {
      id: 'task-5',
      user_id: 'user-1',
      contact_id: null,
      deal_id: null,
      title: 'General task with no due date',
      due_date: null,
      type: 'todo',
      is_complete: false,
      completed_at: null,
    },
  ];

  describe('isTaskOverdue', () => {
    it('returns true if task is incomplete and due date is in the past', () => {
      expect(isTaskOverdue(mockTasks[0], baseTime)).toBe(true);
    });

    it('returns false if task is already completed even if due date passed', () => {
      expect(isTaskOverdue(mockTasks[3], baseTime)).toBe(false);
    });

    it('returns false if task due date is in the future', () => {
      expect(isTaskOverdue(mockTasks[1], baseTime)).toBe(false);
      expect(isTaskOverdue(mockTasks[2], baseTime)).toBe(false);
    });

    it('returns false if task has no due date', () => {
      expect(isTaskOverdue(mockTasks[4], baseTime)).toBe(false);
    });
  });

  describe('getOverdueTasks', () => {
    it('filters list to only incomplete overdue tasks', () => {
      const overdue = getOverdueTasks(mockTasks, baseTime);
      expect(overdue).toHaveLength(1);
      expect(overdue[0].id).toBe('task-1');
    });
  });

  describe('getTasksDueWithin', () => {
    it('returns tasks due within the specified hour window', () => {
      const dueIn24h = getTasksDueWithin(mockTasks, 24, baseTime);
      expect(dueIn24h).toHaveLength(1);
      expect(dueIn24h[0].id).toBe('task-2');
    });

    it('returns tasks due within a larger 7-day window', () => {
      const dueIn7Days = getTasksDueWithin(mockTasks, 7 * 24, baseTime);
      expect(dueIn7Days).toHaveLength(2);
      expect(dueIn7Days.map(t => t.id)).toEqual(['task-2', 'task-3']);
    });
  });

  describe('calculateTaskStats', () => {
    it('computes accurate counts and completion percentage', () => {
      const stats = calculateTaskStats(mockTasks, baseTime);
      expect(stats.total).toBe(5);
      expect(stats.completed).toBe(1);
      expect(stats.pending).toBe(4);
      expect(stats.overdue).toBe(1);
      expect(stats.completionRatePct).toBe(20); // 1 out of 5 = 20%
    });

    it('handles empty task list without division by zero', () => {
      const stats = calculateTaskStats([], baseTime);
      expect(stats.total).toBe(0);
      expect(stats.completionRatePct).toBe(0);
    });
  });

  describe('groupTasksByUser', () => {
    it('groups tasks by their user_id owner', () => {
      const grouped = groupTasksByUser(mockTasks);
      expect(Object.keys(grouped)).toEqual(['user-1', 'user-2']);
      expect(grouped['user-1']).toHaveLength(4);
      expect(grouped['user-2']).toHaveLength(1);
    });
  });

  describe('groupTasksByContact', () => {
    it('groups tasks by contact_id and puts null into unassigned bucket', () => {
      const grouped = groupTasksByContact(mockTasks);
      expect(grouped['contact-1']).toHaveLength(2);
      expect(grouped['contact-2']).toHaveLength(1);
      expect(grouped['unassigned']).toHaveLength(2);
    });
  });
});
