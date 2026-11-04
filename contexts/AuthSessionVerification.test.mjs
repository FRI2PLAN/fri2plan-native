import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Small hook harness: no native runtime, extra dependency, server or real account.
const harness = vi.hoisted(() => ({
  values: [], dependencies: [], cursor: 0, effects: [], storage: new Map(), events: [],
  secure: new Map(), clearQueries: vi.fn(), cancelQueries: vi.fn(async () => {}), clearQueue: vi.fn(async () => {}),
}));
vi.mock('react', () => {
  const changed = (a, b) => !a || a.length !== b.length || a.some((value, index) => value !== b[index]);
  const React = {
    createContext: () => ({ Provider: 'Provider' }),
    createElement: (type, props) => ({ type, props }),
    useState: initial => {
      const index = harness.cursor++;
      if (!(index in harness.values)) harness.values[index] = initial;
      return [harness.values[index], value => { harness.values[index] = value; }];
    },
    useRef: initial => {
      const index = harness.cursor++;
      return harness.values[index] ?? (harness.values[index] = { current: initial });
    },
    useCallback: (callback, deps) => {
      const index = harness.cursor++;
      if (changed(harness.dependencies[index], deps)) { harness.values[index] = callback; harness.dependencies[index] = deps; }
      return harness.values[index];
    },
    useEffect: (callback, deps) => {
      const index = harness.cursor++;
      if (changed(harness.dependencies[index], deps)) { harness.dependencies[index] = deps; harness.effects.push(callback); }
    },
    useContext: () => {},
  };
  return { ...React, default: React };
});
vi.mock('@react-native-async-storage/async-storage', () => ({ default: {
  getItem: vi.fn(async key => harness.storage.get(key) ?? null),
  setItem: vi.fn(async (key, value) => { harness.events.push(`store:${key}`); harness.storage.set(key, value); }),
  multiSet: vi.fn(async entries => { harness.events.push('store:verified'); for (const [key, value] of entries) harness.storage.set(key, value); }),
  multiRemove: vi.fn(async keys => { harness.events.push('clear:local'); for (const key of keys) harness.storage.delete(key); }),
  removeItem: vi.fn(async key => { harness.storage.delete(key); }),
} }));
vi.mock('react-native', () => ({ AppState: { currentState: 'active', addEventListener: vi.fn(() => ({ remove() {} })) } }));
vi.mock('expo-secure-store', () => ({ deleteItemAsync: vi.fn(async key => { harness.secure.delete(key); }) }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ cancelQueries: harness.cancelQueries, clear: harness.clearQueries }) }));
vi.mock('./OfflineContext', () => ({ useOffline: () => ({ clearQueue: harness.clearQueue }) }));
vi.mock('../i18n', () => ({ getCurrentLanguage: () => 'fr', syncLanguagePreference: vi.fn(async () => {}) }));

import { AuthProvider } from './AuthContext.tsx';

const current = () => { harness.cursor = 0; return AuthProvider({ children: null }).props.value; };
const settle = async () => { for (let i = 0; i < 25; i++) await Promise.resolve(); };
const mount = async () => { current(); for (const effect of harness.effects.splice(0)) effect(); await settle(); return current(); };
const user = { id: 101, name: 'Synthetic profile', familyId: 777 };
const ok = data => new Response(JSON.stringify({ result: { data: { json: data } } }), { status: 200 });
const seed = () => {
  harness.storage.set('authToken', 'old-token');
  harness.storage.set('user', JSON.stringify({ ...user, name: 'Cached profile' }));
  harness.storage.set('hasSeenOnboarding', 'true');
  harness.storage.set('@fri2plan_language', 'it');
  harness.storage.set('active_family_id_101', '778');
  harness.storage.set('active_family_id', '778');
  harness.storage.set('@fri2plan:query_cache', 'private-cache');
  harness.storage.set('@fri2plan:query_cache_owner', '101');
  harness.secure.set('biometric_auth_token', 'old-token');
  harness.secure.set('biometric_auth_user', JSON.stringify(user));
  harness.secure.set('biometric_enabled', 'true');
};

