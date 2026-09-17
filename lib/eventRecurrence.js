const RECURRENCES = new Set(['daily', 'weekly', 'monthly', 'yearly']);

function atStartOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function calendarDayNumber(date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;
}

function isSameOrAfterDay(first, second) {
  return calendarDayNumber(first) >= calendarDayNumber(second);
}

/**
 * Les événements importés restent contrôlés par leur calendrier source.
 * Seuls les événements créés dans FRI2PLAN peuvent produire des occurrences
 * locales à partir de leur champ recurrence.
 */
export function isNativeFri2PlanEvent(event) {
  return Boolean(event) && !event.icalUid && !event.calendarSubscriptionId && !event.syncedCalendarId;
}

export function hasNativeRecurrence(event) {
  return isNativeFri2PlanEvent(event) && RECURRENCES.has(event.recurrence);
}

export function isRecurringEventOnDay(startDate, recurrence, day, recurrenceEndDate = null) {
  if (!startDate || !day || !RECURRENCES.has(recurrence)) return false;

  const startDay = atStartOfDay(startDate);
  const targetDay = atStartOfDay(day);
  const endDay = recurrenceEndDate ? atStartOfDay(recurrenceEndDate) : null;
  if (!isSameOrAfterDay(targetDay, startDay) || (endDay && !isSameOrAfterDay(endDay, targetDay))) return false;

  const dayDifference = calendarDayNumber(targetDay) - calendarDayNumber(startDay);
  switch (recurrence) {
    case 'daily':
      return true;
    case 'weekly':
      return dayDifference % 7 === 0;
    case 'monthly':
      return targetDay.getDate() === startDay.getDate();
    case 'yearly':
      return targetDay.getDate() === startDay.getDate() && targetDay.getMonth() === startDay.getMonth();
    default:
      return false;
  }
}

export function getNextRecurringEventDate(startDate, recurrence, fromDate, recurrenceEndDate = null) {
  if (!startDate || !fromDate || !RECURRENCES.has(recurrence)) return null;

  const searchStart = atStartOfDay(fromDate);
  const sourceEnd = recurrenceEndDate ? atStartOfDay(recurrenceEndDate) : null;
  // Cinq ans couvre notamment la prochaine occurrence d’un 29 février.
  for (let offset = 0; offset <= 366 * 5; offset += 1) {
    const candidateDay = new Date(searchStart);
    candidateDay.setDate(candidateDay.getDate() + offset);
    if (sourceEnd && !isSameOrAfterDay(sourceEnd, candidateDay)) return null;
    if (!isRecurringEventOnDay(startDate, recurrence, candidateDay, recurrenceEndDate)) continue;

    const candidate = new Date(candidateDay);
    candidate.setHours(startDate.getHours(), startDate.getMinutes(), startDate.getSeconds(), 0);
    if (candidate >= fromDate) return candidate;
  }
  return null;
}
