/**
 * useOfflineQueue — File d'attente de mutations hors ligne
 *
 * Permet de stocker des actions (créer/modifier/supprimer) localement
 * quand l'appareil est hors ligne, puis de les rejouer automatiquement
 * dès que la connexion revient.
 *
 * Usage :
 *   const { enqueue, processQueue, queueSize } = useOfflineQueue();
 *   // Hors ligne : enqueue({ type: 'task.create', payload: { ... } })
 *   // En ligne   : processQueue(trpcUtils) rejoue toutes les actions en attente
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

const QUEUE_KEY = '@fri2plan:offline_queue';

export type OfflineAction =
  | { type: 'task.create'; payload: Record<string, unknown> }
  | { type: 'task.update'; payload: Record<string, unknown> }
  | { type: 'task.delete'; payload: { id: number } }
  | { type: 'task.complete'; payload: { id: number } }
  | { type: 'shopping.addItem'; payload: Record<string, unknown> }
  | { type: 'shopping.toggleItem'; payload: { id: number; checked: boolean } }
  | { type: 'shopping.deleteItem'; payload: { id: number } }
  | { type: 'note.create'; payload: Record<string, unknown> }
  | { type: 'note.update'; payload: Record<string, unknown> }
  | { type: 'note.delete'; payload: { id: number } }
  | { type: 'message.send'; payload: Record<string, unknown> };

export interface QueuedAction {
  id: string;
  action: OfflineAction;
  timestamp: number;
  retries: number;
}

async function loadQueue(): Promise<QueuedAction[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveQueue(queue: QueuedAction[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.warn('[OfflineQueue] Failed to save queue:', e);
  }
}

export function useOfflineQueue() {
  const [queueSize, setQueueSize] = useState(0);
  const queueRef = useRef<QueuedAction[]>([]);
  const isProcessingRef = useRef(false);

  // Charger la file au montage
  useEffect(() => {
    loadQueue().then(q => {
      queueRef.current = q;
      setQueueSize(q.length);
    });
  }, []);

  /**
   * Ajouter une action à la file d'attente
   */
  const enqueue = useCallback(async (action: OfflineAction) => {
    const item: QueuedAction = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      action,
      timestamp: Date.now(),
      retries: 0,
    };
    queueRef.current = [...queueRef.current, item];
    setQueueSize(queueRef.current.length);
    await saveQueue(queueRef.current);
    console.log(`[OfflineQueue] Enqueued: ${action.type} (total: ${queueRef.current.length})`);
  }, []);

  /**
   * Rejouer toutes les actions en attente
   * @param executor Fonction qui exécute une action (fournie par le composant parent avec accès à tRPC)
   */
  const processQueue = useCallback(async (
    executor: (action: OfflineAction) => Promise<void>
  ) => {
    if (isProcessingRef.current) return;
    if (queueRef.current.length === 0) return;

    isProcessingRef.current = true;
    console.log(`[OfflineQueue] Processing ${queueRef.current.length} queued actions...`);

    const remaining: QueuedAction[] = [];

    for (const item of queueRef.current) {
      try {
        await executor(item.action);
        console.log(`[OfflineQueue] ✓ Replayed: ${item.action.type}`);
      } catch (err) {
        console.warn(`[OfflineQueue] ✗ Failed: ${item.action.type}`, err);
        // Garder dans la file si < 3 tentatives
        if (item.retries < 3) {
          remaining.push({ ...item, retries: item.retries + 1 });
        } else {
          console.warn(`[OfflineQueue] Dropping after 3 retries: ${item.action.type}`);
        }
      }
    }

    queueRef.current = remaining;
    setQueueSize(remaining.length);
    await saveQueue(remaining);
    isProcessingRef.current = false;

    console.log(`[OfflineQueue] Done. ${remaining.length} actions remaining.`);
  }, []);

  /**
   * Vider la file (utile lors de la déconnexion)
   */
  const clearQueue = useCallback(async () => {
    queueRef.current = [];
    setQueueSize(0);
    await AsyncStorage.removeItem(QUEUE_KEY);
  }, []);

  return { enqueue, processQueue, clearQueue, queueSize };
}
