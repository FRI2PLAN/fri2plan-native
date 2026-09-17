import { describe, expect, it } from 'vitest';
import { getNextRecurringEventDate, hasNativeRecurrence, isNativeFri2PlanEvent, isRecurringEventOnDay } from './eventRecurrence.js';

const date = (value) => new Date(`${value}T10:30:00`);

describe('récurrence native des événements', () => {
  it('réserve les occurrences locales aux événements créés dans Fri2Plan', () => {
    expect(isNativeFri2PlanEvent({ id: 1 })).toBe(true);
    expect(isNativeFri2PlanEvent({ id: 2, icalUid: 'external-uid' })).toBe(false);
    expect(isNativeFri2PlanEvent({ id: 3, calendarSubscriptionId: 4 })).toBe(false);
    expect(hasNativeRecurrence({ recurrence: 'weekly' })).toBe(true);
    expect(hasNativeRecurrence({ recurrence: 'weekly', icalUid: 'external-uid' })).toBe(false);
  });

  it('calcule correctement les rythmes quotidien, hebdomadaire, mensuel et annuel', () => {
    const start = date('2026-03-10');
    expect(isRecurringEventOnDay(start, 'daily', date('2026-03-14'))).toBe(true);
    expect(isRecurringEventOnDay(start, 'weekly', date('2026-03-17'))).toBe(true);
    expect(isRecurringEventOnDay(start, 'weekly', date('2026-03-16'))).toBe(false);
    expect(isRecurringEventOnDay(start, 'monthly', date('2026-07-10'))).toBe(true);
    expect(isRecurringEventOnDay(start, 'monthly', date('2026-07-11'))).toBe(false);
    expect(isRecurringEventOnDay(start, 'yearly', date('2027-03-10'))).toBe(true);
    expect(isRecurringEventOnDay(start, 'yearly', date('2027-04-10'))).toBe(false);
  });

  it('respecte la date de fin et trouve la prochaine occurrence sans toucher aux imports', () => {
    const start = date('2026-03-10');
    const end = date('2026-03-24');
    expect(isRecurringEventOnDay(start, 'weekly', date('2026-03-24'), end)).toBe(true);
    expect(isRecurringEventOnDay(start, 'weekly', date('2026-03-31'), end)).toBe(false);
    expect(getNextRecurringEventDate(start, 'weekly', date('2026-03-11'), end)?.toISOString()).toContain('2026-03-17T');
    expect(getNextRecurringEventDate(start, 'weekly', date('2026-03-25'), end)).toBeNull();
  });
});
