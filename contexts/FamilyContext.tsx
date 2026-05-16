import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'active_family_id';

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

  // Charger l'ID de famille active depuis AsyncStorage au démarrage
  // Fallback: lire depuis user.familyId si active_family_id absent
  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed)) { setActiveFamilyIdState(parsed); return; }
      }
      // Fallback: lire depuis le user en cache
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          if (user?.familyId) {
            setActiveFamilyIdState(user.familyId);
            await AsyncStorage.setItem(STORAGE_KEY, String(user.familyId));
          }
        } catch (_) {}
      }
    })();
  }, []);

  const setActiveFamilyId = useCallback(async (id: number | null) => {
    setActiveFamilyIdState(id);
    if (id !== null) {
      await AsyncStorage.setItem(STORAGE_KEY, String(id));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return (
    <FamilyContext.Provider value={{ activeFamilyId, setActiveFamilyId }}>
      {children}
    </FamilyContext.Provider>
  );
}

export function useFamily() {
  return useContext(FamilyContext);
}
