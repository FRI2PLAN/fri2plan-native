import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { addDays, eachDayOfInterval, endOfDay, format, isSameDay, startOfDay } from 'date-fns';
import * as recurrenceEngine from './eventRecurrence.js';
import {
  buildCalendarAgenda,
  buildCalendarDayIndex,
  isPreparedEventOnDay,
  parseCalendarLocalDate,
  prepareCalendarEvents,
} from './calendarViewModel.js';

// Oracle explicite : corps du parser/isEventOnDay/Agenda de CalendarScreen.tsx
// à fe90ce1. Il ne dépend PAS du nouveau helper ; seul le moteur inchangé est partagé.
function previousParser(dateStr, isUtc) {
  if (!dateStr) return new Date();
  const s = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
  if (isUtc) return new Date(s.endsWith('Z') ? s : s + 'Z');
  const [datePart, timePart = '00:00:00'] = s.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes, seconds = 0] = timePart.replace('Z', '').split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, seconds);
}
function previousNormalize(rawEvents) {
  return (rawEvents || []).map(e => ({ ...e, startTime: e.startDate || '', endTime: e.endDate || '' }));
}
function previousIsEventOnDay(event, day) {
  const start = previousParser(event.startTime, !!event.isUtc);
  if (recurrenceEngine.hasNativeRecurrence(event)) {
    const recurrenceEnd = event.recurrenceEndDate ? previousParser(event.recurrenceEndDate, !!event.isUtc) : null;
    return recurrenceEngine.isRecurringEventOnDay(start, event.recurrence, day, recurrenceEnd);
  }
  if (!event.endTime) return isSameDay(start, day);
  const end = previousParser(event.endTime, !!event.isUtc);
  if (isSameDay(start, end)) return isSameDay(start, day);
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day); // conservé dans l'oracle original, bien qu'inutilisé
  void dayEnd;
  return dayStart >= startOfDay(start) && dayStart <= startOfDay(end);
}
function previousAgenda(rawEvents, now, categories = [], members = []) {
  return previousNormalize(rawEvents)
    .map(event => {
      if (!recurrenceEngine.hasNativeRecurrence(event)) return previousParser(event.startTime, !!event.isUtc) >= now ? event : null;
      const next = recurrenceEngine.getNextRecurringEventDate(
        previousParser(event.startTime, !!event.isUtc), event.recurrence, now,
        event.recurrenceEndDate ? previousParser(event.recurrenceEndDate, !!event.isUtc) : null,
      );
      return next ? { ...event, occurrenceStart: next } : null;
    })
    .filter(Boolean)
    .filter(event => categories.length === 0 || categories.includes(event.category))
    .filter(event => members.length === 0 || members.includes(event.userId))
    .sort((a, b) => (a.occurrenceStart || previousParser(a.startTime, !!a.isUtc)).getTime() - (b.occurrenceStart || previousParser(b.startTime, !!b.isUtc)).getTime());
}
const localDate = (day, hour = '12:00:00') => previousParser(`${day} ${hour}`, false);
const ids = events => (events || []).map(event => event.id);
const agendaSignature = events => events.map(event => ({
  ...event, occurrenceStart: event.occurrenceStart?.getTime(),
}));
const rawEvent = (id, startDate, extra = {}) => ({ id, title: `Fictif ${id}`, startDate, category: 'other', userId: 1, ...extra });
function freezeClock(now) {
  vi.useFakeTimers();
  vi.setSystemTime(now);
}
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const fixtures = [
  rawEvent('single', '2026-03-28 09:45:17', { endDate: '2026-03-28 10:30:00' }),
  rawEvent('span', '2026-03-28 23:15:00', { endDate: '2026-03-30 00:00:00' }),
  rawEvent('no-end', '2026-03-29 11:00:00'),
  rawEvent('duration-only', '2026-03-29 22:00:00', { durationMinutes: 3000 }),
  rawEvent('no-duration', '2026-03-29 13:00:00', { endDate: null, durationMinutes: null }),
  rawEvent('reverse-end', '2026-03-30 12:00:00', { endDate: '2026-03-28 12:00:00' }),
  rawEvent('daily', '2026-03-28 08:12:19', { recurrence: 'daily', recurrenceEndDate: '2026-03-30 00:00:00' }),
  rawEvent('weekly', '2026-03-22 16:00:00', { recurrence: 'weekly', recurrenceEndDate: '2026-04-05 00:00:00' }),
  rawEvent('monthly31', '2026-01-31 10:00:00', { recurrence: 'monthly', recurrenceEndDate: '2026-05-31 00:00:00' }),
  rawEvent('leap', '2024-02-29 10:30:00', { recurrence: 'yearly', recurrenceEndDate: '2028-02-29 00:00:00' }),
  rawEvent('ical', '2026-03-29 11:20:00', { recurrence: 'daily', icalUid: 'synthetic-uid' }),
  rawEvent('subscription', '2026-03-28 11:20:00', { recurrence: 'weekly', calendarSubscriptionId: 7, endDate: '2026-03-30 00:00:00' }),
  rawEvent('synced', '2026-03-29 11:20:00', { recurrence: 'monthly', syncedCalendarId: 8 }),
  rawEvent('utc', '2026-03-28 23:30:00', { isUtc: 1, endDate: '2026-03-29 23:30:00' }),
];

