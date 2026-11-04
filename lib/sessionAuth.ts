import { API_URL as AUTH_URL } from './apiConfig';

export class SessionValidationError extends Error {
  constructor(public reason: 'invalid' | 'unavailable') {
    super(reason === 'invalid' ? 'Session invalid' : 'Session verification unavailable');
    this.name = 'SessionValidationError';
  }
}

export const SESSION_STORAGE_KEYS = [
  'authToken', 'user', 'active_family_id',
  '@fri2plan:query_cache', '@fri2plan:query_cache_owner',
  '@fri2plan:query_cache_family_scope', '@fri2plan:offline_queue',
];

export function isAuthError(error: any): boolean {
  const code = error?.data?.code ?? error?.error?.json?.data?.code;
  const status = error?.data?.httpStatus ?? error?.status;
  return code === 'UNAUTHORIZED' || code === 'FORBIDDEN' || status === 401 || status === 403;
}

// auth.me is public and may return HTTP 200 + null for an expired session.
// Never interpret a failed/malformed response as permission to use a local user.
export async function validateSession(authToken: string, expectedUserId?: number | string): Promise<any> {
  if (!authToken) throw new SessionValidationError('invalid');
  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(`${AUTH_URL}/auth.me`, {
        headers: { Authorization: `Bearer ${authToken}` },
        credentials: 'omit',
        signal: controller.signal,
      });
      if (response.status === 401 || response.status === 403) {
        throw new SessionValidationError('invalid');
      }
      if (response.status === 503 && attempt < 2) {
        // Retried below, without ever accepting the cached profile.
        throw new Error('Service unavailable');
      }
      if (!response.ok) throw new SessionValidationError('unavailable');
      const payload = await response.json();
      if (isAuthError(payload)) throw new SessionValidationError('invalid');
      const data = payload?.result?.data;
      const freshUser = data && Object.prototype.hasOwnProperty.call(data, 'json') ? data.json : data;
      if (freshUser === null) throw new SessionValidationError('invalid');
      if (!freshUser?.id) throw new SessionValidationError('unavailable');
      if (expectedUserId != null && String(freshUser.id) !== String(expectedUserId)) {
        throw new SessionValidationError('invalid');
      }
      return freshUser;
    } catch (error) {
      if (error instanceof SessionValidationError) throw error;
      if (attempt === 2) throw new SessionValidationError('unavailable');
    } finally {
      clearTimeout(timer);
    }
    await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 1000));
  }
  throw new SessionValidationError('unavailable');
}

// Best effort: this public mutation only expires the session cookie. It does not
// delete accounts or revoke other devices. Bearer validation never relies on it.
export async function clearSessionCookie(): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    await fetch(`${AUTH_URL}/auth.logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ json: null }),
      signal: controller.signal,
    });
  } catch {
    // Offline/native cookie jars may not clear; all authenticated requests omit cookies.
  } finally {
    clearTimeout(timer);
  }
}

export function familyListState(query: {
  data?: unknown; error?: unknown; isPending: boolean; isFetching: boolean; isSuccess: boolean;
}): 'loading' | 'error' | 'session-invalid' | 'empty' | 'ready' {
  if (query.error) return isAuthError(query.error) ? 'session-invalid' : 'error';
  if (query.isPending || (query.isFetching && (!Array.isArray(query.data) || query.data.length === 0))) return 'loading';
  if (!query.isSuccess || !Array.isArray(query.data)) return 'error';
  return query.data.length === 0 ? 'empty' : 'ready';
}
