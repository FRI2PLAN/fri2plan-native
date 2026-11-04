import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateSession, clearSessionCookie, familyListState, SESSION_STORAGE_KEYS } from './sessionAuth.ts';

const freshUser = { id: 101, name: 'Synthetic admin', familyId: 777, familyRole: 'admin' };
const response = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
const success = (user = freshUser) => response({ result: { data: { json: user } } });

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('server-confirmed Bearer session', () => {
  it('ignores an old cookie, sends the candidate Bearer, and returns only the fresh server profile', async () => {
    const cookieJar = 'old-account-cookie';
    const fetchMock = vi.fn(async (url, options) => {
      const selected = options.credentials === 'omit' && options.headers.Authorization === 'Bearer new-token'
        ? freshUser : { id: 202, name: cookieJar };
      return success(selected);
    });
    vi.stubGlobal('fetch', fetchMock);
    await expect(validateSession('new-token', 101)).resolves.toEqual(freshUser);
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/trpc\/auth\.me$/);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ credentials: 'omit', headers: { Authorization: 'Bearer new-token' } });
    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty('Cookie');
  });

  it.each([401, 403])('rejects HTTP %i rather than accepting a local profile', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({}, status)));
    await expect(validateSession('expired', 101)).rejects.toMatchObject({ reason: 'invalid' });
  });

  it.each([null, { id: 202, name: 'Another account' }])('rejects HTTP 200 null or a mismatched identity', async (user) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(success(user)));
    await expect(validateSession('candidate', 101)).rejects.toMatchObject({ reason: 'invalid' });
  });

  it('does not fail open for a malformed success or a server error', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response({ result: {} })).mockResolvedValueOnce(response({}, 500));
    vi.stubGlobal('fetch', fetchMock);
    await expect(validateSession('candidate', 101)).rejects.toMatchObject({ reason: 'unavailable' });
    await expect(validateSession('candidate', 101)).rejects.toMatchObject({ reason: 'unavailable' });
  });

  it('retries 503 then uses the confirmed profile', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response({}, 503)).mockResolvedValueOnce(success());
    vi.stubGlobal('fetch', fetchMock);
    const pending = validateSession('candidate', 101);
    const assertion = expect(pending).resolves.toEqual(freshUser);
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('reports unavailable after network retries, never a cached user', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Offline'));
    vi.stubGlobal('fetch', fetchMock);
    const assertion = expect(validateSession('candidate', 101)).rejects.toMatchObject({ reason: 'unavailable' });
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('bounds timeouts and reports unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn((url, options) => new Promise((resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    })));
    const assertion = expect(validateSession('candidate', 101)).rejects.toMatchObject({ reason: 'unavailable' });
    await vi.runAllTimersAsync();
    await assertion;
  });

  it('expires only the cookie through public auth.logout, without an old Bearer, and tolerates offline cleanup', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ result: { data: { json: { success: true } } } }));
    vi.stubGlobal('fetch', fetchMock);
    await clearSessionCookie();
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/auth\.logout$/);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ credentials: 'include', method: 'POST' });
    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty('Authorization');
    fetchMock.mockRejectedValue(new TypeError('Offline'));
    await expect(clearSessionCookie()).resolves.toBeUndefined();
  });

  it('keeps non-auth preferences and uses DEV URL only when explicitly supplied', async () => {
    expect(SESSION_STORAGE_KEYS).toContain('authToken');
    expect(SESSION_STORAGE_KEYS).toContain('active_family_id');
    expect(SESSION_STORAGE_KEYS).toContain('@fri2plan:query_cache');
    for (const key of ['@fri2plan_language', 'hasSeenOnboarding', 'rememberMe_email', 'active_family_id_101', 'dashboard_favorites_777']) {
      expect(SESSION_STORAGE_KEYS).not.toContain(key);
    }
    vi.stubEnv('EXPO_PUBLIC_API_URL', 'https://synthetic-dev.example/api/trpc/');
    vi.resetModules();
    const { API_URL } = await import('./apiConfig.ts');
    expect(API_URL).toBe('https://synthetic-dev.example/api/trpc');
  });
});

describe('family.list status is not absence', () => {
  const state = (overrides = {}) => familyListState({ isPending: false, isFetching: false, isSuccess: false, ...overrides });
  it('shows loading for the pending query, including offline and refreshing cached empty data', () => {
    expect(state({ isPending: true })).toBe('loading');
    expect(state({ data: [], isSuccess: true, isFetching: true })).toBe('loading');
  });
  it('distinguishes network errors and invalid sessions even when a cached list exists', () => {
    expect(state({ error: new TypeError('Offline') })).toBe('error');
    expect(state({ data: [], error: { data: { code: 'UNAUTHORIZED', httpStatus: 401 } } })).toBe('session-invalid');
    expect(state({ data: [freshUser], error: { data: { code: 'FORBIDDEN' } } })).toBe('session-invalid');
  });
  it('only a successful array can be empty; no data/malformed data is an error', () => {
    expect(state()).toBe('error');
    expect(state({ isSuccess: true, data: null })).toBe('error');
    expect(state({ isSuccess: true, data: [] })).toBe('empty');
    expect(state({ isSuccess: true, data: [{ id: 777 }] })).toBe('ready');
  });
  it('wires Retry/refetch to circles and guards setup actions without touching scroll or member swipe', () => {
    const source = readFileSync(new URL('../screens/DashboardScreen.tsx', import.meta.url), 'utf8');
    expect(source).toContain("circlesState === 'empty' ? (");
    expect(source).toContain('const result = await refetchFamilies();');
    expect(source).toContain("handleLogout : () => { void refetchFamilies(); }");
    expect(source).toContain("networkMode: 'always'");
    for (const language of ['fr', 'en', 'de', 'es', 'it']) {
      const locale = JSON.parse(readFileSync(new URL(`../locales/${language}.json`, import.meta.url), 'utf8'));
      expect(locale.auth.sessionVerificationUnavailable).toBeTruthy();
      expect(locale.dashboard.circlesLoadError).toBeTruthy();
    }
  });
});
