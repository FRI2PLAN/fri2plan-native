import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const calendar = readFileSync(new URL('./CalendarScreen.tsx', import.meta.url), 'utf8');
const calendarViewModel = readFileSync(new URL('../lib/calendarViewModel.js', import.meta.url), 'utf8');
const quickCreate = readFileSync(new URL('../components/QuickCreateModal.tsx', import.meta.url), 'utf8');

describe('Calendrier — récurrence native', () => {
  it('envoie la fréquence avec les événements créés dans Fri2Plan', () => {
    expect(quickCreate).toContain('const [eventRecurrence, setEventRecurrence]');
    expect(quickCreate).toContain('recurrence: eventRecurrence');
    expect(quickCreate).toContain('recurrenceEndDate: eventRecurrence !== \'none\' && eventRecurrenceEndDate');
    expect(quickCreate).toContain("category === 'birthday' && eventRecurrence === 'none'");
  });

  it('affiche les occurrences natives dans les vues calendrier et agenda', () => {
    expect(calendarViewModel).toMatch(/from\s+['"](?:\.\/|\.\.\/lib\/)eventRecurrence\.js['"]/);
    expect(calendarViewModel).toMatch(/isRecurringEventOnDay\s*\(/);
    expect(calendarViewModel).toMatch(/getNextRecurringEventDate\s*\(/);
    expect(calendarViewModel).toContain('hasNativeRecurrence');
    expect(calendarViewModel).toContain('recurrenceEnd');
    expect(calendar).toMatch(/buildCalendarDayIndex\s*\(/);
    expect(calendar).toMatch(/\.byDay\s*\[/);
    expect(calendar).toMatch(/\.byDayHour\s*\[/);
    expect(calendar).toMatch(/buildCalendarAgenda\s*\(/);
    expect(calendar).toContain('const weekDays = useMemo(() => {');
    expect(calendar).toContain('return eachDayOfInterval({');
    expect(calendar).toContain('weekDays.map(({ day }) => (');
    expect(calendar).toContain('const occurrenceStart = hasNativeRecurrence(event)');
  });

  it('ne modifie pas la fréquence des événements pilotés par une source externe', () => {
    expect(calendar).toContain('isExternallyManagedEvent ? {} : { recurrence: formData.recurrence }');
    expect(calendar).toContain('!selectedEvent?.icalUid && !selectedEvent?.calendarSubscriptionId && !selectedEvent?.syncedCalendarId');
  });

  it('fait supprimer toute la série lorsqu’un événement récurrent est supprimé', () => {
    expect(calendar).toContain("const isRecurringSeries = hasNativeRecurrence(selectedEvent);");
    expect(calendar).toContain("t('calendar.deleteSeriesTitle')");
    expect(calendar).toContain("t('calendar.deleteSeriesConfirm', { title: selectedEvent.title })");
  });
});
