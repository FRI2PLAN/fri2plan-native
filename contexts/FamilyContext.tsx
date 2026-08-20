import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

// La clé par utilisateur conserve le dernier cercle choisi sans jamais
// reprendre la préférence d’un autre compte. La clé d’en-tête est mise à
// jour en même temps : le client tRPC la lit pour toutes les requêtes.
const ACTIVE_FAMILY_HEADER_KEY = 'active_family_id';
const storageKeyForUser = (userId: number | string) => `active_family_id_${userId}`;

interface FamilyContextType {
  activeFamilyId: number | null;
  isReady: boolean;
  isCircleTransitioning: boolean;
  setActiveFamilyId: (id: number | null) => Promise<void>;
  beginCircleTransition: () => void;
  completeCircleTransition: () => void;
}

const FamilyContext = createContext<FamilyContextType>({
  activeFamilyId: null,
  isReady: false,
  isCircleTransitioning: false,
  setActiveFamilyId: async () => {},
  beginCircleTransition: () => {},
  completeCircleTransition: () => {},
});

export function FamilyProvider({ children }: { children: React.ReactNode }) {
  const [activeFamilyId, setActiveFamilyIdState] = useState<number | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isCircleTransitioning, setIsCircleTransitioning] = useState(false);
  const { user, isLoading: authLoading } = useAuth();
  const storageKey = user?.id ? storageKeyForUser(user.id) : null;

  // Chaque compte conserve son dernier cercle actif, sans jamais reprendre
  // celui d’un autre compte ayant utilisé le même appareil.
  useEffect(() => {
    if (authLoading) {
      setIsReady(false);
      return;
    }
    if (!storageKey) {
      setActiveFamilyIdState(null);
      void AsyncStorage.removeItem(ACTIVE_FAMILY_HEADER_KEY);
      setIsReady(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const stored = await AsyncStorage.getItem(storageKey);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed)) {
          await AsyncStorage.setItem(ACTIVE_FAMILY_HEADER_KEY, String(parsed));
          if (!cancelled) setActiveFamilyIdState(parsed);
          if (!cancelled) setIsReady(true);
          return;
        }
      }
      if (user?.familyId) {
        await AsyncStorage.multiSet([
          [storageKey, String(user.familyId)],
          [ACTIVE_FAMILY_HEADER_KEY, String(user.familyId)],
        ]);
        if (!cancelled) setActiveFamilyIdState(user.familyId);
      }
      if (!cancelled) setIsReady(true);
    })();
    return () => { cancelled = true; };
  }, [authLoading, storageKey, user?.familyId]);

  const setActiveFamilyId = useCallback(async (id: number | null) => {
    setIsReady(false);
    if (!storageKey) {
      setActiveFamilyIdState(id);
      setIsReady(true);
      return;
    }
    if (id !== null) {
      await AsyncStorage.multiSet([
        [storageKey, String(id)],
        [ACTIVE_FAMILY_HEADER_KEY, String(id)],
      ]);
    } else {
      await AsyncStorage.multiRemove([storageKey, ACTIVE_FAMILY_HEADER_KEY]);
    }
    setActiveFamilyIdState(id);
    setIsReady(true);
  }, [storageKey]);

  const beginCircleTransition = useCallback(() => {
    setIsCircleTransitioning(true);
  }, []);

  const completeCircleTransition = useCallback(() => {
    setIsCircleTransitioning(false);
  }, []);

  return (
    <FamilyContext.Provider value={{
      activeFamilyId,
      isReady,
      isCircleTransitioning,
      setActiveFamilyId,
      beginCircleTransition,
      completeCircleTransition,
    }}>
      {children}
    </FamilyContext.Provider>
  );
}

export function useFamily() {
  return useContext(FamilyContext);
}
