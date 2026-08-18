import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');

describe('Cache persistant — démarrage rapide', () => {
  it('restaure les requêtes depuis AsyncStorage avant leur actualisation réseau', () => {
    expect(app).toContain("key: '@fri2plan:query_cache'");
    expect(app).toContain('<PersistQueryClientProvider');
    expect(app).toContain('persister: asyncStoragePersister');
  });

  it('conserve le cache pendant sept jours et privilégie le réseau hors ligne', () => {
    expect(app).toContain('gcTime: 7 * 24 * 60 * 60 * 1000');
    expect(app).toContain('maxAge: 7 * 24 * 60 * 60 * 1000');
    expect(app).toContain("networkMode: 'offlineFirst'");
    expect(app).toContain('staleTime: 5 * 60 * 1000');
  });

  it('ne vide pas le cache pendant l’hydratation initiale du jeton', () => {
    expect(app).toContain('if (isLoading) return;');
    expect(app).toContain('if (!tokenHydrationHandledRef.current)');
    expect(app).toContain('tokenHydrationHandledRef.current = true;');
  });

  it('préchauffe les données principales du cercle actif après le premier rendu', () => {
    expect(app).toContain('function DataWarmup()');
    expect(app).toContain('InteractionManager.runAfterInteractions');
    expect(app).toContain('utils.auth.me.prefetch()');
    expect(app).toContain('utils.events.list.prefetch()');
    expect(app).toContain('utils.messages.list.prefetch({ familyId: activeFamilyId, limit: 50, offset: 0 })');
    expect(app).toContain('utils.rewards.familyPoints.prefetch({ familyId: activeFamilyId })');
  });
});
