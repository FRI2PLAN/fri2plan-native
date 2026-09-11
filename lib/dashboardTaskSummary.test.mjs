import { describe, expect, it } from 'vitest';
import { getMemberTaskSummary } from './dashboardTaskSummary.js';

const today = new Date(2026, 8, 17, 12, 0, 0);

describe('résumé personnel des tâches', () => {
  const tasks = [
    { id: 1, assignedTo: 10, status: 'todo', dueDate: '2026-09-17 09:00:00', points: 3 },
    { id: 2, assignedTo: 10, status: 'todo', dueDate: '2026-09-15 09:00:00', points: 5 },
    { id: 3, assignmentMode: 'shared', dueDate: '2026-09-17 09:00:00', points: 4, participants: [{ userId: 10, status: 'todo' }, { userId: 11, status: 'completed' }] },
    { id: 4, assignmentMode: 'shared', dueDate: '2026-09-14 09:00:00', points: 7, participants: [{ userId: 10, status: 'todo' }] },
    { id: 5, assignmentMode: 'shared', dueDate: '2026-09-12 09:00:00', points: 9, participants: [{ userId: 10, status: 'completed', completedAt: '2026-09-17 11:00:00', pointsGrantedAt: '2026-09-17 11:00:00' }] },
    { id: 6, assignedTo: 10, status: 'completed', dueDate: '2026-09-10 09:00:00', completedAt: '2026-09-17 10:00:00', points: 2 },
    { id: 7, assignmentMode: 'shared', dueDate: '2026-09-17 09:00:00', points: 8, participants: [{ userId: 11, status: 'todo' }] },
    { id: 8, assignedTo: 10, status: 'todo', dueDate: '2026-09-21 09:00:00', points: 1 },
  ];

  it('inclut les tâches communes du membre et sépare les retards non terminés', () => {
    const summary = getMemberTaskSummary(10, tasks, today, 'day');
    expect(summary.pendingTaskCount).toBe(2);
    expect(summary.overdueTaskCount).toBe(2);
    expect(summary.scheduledTasks.map((task) => task.id)).toEqual([1, 3]);
    expect(summary.overdueTasks.map((task) => task.id)).toEqual([2, 4]);
  });

  it('compte les points selon leur attribution et non la date d’échéance', () => {
    const summary = getMemberTaskSummary(10, tasks, today, 'day');
    expect(summary.completedTasks.map((task) => task.id)).toEqual([5, 6]);
    expect(summary.pointsEarned).toBe(11);
  });

  it('élargit les tâches à venir et les points au mode semaine sans absorber les retards', () => {
    const summary = getMemberTaskSummary(10, tasks, today, 'week');
    expect(summary.pendingTaskCount).toBe(3);
    expect(summary.overdueTaskCount).toBe(2);
    expect(summary.pointsEarned).toBe(11);
  });
});
