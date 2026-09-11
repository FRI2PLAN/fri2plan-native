const DAY_IN_MS = 24 * 60 * 60 * 1000;

function parseLocalDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const raw = String(value);
  if (raw.endsWith('Z')) {
    const utcDate = new Date(raw);
    return Number.isNaN(utcDate.getTime()) ? null : utcDate;
  }
  const normalized = raw.replace(' ', 'T');
  const [datePart, timePart = '00:00:00'] = normalized.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours = 0, minutes = 0, seconds = 0] = timePart.replace('Z', '').split(':').map(Number);
  const localDate = new Date(year, month - 1, day, hours, minutes, seconds);
  return Number.isNaN(localDate.getTime()) ? null : localDate;
}

function startOfDay(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function hasSameId(first, second) {
  return first !== null && first !== undefined && String(first) === String(second);
}

function getMemberTaskEntry(memberId, task) {
  if (task?.assignmentMode === 'shared') {
    const participation = (task.participants || []).find((participant) => hasSameId(participant.userId, memberId));
    if (!participation) return null;
    return {
      ...task,
      memberStatus: participation.status || 'todo',
      memberCompletedAt: participation.completedAt || null,
      memberPointsGrantedAt: participation.pointsGrantedAt || null,
    };
  }

  if (!hasSameId(task?.assignedTo, memberId)) return null;
  return {
    ...task,
    memberStatus: task.status || 'todo',
    memberCompletedAt: task.completedAt || null,
    memberPointsGrantedAt: task.completedAt || null,
  };
}

function isInRange(value, rangeStart, rangeEnd) {
  const date = parseLocalDate(value);
  return !!date && date >= rangeStart && date <= rangeEnd;
}

/**
 * Construit le résumé personnel d’un membre sans confondre l’échéance d’une
 * tâche avec le moment où les points ont réellement été crédités.
 */
export function getMemberTaskSummary(memberId, tasks = [], referenceDate = new Date(), period = 'day') {
  const todayStart = startOfDay(referenceDate);
  const periodEnd = endOfDay(period === 'week'
    ? new Date(todayStart.getTime() + (6 * DAY_IN_MS))
    : todayStart);

  const memberTasks = tasks
    .map((task) => getMemberTaskEntry(memberId, task))
    .filter(Boolean);

  const scheduledTasks = memberTasks.filter((task) => isInRange(task.dueDate, todayStart, periodEnd));
  const pendingTasks = scheduledTasks.filter((task) => task.memberStatus !== 'completed');
  const overdueTasks = memberTasks.filter((task) => {
    const dueDate = parseLocalDate(task.dueDate);
    return task.memberStatus !== 'completed' && !!dueDate && dueDate < todayStart;
  });
  const completedScheduledTasks = scheduledTasks.filter((task) => task.memberStatus === 'completed');
  const completedTasks = memberTasks.filter((task) => task.memberStatus === 'completed'
    && isInRange(task.memberCompletedAt, todayStart, periodEnd));
  const pointsEarned = completedTasks.reduce((total, task) => (
    isInRange(task.memberPointsGrantedAt, todayStart, periodEnd)
      ? total + (Number(task.points) || 0)
      : total
  ), 0);

  return {
    scheduledTasks,
    pendingTasks,
    overdueTasks,
    completedTasks,
    scheduledTaskCount: scheduledTasks.length,
    pendingTaskCount: pendingTasks.length,
    overdueTaskCount: overdueTasks.length,
    completedScheduledTaskCount: completedScheduledTasks.length,
    pointsEarned,
  };
}
