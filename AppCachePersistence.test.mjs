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

  it('place le verre familial au-dessus de toute la coque authentifiée', () => {
    expect(app).toContain('const [showFamilyLoading, setShowFamilyLoading] = useState(true)');
    expect(app).toContain('<View style={styles.familyLoadingOverlay} accessibilityViewIsModal>');
    expect(app).toContain('<FamilyLoadingScreen onComplete={() => setShowFamilyLoading(false)} />');
    expect(app).toContain('...StyleSheet.absoluteFillObject');
    expect(app).toContain('zIndex: 1000');
  });

  it('enchaîne une intro logo de trois secondes avant le verre familial', () => {
    expect(app).toContain("import FamilyLogoIntro from './components/FamilyLogoIntro'");
    expect(app).toContain("const [familyLoadingPhase, setFamilyLoadingPhase] = useState<'intro' | 'glass'>('intro')");
    expect(app).toContain("familyLoadingPhase === 'intro'");
    expect(app).toContain('<FamilyLogoIntro onComplete={() => setFamilyLoadingPhase(\'glass\')} />');
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
