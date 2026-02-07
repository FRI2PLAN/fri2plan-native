import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppRouter } from './types';

export const trpc = createTRPCReact<AppRouter>();

export const createTRPCClient = () => {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: 'https://app.fri2plan.ch/api/trpc',
        transformer: superjson,
        async headers() {
          const token = await AsyncStorage.getItem('authToken');
          return {
            authorization: token ? `Bearer ${token}` : '',
          };
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
