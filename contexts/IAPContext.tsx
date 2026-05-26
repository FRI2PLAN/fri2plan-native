/**
 * IAPContext.tsx
 * Contexte global pour les achats In-App (RevenueCat)
 * Disponible dans toute l'app via useIAP()
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { Platform } from 'react-native';
import { useRevenueCat, RevenueCatState, RevenueCatActions } from '../hooks/useRevenueCat';
import { useAuth } from './AuthContext';

type IAPContextType = RevenueCatState & RevenueCatActions & {
  /** true si on est sur iOS et que RevenueCat est disponible */
  isIAPAvailable: boolean;
};

const IAPContext = createContext<IAPContextType | null>(null);

export function IAPProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const revenuecat = useRevenueCat(user?.id?.toString());

  const isIAPAvailable = Platform.OS === 'ios' && revenuecat.isConfigured;

  return (
    <IAPContext.Provider value={{ ...revenuecat, isIAPAvailable }}>
      {children}
    </IAPContext.Provider>
  );
}

export function useIAP(): IAPContextType {
  const ctx = useContext(IAPContext);
  if (!ctx) throw new Error('useIAP must be used within IAPProvider');
  return ctx;
}
