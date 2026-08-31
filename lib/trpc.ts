import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import type { AppRouter } from './types';
import { TRPC_API_URL } from './apiConfig';

export const trpc = createTRPCReact<AppRouter>();
export const API_URL = TRPC_API_URL;

// Délai exponentiel entre les tentatives (ms)
const RETRY_DELAYS = [1000, 2000, 4000]; // 3 tentatives max
const SUPPORTED_LANGUAGES = ['fr', 'en', 'de', 'es', 'it'];

const getActiveLanguageHeader = async () => {
  const savedLanguage = await AsyncStorage.getItem('@fri2plan_language');
  const deviceLanguage = Localization.getLocales()[0]?.languageCode;
  const language = (savedLanguage || deviceLanguage || 'fr').toLowerCase().split('-')[0];
  return SUPPORTED_LANGUAGES.includes(language) ? language : 'fr';
};

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
        url: TRPC_API_URL,
        transformer: superjson,
        async headers() {
          const token = await AsyncStorage.getItem('authToken');
          const activeFamilyId = await AsyncStorage.getItem('active_family_id');
          const language = await getActiveLanguageHeader();
          const headers: Record<string, string> = {
            authorization: token ? `Bearer ${token}` : '',
            'accept-language': language,
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
