import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const calendarScreen = readFileSync(new URL('./CalendarScreen.tsx', import.meta.url), 'utf8');

describe('Calendrier — transition entre vues', () => {
  it('anime uniquement les changements de vue avant de mémoriser le choix', () => {
    expect(calendarScreen).toContain('LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)');
    expect(calendarScreen).toContain('const handleViewModeChange');
    expect(calendarScreen).toContain('onPress={() => handleViewModeChange(mode)}');
  });

  it('rafraîchit aussi la fiche ICS après une synchronisation réussie', () => {
    expect(calendarScreen).toContain('const syncSubscription = trpc.events.syncSubscription.useMutation');
    expect(calendarScreen).toContain('await Promise.all([refetch(), refetchSubscriptions()]);');
    expect(calendarScreen).toContain('Synchronisation terminée');
  });
});
