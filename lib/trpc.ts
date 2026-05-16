import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppRouter } from './types';

export const trpc = createTRPCReact<AppRouter>();
export const API_URL = 'https://app.fri2plan.ch/api/trpc';

// Délai exponentiel entre les tentatives (ms)
const RETRY_DELAYS = [1000, 2000, 4000]; // 3 tentatives max

/**
 * fetch avec retry automatique pour les erreurs 503 / réseau.
 * Cloud Run peut retourner un 503 "Service Unavailable" pendant un cold start.
 * On réessaie jusqu'à 3 fois avec un délai croissant.
 */
async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  attempt = 0
): Promise<Response> {
  try {
    const response = await fetch(input, {
      ...(init ?? {}),
      credentials: 'include',
    });

    // Réessayer uniquement pour les 503 (cold start Cloud Run)
    if (response.status === 503 && attempt < RETRY_DELAYS.length) {
      console.warn(`[tRPC] 503 reçu, tentative ${attempt + 1}/${RETRY_DELAYS.length + 1} dans ${RETRY_DELAYS[attempt]}ms`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
      return fetchWithRetry(input, init, attempt + 1);
    }

    return response;
  } catch (networkError) {
    // Erreur réseau (timeout, pas de connexion, etc.)
    if (attempt < RETRY_DELAYS.length) {
      console.warn(`[tRPC] Erreur réseau, tentative ${attempt + 1}/${RETRY_DELAYS.length + 1} dans ${RETRY_DELAYS[attempt]}ms`, networkError);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
      return fetchWithRetry(input, init, attempt + 1);
    }
    throw networkError;
  }
}

export const createTRPCClient = () => {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: 'https://app.fri2plan.ch/api/trpc',
        transformer: superjson,
        async headers() {
          const token = await AsyncStorage.getItem('authToken');
          const activeFamilyId = await AsyncStorage.getItem('active_family_id');
          const headers: Record<string, string> = {
            authorization: token ? `Bearer ${token}` : '',
          };
          if (activeFamilyId) {
            headers['x-active-family-id'] = activeFamilyId;
          }
          return headers;
        },
        fetch: fetchWithRetry,
      }),
    ],
  });
};
