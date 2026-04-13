import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppRouter } from './types';

export const trpc = createTRPCReact<AppRouter>();
export const API_URL = 'https://app.fri2plan.ch/api/trpc';

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
        fetch(input, init) {
          return fetch(input, {
            ...(init ?? {}),
            credentials: 'include',
          });
        },
      }),
    ],
  });
};