beforeEach(() => {
  harness.values = []; harness.dependencies = []; harness.cursor = 0; harness.effects = [];
  harness.storage.clear(); harness.secure.clear(); harness.events = []; vi.clearAllMocks();
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('AuthProvider session boundaries', () => {
  it('restores only the server profile, never accepts the cached profile first', async () => {
    seed();
    let resolve;
    vi.stubGlobal('fetch', vi.fn(() => new Promise(r => { resolve = r; })));
    const pendingMount = mount();
    await settle();
    expect(current()).toMatchObject({ isAuthenticated: false, user: null, isLoading: true });
    resolve(ok(user));
    await pendingMount; await settle();
    expect(current()).toMatchObject({ isAuthenticated: true, user, token: 'old-token', isLoading: false });
    expect(JSON.parse(harness.storage.get('user')).name).toBe('Synthetic profile');
  });

  it('invalid restored sessions clear credentials, caches and biometric entries but preserve preferences', async () => {
    seed();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok(null)));
    await mount(); await settle();
    expect(current()).toMatchObject({ isAuthenticated: false, sessionError: 'invalid' });
    expect(harness.storage.has('authToken')).toBe(false);
    expect(harness.storage.has('@fri2plan:query_cache')).toBe(false);
    expect(harness.secure.size).toBe(0);
    expect(harness.storage.get('@fri2plan_language')).toBe('it');
    expect(harness.storage.get('hasSeenOnboarding')).toBe('true');
    expect(harness.storage.get('active_family_id_101')).toBe('778');
  });

  it('network/server restoration failure leaves credentials for retry, without authenticated UI', async () => {
    seed();
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);
    await mount();
    expect(current()).toMatchObject({ isAuthenticated: false, user: null, sessionError: 'unavailable', isLoading: false });
    expect(harness.storage.get('authToken')).toBe('old-token');
    expect(harness.secure.get('biometric_auth_token')).toBe('old-token');
    fetchMock.mockResolvedValue(ok(user));
    await current().retrySession();
    expect(current()).toMatchObject({ isAuthenticated: true, user, sessionError: null });
  });

  it('explicit login verifies the new Bearer before storing/showing auth, clears stale cache and retains the account circle', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url, options) => {
      if (url.endsWith('/auth.logout')) { harness.events.push('clear:cookie'); return ok({ success: true }); }
      if (url.endsWith('/auth.me')) {
        harness.events.push('verify:new');
        expect(options.headers.Authorization).toBe('Bearer new-token');
        expect(options.credentials).toBe('omit');
        expect(harness.storage.has('authToken')).toBe(false);
        expect(current().isAuthenticated).toBe(false);
        return ok(user);
      }
      return ok({});
    }));
    await mount(); seed();
    await current().login({ ...user, name: 'Unverified payload' }, 'new-token');
    expect(current()).toMatchObject({ isAuthenticated: true, user, token: 'new-token' });
    expect(harness.events.indexOf('clear:local')).toBeLessThan(harness.events.indexOf('verify:new'));
    expect(harness.events.indexOf('clear:cookie')).toBeLessThan(harness.events.indexOf('verify:new'));
    expect(harness.events.indexOf('verify:new')).toBeLessThan(harness.events.indexOf('store:verified'));
    expect(harness.storage.has('@fri2plan:query_cache')).toBe(false);
    expect(harness.storage.get('active_family_id')).toBe('778');
    expect(harness.storage.get('@fri2plan_language')).toBe('it');
  });

  it('failed explicit login does not persist the candidate or leave a false authenticated user', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok(null)));
    await mount(); seed();
    await expect(current().login(user, 'invalid-candidate')).rejects.toMatchObject({ reason: 'invalid' });
    expect(current()).toMatchObject({ isAuthenticated: false, user: null, token: null });
    expect(harness.storage.has('authToken')).toBe(false);
  });

  it('logout cancels old restoration and cleans memory, private caches and biometric credentials even offline', async () => {
    seed();
    let resolve;
    const fetchMock = vi.fn((url) => url.endsWith('/auth.me')
      ? new Promise(r => { resolve = r; }) : Promise.reject(new TypeError('Offline')));
    vi.stubGlobal('fetch', fetchMock);
    await mount();
    await current().logout();
    resolve(ok(user)); await settle();
    expect(current()).toMatchObject({ isAuthenticated: false, token: null, user: null, isLoading: false });
    expect(harness.storage.has('authToken')).toBe(false);
    expect(harness.storage.has('user')).toBe(false);
    expect(harness.storage.has('active_family_id')).toBe(false);
    expect(harness.storage.get('active_family_id_101')).toBe('778');
    expect(harness.clearQueries).toHaveBeenCalled();
    expect(harness.cancelQueries).toHaveBeenCalled();
    expect(harness.clearQueue).toHaveBeenCalled();
    expect(harness.secure.size).toBe(0);
    expect(harness.storage.get('@fri2plan_language')).toBe('it');
  });
});