describe('calendarViewModel — équivalence avec le précédent écran', () => {
  it('copie le parser local/UTC, ISO/MySQL, date seule et valeurs absentes', () => {
    freezeClock(localDate('2026-11-09', '17:45:23'));
    for (const value of [undefined, null, '', '2026-03-29', '2026-03-29 01:25:13', '2026-03-29T01:25:13', '2026-03-29T01:25:13Z']) {
      for (const utc of [undefined, false, true]) {
        expect(parseCalendarLocalDate(value, utc).getTime()).toBe(previousParser(value, utc).getTime());
      }
    }
  });

  it('normalise startTime/endTime sans perdre les métadonnées ni muter la source', () => {
    const now = localDate('2026-11-09', '17:45:23');
    freezeClock(now);
    const raw = [
      rawEvent('metadata', '2026-03-29 08:00:00', { startTime: 'ancien', endTime: 'ancien', endDate: '2026-03-29 09:00:00', recurrence: 'daily', recurrenceEndDate: '2026-04-01 00:00:00', color: '#123456', isPrivate: 1, description: 'fictif' }),
      rawEvent('missing', undefined, { endDate: null }),
    ];
    const before = structuredClone(raw);
    raw.forEach(Object.freeze);
    Object.freeze(raw);
    const prepared = prepareCalendarEvents(raw, now);
    expect(prepared.map(entry => entry.event)).toEqual(previousNormalize(raw));
    expect(prepared[0].event).not.toBe(raw[0]);
    expect(prepared[0].start.getTime()).toBe(previousParser(raw[0].startDate).getTime());
    expect(prepared[0].end.getTime()).toBe(previousParser(raw[0].endDate).getTime());
    expect(prepared[0].recurrenceEnd.getTime()).toBe(previousParser(raw[0].recurrenceEndDate).getTime());
    expect(prepared[1].start.getTime()).toBe(now.getTime());
    expect(prepared[1].start).not.toBe(now);
    expect(raw).toEqual(before);
    expect(now.getTime()).toBe(localDate('2026-11-09', '17:45:23').getTime());
  });

  it('compare toutes les familles de fixtures sur plusieurs années et jours DST', () => {
    const now = localDate('2026-03-29');
    freezeClock(now);
    const prepared = prepareCalendarEvents(fixtures, now);
    const normalized = previousNormalize(fixtures);
    const days = eachDayOfInterval({ start: localDate('2026-03-21'), end: localDate('2026-04-06') }).concat(
      ['2024-02-28', '2024-02-29', '2025-02-28', '2026-01-30', '2026-01-31', '2026-02-28', '2026-04-30', '2026-05-31', '2026-06-30', '2028-02-28', '2028-02-29', '2032-02-29'].map(day => localDate(day)),
    );
    prepared.forEach((entry, index) => {
      for (const day of days) {
        expect(isPreparedEventOnDay(entry, day), `${entry.event.id} / ${format(day, 'yyyy-MM-dd')}`).toBe(previousIsEventOnDay(normalized[index], day));
      }
    });
  });

  it('fixe explicitement les bornes natives, le 31 mensuel et le 29 février annuel', () => {
    const prepared = prepareCalendarEvents(fixtures, localDate('2026-03-29'));
    const check = (id, day, expected) => expect(isPreparedEventOnDay(prepared.find(entry => entry.event.id === id), localDate(day)), `${id} / ${day}`).toBe(expected);
    check('daily', '2026-03-27', false); // avant le début : exclu
    check('daily', '2026-03-28', true); // jour du début : inclus
    check('daily', '2026-03-30', true); // heure de fin 00:00 : journée inclusive
    check('daily', '2026-03-31', false);
    check('weekly', '2026-03-29', true);
    check('weekly', '2026-04-05', true);
    check('weekly', '2026-04-12', false);
    check('monthly31', '2026-02-28', false);
    check('monthly31', '2026-03-31', true);
    check('monthly31', '2026-04-30', false);
    check('monthly31', '2026-05-31', true);
    check('monthly31', '2026-07-31', false);
    check('leap', '2025-02-28', false);
    check('leap', '2028-02-29', true);
    check('leap', '2032-02-29', false);
    check('span', '2026-03-28', true);
    check('span', '2026-03-30', true);
    check('span', '2026-03-31', false);
    check('duration-only', '2026-03-30', false); // pas d'expansion implicite via durationMinutes
  });

  it.each(['icalUid', 'calendarSubscriptionId', 'syncedCalendarId'])('ne génère pas de récurrence native pour la source %s', source => {
    const raw = [rawEvent('external', '2026-03-29 10:30:00', { [source]: source === 'icalUid' ? 'fictif' : 12, recurrence: 'daily' })];
    const prepared = prepareCalendarEvents(raw, localDate('2026-03-28'));
    expect(isPreparedEventOnDay(prepared[0], localDate('2026-03-29'))).toBe(true);
    expect(isPreparedEventOnDay(prepared[0], localDate('2026-03-30'))).toBe(false);
    const before = buildCalendarAgenda(prepared, localDate('2026-03-28'));
    expect(ids(before)).toEqual(['external']);
    expect(before[0]).not.toHaveProperty('occurrenceStart');
    expect(buildCalendarAgenda(prepared, localDate('2026-03-30'))).toEqual([]);
  });
});

