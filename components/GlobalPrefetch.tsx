/**
 * GlobalPrefetch — Lance les requêtes critiques en arrière-plan dès la connexion
 * pour que les pages soient déjà chargées quand l'utilisateur swipe vers elles.
 * Ce composant ne rend rien visuellement.
 */
import { useEffect, useState } from 'react';
import { trpc } from '../lib/trpc';

const STALE_10MIN = 10 * 60 * 1000;

export default function GlobalPrefetch() {
  // Délai de 5s pour laisser le Dashboard s'afficher avant de lancer les requêtes de fond
  // Évite la congestion réseau au démarrage (30+ requêtes simultanées)
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  // Prefetch silencieux — uniquement les données essentielles, staleTime 10min
  trpc.family.list.useQuery(undefined, { enabled: ready, staleTime: STALE_10MIN });
  trpc.tasks.list.useQuery(undefined, { enabled: ready, staleTime: STALE_10MIN });
  trpc.requests.list.useQuery(undefined, { enabled: ready, staleTime: STALE_10MIN });

  return null;
}