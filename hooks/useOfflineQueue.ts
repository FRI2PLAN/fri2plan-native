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
import { isNoteOfflineAction, noteReplayBlockReason } from '../lib/noteScope';
import type { NoteScope } from '../lib/noteScope';

const QUEUE_KEY = '@fri2plan:offline_queue';

export type OfflineAction =
  | { type: 'task.create'; payload: Record<string, unknown> }
  | { type: 'task.update'; payload: Record<string, unknown> }
  | { type: 'task.delete'; payload: { taskId: number } }
  | { type: 'task.complete'; payload: { taskId: number } }
  | { type: 'shopping.addItem'; payload: Record<string, unknown> }
  | { type: 'shopping.toggleItem'; payload: { itemId: number; checked: boolean } }
  | { type: 'shopping.deleteItem'; payload: { itemId: number } }
  | { type: 'note.create'; payload: Record<string, unknown>; scope?: NoteScope }
  | { type: 'note.update'; payload: Record<string, unknown>; scope?: NoteScope }
  | { type: 'note.delete'; payload: { noteId: number }; scope?: NoteScope }
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

async function saveQueue(queue: QueuedAction[], strictNotes = false): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.warn('[OfflineQueue] Failed to save queue:', e);
    if (strictNotes) throw e;
  }
}

export function useOfflineQueue() {
  const [queueSize, setQueueSize] = useState(0);
  const queueRef = useRef<QueuedAction[]>([]);
  const isProcessingRef = useRef(false);
  const loadedQueueRef = useRef<Promise<void> | null>(null);

  // Charger la file au montage
  useEffect(() => {
    loadedQueueRef.current = loadQueue().then(q => {
      queueRef.current = q;
      setQueueSize(q.length);
    });
  }, []);

  /**
   * Ajouter une action à la file d'attente
   */
  const enqueue = useCallback(async (action: OfflineAction) => {
    if (isNoteOfflineAction(action)) {
      await loadedQueueRef.current;
      const noteAction = action as Extract<OfflineAction, { scope?: NoteScope }>;
      if (noteReplayBlockReason(noteAction, noteAction.scope ?? null)) {
        throw new Error('Notes require an explicit immutable origin scope');
      }
      action = Object.freeze({ ...noteAction, scope: Object.freeze({ ...noteAction.scope! }),
        payload: Object.freeze({ ...noteAction.payload }) }) as OfflineAction;
    }
    const item: QueuedAction = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      action,
      timestamp: Date.now(),
      retries: 0,
    };
    queueRef.current = [...queueRef.current, item];
    setQueueSize(queueRef.current.length);
    await saveQueue(queueRef.current, isNoteOfflineAction(action));
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

    let remaining: QueuedAction[] = [];
    const originalNoteIds = new Set(queueRef.current.filter(item => isNoteOfflineAction(item.action)).map(item => item.id));

    for (const item of queueRef.current) {
      try {
        await executor(item.action);
        console.log(`[OfflineQueue] ✓ Replayed: ${item.action.type}`);
      } catch (err) {
        console.warn(`[OfflineQueue] ✗ Failed: ${item.action.type}`, err);
        // Notes never lose an unresolved origin or a denied/mismatched action.
        // Other action types keep their existing retry/drop behavior.
        if (isNoteOfflineAction(item.action)) {
          remaining.push(item);
          continue;
        }
        // Garder dans la file si < 3 tentatives
        if (item.retries < 3) {
          remaining.push({ ...item, retries: item.retries + 1 });
        } else {
          console.warn(`[OfflineQueue] Dropping after 3 retries: ${item.action.type}`);
        }
      }
    }

    // Keep Notes enqueued while a replay was awaiting another action. Conversely,
    // never resurrect Notes removed by the existing logout clearQueue.
    const currentIds = new Set(queueRef.current.map(item => item.id));
    remaining = remaining.filter(item => !isNoteOfflineAction(item.action) || currentIds.has(item.id));
    remaining.push(...queueRef.current.filter(item => isNoteOfflineAction(item.action) && !originalNoteIds.has(item.id)));
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