describe('calendarViewModel — index borné et sans état partagé', () => {
  it('équivaut aux anciens scans de jour et aux 24 scans horaires, dans l’ordre entrée', () => {
    const days = eachDayOfInterval({ start: localDate('2026-03-27'), end: localDate('2026-04-06') });
    const prepared = prepareCalendarEvents(fixtures, localDate('2026-03-29'));
    const normalized = previousNormalize(fixtures);
    const index = buildCalendarDayIndex(prepared, days);
    for (const day of days) {
      const key = format(day, 'yyyy-MM-dd');
      expect(index.byDay[key] || []).toEqual(normalized.filter(event => previousIsEventOnDay(event, day)));
      for (let hour = 0; hour < 24; hour += 1) {
        expect(index.byDayHour[`${key}-${String(hour).padStart(2, '0')}`] || []).toEqual(normalized.filter(event => previousIsEventOnDay(event, day) && previousParser(event.startTime, !!event.isUtc).getHours() === hour));
      }
    }
    expect(ids(index.byDayHour['2026-03-30-23'])).toEqual(['span']); // heure d'origine, même le dernier jour
    expect(ids(index.byDayHour['2026-03-29-08'])).toEqual(['daily']);
    expect(index.byDay['2026-05-31']).toBeUndefined();
  });

  it('déduplique les jours, pas les événements, et ne développe pas les jours intermédiaires demandés nulle part', () => {
    const raw = [rawEvent('second', '2026-03-28 09:00:00'), rawEvent('first', '2026-03-28 09:00:00'), rawEvent('second', '2026-03-28 09:00:00')];
    const days = [localDate('2026-03-30'), localDate('2026-03-28'), localDate('2026-03-28', '23:59:59'), localDate('2030-01-01')];
    const before = days.map(day => day.getTime());
    const index = buildCalendarDayIndex(prepareCalendarEvents(raw), days);
    expect(ids(index.byDay['2026-03-28'])).toEqual(['second', 'first', 'second']);
    expect(ids(index.byDayHour['2026-03-28-09'])).toEqual(['second', 'first', 'second']);
    expect(index.byDay['2026-03-29']).toBeUndefined();
    expect(index.byDayHour['2026-03-29-09']).toBeUndefined();
    expect(days.map(day => day.getTime())).toEqual(before);
    const permittedKeys = new Set(days.map(day => format(day, 'yyyy-MM-dd')));
    expect(Object.keys(index.byDay).every(key => permittedKeys.has(key))).toBe(true);
    expect(Object.keys(index.byDayHour).every(key => permittedKeys.has(key.slice(0, 10)))).toBe(true);
  });

  it('reconstruit B après modification/création/suppression sans recycler ni contaminer A', () => {
    const days = [localDate('2026-11-09'), localDate('2026-11-10')];
    const rawA = [rawEvent('move', '2026-11-09 09:00:00'), rawEvent('delete', '2026-11-09 10:00:00')];
    const rawB = [rawEvent('move', '2026-11-10 14:00:00'), rawEvent('create', '2026-11-09 11:00:00')];
    const preparedA = prepareCalendarEvents(rawA);
    const indexA = buildCalendarDayIndex(preparedA, days);
    const preparedB = prepareCalendarEvents(rawB);
    const indexB = buildCalendarDayIndex(preparedB, days);
    expect(ids(indexA.byDay['2026-11-09'])).toEqual(['move', 'delete']);
    expect(ids(indexB.byDay['2026-11-09'])).toEqual(['create']);
    expect(ids(indexB.byDay['2026-11-10'])).toEqual(['move']);
    expect(indexB.byDayHour['2026-11-09-09'] || []).toEqual([]);
    expect(ids(indexB.byDayHour['2026-11-10-14'])).toEqual(['move']);
    expect(indexB).not.toBe(indexA);
    expect(indexB.byDay).not.toBe(indexA.byDay);
    expect(indexB.byDayHour).not.toBe(indexA.byDayHour);
    const secondA = buildCalendarDayIndex(preparedA, days);
    expect(secondA).toEqual(indexA);
    expect(secondA.byDay['2026-11-09']).not.toBe(indexA.byDay['2026-11-09']);
    indexB.byDay['2026-11-09'].push({ id: 'consumer-only' });
    expect(ids(buildCalendarDayIndex(preparedB, days).byDay['2026-11-09'])).toEqual(['create']);
    expect(ids(indexA.byDay['2026-11-09'])).toEqual(['move', 'delete']);
  });

  it('accepte les réponses absentes/vides et les jours absents sans état résiduel', () => {
    for (const raw of [undefined, null, []]) {
      const prepared = prepareCalendarEvents(raw);
      expect(prepared).toEqual([]);
      expect(buildCalendarDayIndex(prepared, [localDate('2026-11-09')]).byDay['2026-11-09'] || []).toEqual([]);
      expect(buildCalendarAgenda(prepared, localDate('2026-11-09'))).toEqual([]);
    }
    for (const days of [undefined, null, []]) {
      expect(buildCalendarDayIndex(prepareCalendarEvents(fixtures), days)).toEqual({ byDay: {}, byDayHour: {} });
    }
  });

  it('ne mute ni arrays, ni entrées préparées, ni objets Date pendant les dérivations', () => {
    const now = localDate('2026-03-29', '08:00:00');
    const days = [localDate('2026-03-29'), localDate('2026-03-30')];
    const raw = fixtures.map(event => Object.freeze({ ...event }));
    Object.freeze(raw);
    const prepared = prepareCalendarEvents(raw, now);
    const snapshot = structuredClone(prepared);
    prepared.forEach(entry => { Object.freeze(entry.event); Object.freeze(entry.start); if (entry.end) Object.freeze(entry.end); if (entry.recurrenceEnd) Object.freeze(entry.recurrenceEnd); Object.freeze(entry); });
    Object.freeze(prepared);
    days.forEach(Object.freeze);
    Object.freeze(days);
    const before = [now.getTime(), ...days.map(day => day.getTime())];
    buildCalendarDayIndex(prepared, days);
    prepared.forEach(entry => isPreparedEventOnDay(entry, days[0]));
    const agenda = buildCalendarAgenda(prepared, now, Object.freeze([]), Object.freeze([]));
    expect(prepared).toEqual(snapshot); // Object.freeze(Date) seul ne bloque pas setHours : comparaison nécessaire
    expect([now.getTime(), ...days.map(day => day.getTime())]).toEqual(before);
    for (const event of agenda.filter(event => event.occurrenceStart)) {
      expect(event.occurrenceStart).toBeInstanceOf(Date);
      expect(event).not.toBe(prepared.find(entry => entry.event.id === event.id).event);
    }
  });
});

