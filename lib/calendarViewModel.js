import { format, isSameDay, startOfDay } from 'date-fns';
import { getNextRecurringEventDate, hasNativeRecurrence, isRecurringEventOnDay } from './eventRecurrence.js';

// Même parser que l'écran : les créations sont locales, les imports isUtc sont UTC.
export function parseCalendarLocalDate(dateStr, isUtc) {
  if (!dateStr) return new Date();
  // Normaliser : remplacer espace par T si nécessaire
  const s = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
  // Si isUtc=true, la date est en UTC : ajouter Z pour que new Date() convertisse en heure locale
  if (isUtc) {
    const utcStr = s.endsWith('Z') ? s : s + 'Z';
    return new Date(utcStr);
  }
  // Sinon, c'est une heure locale (création manuelle) :
  // on parse les composants manuellement pour éviter l'interprétation UTC
  // par Android/Hermes qui traite les strings ISO sans Z comme UTC.
  const [datePart, timePart = '00:00:00'] = s.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes, seconds = 0] = timePart.replace('Z', '').split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, seconds);
}

export function prepareCalendarEvents(rawEvents = [], now = new Date()) {
  return (rawEvents || []).map(e => {
    const event = { ...e, startTime: e.startDate || '', endTime: e.endDate || '' };
    const parse = value => value ? parseCalendarLocalDate(value, !!event.isUtc) : new Date(now.getTime());
    return {
      event,
      start: parse(event.startTime),
      end: parse(event.endTime),
      recurrenceEnd: event.recurrenceEndDate ? parse(event.recurrenceEndDate) : null,
    };
  });
}

export function isPreparedEventOnDay(preparedEvent, day) {
  const { event, start, end, recurrenceEnd } = preparedEvent;
  if (hasNativeRecurrence(event)) {
    return isRecurringEventOnDay(start, event.recurrence, day, recurrenceEnd);
  }
  if (!event.endTime) return isSameDay(start, day);
  if (isSameDay(start, end)) return isSameDay(start, day);
  // Multi-jours : bornes inclusives, sans déplacer l'heure de la cellule.
  const dayStart = startOfDay(day);
  return dayStart >= startOfDay(start) && dayStart <= startOfDay(end);
}

export function getCalendarDayKey(date) {
  return format(date, 'yyyy-MM-dd');
}

export function buildCalendarDayIndex(preparedEvents, days) {
  /** @type {Record<string, any[]>} */
  const byDay = {};
  /** @type {Record<string, any[]>} */
  const byDayHour = {};
  // Ne développer que les jours demandés ; les doublons ne dupliquent pas les cartes.
  const uniqueDays = new Map();
  for (const day of days || []) {
    const key = getCalendarDayKey(day);
    if (!uniqueDays.has(key)) {
      uniqueDays.set(key, day);
      byDay[key] = [];
    }
  }
  if (uniqueDays.size === 0) return { byDay, byDayHour };
  for (const prepared of preparedEvents) {
    const hour = prepared.start.getHours().toString().padStart(2, '0');
    for (const [key, day] of uniqueDays) {
      if (!isPreparedEventOnDay(prepared, day)) continue;
      byDay[key].push(prepared.event);
      const hourKey = `${key}-${hour}`;
      if (!byDayHour[hourKey]) byDayHour[hourKey] = [];
      byDayHour[hourKey].push(prepared.event);
    }
  }
  return { byDay, byDayHour };
}

export function buildCalendarAgenda(preparedEvents, now, selectedCategories = [], selectedMembers = []) {
  const upcoming = [];
  for (const { event, start, recurrenceEnd } of preparedEvents) {
    // Ces filtres ne dépendent pas de l'occurrence : éviter une recherche inutile.
    if (selectedCategories.length > 0 && !selectedCategories.includes(event.category)) continue;
    if (selectedMembers.length > 0 && !selectedMembers.includes(event.userId)) continue;
    if (!hasNativeRecurrence(event)) {
      if (start >= now) upcoming.push({ event, date: event.occurrenceStart || start });
      continue;
    }
    const occurrenceStart = getNextRecurringEventDate(start, event.recurrence, now, recurrenceEnd);
    if (occurrenceStart) upcoming.push({ event: { ...event, occurrenceStart }, date: occurrenceStart });
  }
  // Tri stable identique à l'écran ; les index de jours gardent l'ordre source.
  return upcoming.sort((a, b) => a.date.getTime() - b.date.getTime()).map(item => item.event);
}
