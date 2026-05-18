/**
 * GlobalPrefetch — Lance les requêtes critiques en arrière-plan dès la connexion
 * pour que les pages soient déjà chargées quand l'utilisateur swipe vers elles.
 * Ce composant ne rend rien visuellement.
 */
import { useEffect, useState } from 'react';
import { trpc } from '../lib/trpc';

const STALE_2MIN = 2 * 60 * 1000;
const STALE_5MIN = 5 * 60 * 1000;

export default function GlobalPrefetch() {
  // Délai de 200ms pour laisser le Dashboard se monter avant de lancer les prefetch
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 200);
    return () => clearTimeout(timer);
  }, []);

  // Prefetch silencieux — les données seront dans le cache React Query
  // quand les pages se montent pour la première fois
  trpc.tasks.list.useQuery(undefined, { enabled: ready, staleTime: STALE_2MIN });
  trpc.notes.list.useQuery(undefined, { enabled: ready, staleTime: STALE_2MIN });
  trpc.rewards.list.useQuery(undefined, { enabled: ready, staleTime: STALE_2MIN });
  trpc.rewards.myPoints.useQuery(undefined, { enabled: ready, staleTime: STALE_2MIN });
  trpc.requests.list.useQuery(undefined, { enabled: ready, staleTime: STALE_2MIN });
  trpc.family.list.useQuery(undefined, { enabled: ready, staleTime: STALE_5MIN });

  return null;
}