describe('calendarViewModel — Agenda à une heure réelle, filtres et ordre stable', () => {
  it('égale l’ancien Agenda pour toutes les combinaisons de filtres', () => {
    const now = localDate('2026-03-29', '10:00:00');
    freezeClock(now);
    const raw = fixtures.concat([
      rawEvent('work-user2', '2026-03-29 11:20:00', { category: 'work', userId: 2 }),
      rawEvent('same-time-later', '2026-03-29 11:20:00', { userId: 2 }),
      rawEvent('expired', '2025-01-01 10:00:00', { recurrence: 'daily', recurrenceEndDate: '2026-03-28' }),
    ]);
    const prepared = prepareCalendarEvents(raw, now);
    for (const categories of [[], ['work'], ['other'], ['work', 'other'], ['absent']]) {
      for (const members of [[], [1], [2], [1, 2], ['1'], [999]]) {
        expect(agendaSignature(buildCalendarAgenda(prepared, now, categories, members))).toEqual(agendaSignature(previousAgenda(raw, now, categories, members)));
      }
    }
  });

  it('filtre avant la recherche d’occurrence, sans seuil temporel flaky', () => {
    const raw = [
      rawEvent('excluded-category', '2032-01-01 10:00:00', { recurrence: 'yearly', category: 'work', userId: 1 }),
      rawEvent('excluded-member', '2032-01-01 10:00:00', { recurrence: 'yearly', category: 'other', userId: 2 }),
      rawEvent('included', '2026-11-01 10:00:00', { recurrence: 'daily', category: 'other', userId: 1 }),
    ];
    const now = localDate('2026-11-09', '12:00:00');
    const prepared = prepareCalendarEvents(raw, now);
    const search = vi.spyOn(recurrenceEngine, 'getNextRecurringEventDate');
    expect(ids(buildCalendarAgenda(prepared, now, ['other'], [1]))).toEqual(['included']);
    expect(search).toHaveBeenCalledTimes(1);
    expect(search.mock.calls[0][0].getTime()).toBe(previousParser(raw[2].startDate).getTime());
  });

  it('évolue à l’intérieur d’une même journée, à l’égalité exacte et à minuit', () => {
    const raw = [
      rawEvent('one-off', '2026-11-09 23:50:00'),
      rawEvent('daily', '2026-11-01 23:50:00', { recurrence: 'daily', recurrenceEndDate: '2026-11-10 00:00:00' }),
      rawEvent('next-midnight', '2026-11-10 00:00:00'),
    ];
    const prepared = prepareCalendarEvents(raw, localDate('2026-11-09', '08:00:00'));
    for (const now of [localDate('2026-11-09', '23:49:59'), localDate('2026-11-09', '23:50:00'), localDate('2026-11-09', '23:50:01'), localDate('2026-11-09', '23:59:59'), localDate('2026-11-10', '00:00:00'), localDate('2026-11-10', '23:50:01')]) {
      expect(agendaSignature(buildCalendarAgenda(prepared, now))).toEqual(agendaSignature(previousAgenda(raw, now)));
    }
    expect(ids(buildCalendarAgenda(prepared, localDate('2026-11-09', '23:50:00')))).toEqual(['one-off', 'daily', 'next-midnight']);
    const late = buildCalendarAgenda(prepared, localDate('2026-11-09', '23:59:59'));
    expect(ids(late)).toEqual(['next-midnight', 'daily']);
    expect(late[1].occurrenceStart.getTime()).toBe(localDate('2026-11-10', '23:50:00').getTime());
    expect(buildCalendarAgenda(prepared, localDate('2026-11-10', '23:50:01'))).toEqual([]);
  });

  it('préserve la limite de recherche du moteur (série hors des cinq ans)', () => {
    const now = localDate('2026-11-09');
    const raw = [rawEvent('far-away', '2035-01-01 09:00:00', { recurrence: 'yearly' })];
    expect(buildCalendarAgenda(prepareCalendarEvents(raw, now), now)).toEqual(previousAgenda(raw, now));
    expect(buildCalendarAgenda(prepareCalendarEvents(raw, now), now)).toEqual([]);
  });
});

