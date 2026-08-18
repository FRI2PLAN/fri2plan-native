import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

const storageKeyForUser = (userId: number | string) => `active_family_id_${userId}`;

interface FamilyContextType {
  activeFamilyId: number | null;
  setActiveFamilyId: (id: number | null) => Promise<void>;
}

const FamilyContext = createContext<FamilyContextType>({
  activeFamilyId: null,
  setActiveFamilyId: async () => {},
});

export function FamilyProvider({ children }: { children: React.ReactNode }) {
  const [activeFamilyId, setActiveFamilyIdState] = useState<number | null>(null);
  const { user, isLoading: authLoading } = useAuth();
  const storageKey = user?.id ? storageKeyForUser(user.id) : null;

  // Chaque compte conserve son dernier cercle actif, sans jamais reprendre
  // celui d’un autre compte ayant utilisé le même appareil.
  useEffect(() => {
    if (authLoading) return;
    if (!storageKey) {
      setActiveFamilyIdState(null);
      return;
    }
    (async () => {
      const stored = await AsyncStorage.getItem(storageKey);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed)) { setActiveFamilyIdState(parsed); return; }
      }
      if (user?.familyId) {
        setActiveFamilyIdState(user.familyId);
        await AsyncStorage.setItem(storageKey, String(user.familyId));
      }
    })();
  }, [authLoading, storageKey, user?.familyId]);

  const setActiveFamilyId = useCallback(async (id: number | null) => {
    setActiveFamilyIdState(id);
    if (!storageKey) return;
    if (id !== null) {
      await AsyncStorage.setItem(storageKey, String(id));
    } else {
      await AsyncStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  return (
    <FamilyContext.Provider value={{ activeFamilyId, setActiveFamilyId }}>
      {children}
    </FamilyContext.Provider>
  );
}

export function useFamily() {
  return useContext(FamilyContext);
}
