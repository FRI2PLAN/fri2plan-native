import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');

describe('Cache persistant — démarrage rapide', () => {
  it('restaure les requêtes depuis AsyncStorage avant leur actualisation réseau', () => {
    expect(app).toContain("key: '@fri2plan:query_cache'");
    expect(app).toContain('<PersistQueryClientProvider');
    expect(app).toContain('persister: asyncStoragePersister');
  });

  it('conserve le cache pendant vingt-quatre heures et privilégie le réseau hors ligne', () => {
    expect(app).toContain('gcTime: 24 * 60 * 60 * 1000');
    expect(app).toContain("networkMode: 'offlineFirst'");
    expect(app).toContain('staleTime: 5 * 60 * 1000');
  });
});
