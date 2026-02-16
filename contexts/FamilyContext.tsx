import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { trpc } from '../lib/trpc';

interface FamilyContextType {
  activeFamilyId: number;
  setActiveFamilyId: (id: number) => void;
  families: any[];
  isLoading: boolean;
}

const FamilyContext = createContext<FamilyContextType | undefined>(undefined);

export function FamilyProvider({ children }: { children: ReactNode }) {
  const [activeFamilyId, setActiveFamilyId] = useState<number>(1);
  
  // Récupérer les familles de l'utilisateur
  const { data: families, isLoading } = trpc.family.list.useQuery();

  // Définir automatiquement la première famille comme active
  useEffect(() => {
    if (families && families.length > 0 && !activeFamilyId) {
      setActiveFamilyId(families[0].id);
    }
  }, [families]);

  return (
    <FamilyContext.Provider value={{ 
      activeFamilyId, 
      setActiveFamilyId,
      families: families || [],
      isLoading 
    }}>
      {children}
    </FamilyContext.Provider>
  );
}

export function useFamily() {
  const context = useContext(FamilyContext);
  if (context === undefined) {
    throw new Error('useFamily must be used within a FamilyProvider');
  }
  return context;
}