describe('calendarViewModel — TZ isolé dans des sous-processus Node', () => {
  it.each(['Europe/Zurich', 'UTC', 'America/New_York'])('garde les heures locales/UTC et les jours calendaires DST en %s', tz => {
    // Sous-processus pour ne pas modifier TZ globalement dans les workers Vitest.
    // Aucun réseau, app, BD ou donnée privée ; uniquement ces helpers et fixtures.
    const helperUrl = new URL('./calendarViewModel.js', import.meta.url).href;
    const engineUrl = new URL('./eventRecurrence.js', import.meta.url).href;
    const script = `
      import assert from 'node:assert/strict';
      import { parseCalendarLocalDate as parse, prepareCalendarEvents as prepare, isPreparedEventOnDay as onDay, buildCalendarDayIndex as index, buildCalendarAgenda as agenda } from ${JSON.stringify(helperUrl)};
      import { isRecurringEventOnDay } from ${JSON.stringify(engineUrl)};
      const dates = ['2026-03-29 01:30:00', '2026-03-29 03:30:00', '2026-10-25 02:30:00'];
      for (const text of dates) {
        const [y, m, d, h, min, sec] = text.match(/\\d+/g).map(Number);
        assert.equal(parse(text, false).getTime(), new Date(y, m - 1, d, h, min, sec).getTime());
        assert.equal(parse(text, true).getTime(), Date.UTC(y, m - 1, d, h, min, sec));
      }
      const local = (value) => parse(value, false);
      const dayKey = date => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
      const start = local('2026-03-22 10:15:19');
      const days = [local('2026-03-29 12:00:00'), local('2026-04-05 12:00:00')];
      const weekly = prepare([{ id: 'spring', startDate: '2026-03-22 10:15:19', recurrence: 'weekly', recurrenceEndDate: '2026-04-05 00:00:00' }]);
      for (const day of days) {
        assert.equal(onDay(weekly[0], day), isRecurringEventOnDay(start, 'weekly', day, local('2026-04-05 00:00:00')));
        assert.equal(onDay(weekly[0], day), true);
        assert.deepEqual(index(weekly, [day]).byDayHour[dayKey(day) + '-10'].map(e => e.id), ['spring']);
      }
      const autumn = prepare([{ id: 'autumn', startDate: '2026-10-18 10:15:19', recurrence: 'weekly' }]);
      assert.equal(onDay(autumn[0], local('2026-10-25 12:00:00')), true);
      const next = agenda(weekly, local('2026-03-29 10:15:20'));
      assert.equal(next[0].occurrenceStart.getTime(), local('2026-04-05 10:15:19').getTime());
      const utc = prepare([{ id: 'utc-midnight', startDate: '2026-03-28 23:30:00', isUtc: 1 }]);
      const expected = new Date(Date.UTC(2026, 2, 28, 23, 30));
      const target = new Date(expected.getFullYear(), expected.getMonth(), expected.getDate());
      assert.equal(onDay(utc[0], target), true);
      assert.deepEqual(index(utc, [target]).byDayHour[dayKey(target) + '-' + String(expected.getHours()).padStart(2, '0')].map(e => e.id), ['utc-midnight']);
      if (process.env.TZ === 'Europe/Zurich') {
        assert.equal(dayKey(expected), '2026-03-29');
        assert.equal(expected.getHours(), 0);
        assert.equal((local('2026-03-29 10:15:19') - start) / 3600000, 167);
        assert.equal((local('2026-10-25 10:15:19') - local('2026-10-18 10:15:19')) / 3600000, 169);
      }
      console.log('fixtures-TZ-ok');
    `;
    const result = spawnSync(process.execPath, ['--input-type=module', '--eval', script], {
      env: { ...process.env, TZ: tz }, encoding: 'utf8', timeout: 20000,
    });
    expect(result.error, result.stderr).toBeUndefined();
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('fixtures-TZ-ok');
  });
});
