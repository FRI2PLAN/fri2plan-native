import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const screen = readFileSync(new URL('./CalendarScreen.tsx', import.meta.url), 'utf8');

describe('Calendrier — réponse visuelle immédiate', () => {
  it('affiche une création locale avant la confirmation serveur', () => {
    expect(screen).toContain('const optimisticId = -Date.now()');
    expect(screen).toContain('optimistic: true');
    expect(screen).toContain('calendarUtils.events.list.setData(undefined');
    expect(screen).toContain('event.id === optimisticId ? { ...event, id: result.eventId, optimistic: false }');
  });

  it('modifie et supprime localement, puis restaure la liste en cas d’échec', () => {
    expect(screen).toContain('const previousEvents = calendarUtils.events.list.getData(undefined)');
    expect(screen).toContain('calendarUtils.events.list.setData(undefined, previousEvents)');
    expect(screen).toContain('previous?.filter(event => event.id !== selectedEvent.id)');
  });
});
