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

  it('conserve le cache du même compte tout en le purgeant avant le rendu d’un autre compte', () => {
    expect(app).toContain("const QUERY_CACHE_OWNER_KEY = '@fri2plan:query_cache_owner'");
    expect(app).toContain('const cachedOwnerId = await AsyncStorage.getItem(QUERY_CACHE_OWNER_KEY)');
    expect(app).toContain('if (cachedOwnerId !== ownerId)');
    expect(app).toContain('setSessionCacheReady(true)');
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
