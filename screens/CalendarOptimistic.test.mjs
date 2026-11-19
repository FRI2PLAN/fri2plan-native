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

  it('modifie et supprime localement, puis réconcilie seulement l’objet sans restaurer un cache périmé', () => {
    expect(screen).toContain('const previousEvent = calendarUtils.events.list.getData(undefined)?.find');
    expect(screen).toContain('previous?.filter(event => event.id !== eventId)');
    expect(screen).toContain('rollbackEventUpdate(events, previousEvent, optimisticEvent)');
    expect(screen).toContain('rollbackEventDelete(events, previousEvent, optimisticList)');
    expect(screen).toContain('if (isEventNotFound(error))');
    expect(screen).not.toContain('calendarUtils.events.list.setData(undefined, previousEvents)');
  });

  it('ouvre et ferme la modale sans attendre le nettoyage du formulaire', () => {
    expect(screen).toContain('const closeEditModal = () => {');
    expect(screen).toContain('setEditModalOpen(false);');
    expect(screen).toContain('setTimeout(() => {');
    expect(screen).toContain('}, 260);');
    expect(screen).toContain('setEditModalOpen(true);');
    expect(screen).toContain('requestAnimationFrame(() => {');
  });

  it('change la vue avant la persistance AsyncStorage et mémorise l’agenda filtré', () => {
    expect(screen).toContain('setViewMode(mode);');
    expect(screen).toContain("void AsyncStorage.setItem('calendar_view_mode', mode).catch(() => {});");
    expect(screen).toContain('const agendaEvents = useMemo(() => {');
    expect(screen).toContain('agendaEvents.map((event, index, arr) => {');
  });
});
