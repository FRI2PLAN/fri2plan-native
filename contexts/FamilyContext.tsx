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
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed)) setActiveFamilyIdState(parsed);
      }
    });
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
