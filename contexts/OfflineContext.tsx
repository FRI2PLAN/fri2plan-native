/**
 * OfflineContext — Contexte global pour le mode hors ligne
 *
 * Fournit :
 * - isConnected : état de la connexion réseau
 * - enqueue : ajouter une action à la file d'attente
 * - queueSize : nombre d'actions en attente
 * - processQueue : rejouer les actions en attente (appelé à la reconnexion)
 */

import React, { createContext, useCallback, useContext, useRef } from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useOfflineQueue, OfflineAction } from '../hooks/useOfflineQueue';

interface OfflineContextValue {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  enqueue: (action: OfflineAction) => Promise<void>;
  processQueue: (executor: (action: OfflineAction) => Promise<void>) => Promise<void>;
  clearQueue: () => Promise<void>;
  queueSize: number;
  registerExecutor: (executor: (action: OfflineAction) => Promise<void>) => void;
}

const OfflineContext = createContext<OfflineContextValue>({
  isConnected: true,
  isInternetReachable: true,
  enqueue: async () => {},
  processQueue: async () => {},
  clearQueue: async () => {},
  queueSize: 0,
  registerExecutor: () => {},
});

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const { enqueue, processQueue, clearQueue, queueSize } = useOfflineQueue();
  const executorRef = useRef<((action: OfflineAction) => Promise<void>) | null>(null);

  const handleReconnect = useCallback(() => {
    if (executorRef.current) {
      processQueue(executorRef.current);
    }
  }, [processQueue]);

  const { isConnected, isInternetReachable } = useNetworkStatus(handleReconnect);

  const registerExecutor = useCallback(
    (executor: (action: OfflineAction) => Promise<void>) => {
      executorRef.current = executor;
    },
    []
  );

  return (
    <OfflineContext.Provider
      value={{
        isConnected,
        isInternetReachable,
        enqueue,
        processQueue,
        clearQueue,
        queueSize,
        registerExecutor,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  return useContext(OfflineContext);
}
