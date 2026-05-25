/**
 * useNetworkStatus — Détection de la connexion réseau
 *
 * Utilise @react-native-community/netinfo pour surveiller l'état de la connexion.
 * Déclenche un callback onReconnect quand la connexion revient.
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  connectionType: string | null;
}

export function useNetworkStatus(onReconnect?: () => void) {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: true,
    connectionType: null,
  });
  const wasConnectedRef = useRef<boolean | null>(null);

  const handleNetInfoChange = useCallback(
    (state: NetInfoState) => {
      const isConnected = state.isConnected ?? false;
      const isInternetReachable = state.isInternetReachable;

      setStatus({
        isConnected,
        isInternetReachable,
        connectionType: state.type,
      });

      // Détecter la reconnexion (passage de false → true)
      if (wasConnectedRef.current === false && isConnected && onReconnect) {
        console.log('[Network] Reconnected! Triggering sync...');
        onReconnect();
      }

      wasConnectedRef.current = isConnected;
    },
    [onReconnect]
  );

  useEffect(() => {
    // Vérifier l'état initial
    NetInfo.fetch().then(handleNetInfoChange);

    // S'abonner aux changements
    const unsubscribe = NetInfo.addEventListener(handleNetInfoChange);
    return unsubscribe;
  }, [handleNetInfoChange]);

  return status;
}
