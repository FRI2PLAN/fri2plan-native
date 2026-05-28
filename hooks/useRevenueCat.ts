/**
 * useRevenueCat.ts
 * Hook pour gérer les achats In-App via RevenueCat (StoreKit sur iOS, Google Play sur Android)
 * 
 * Architecture hybride :
 * - iOS → RevenueCat + StoreKit (IAP)
 * - Android + Web → Stripe (inchangé)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import Purchases, {
  PurchasesPackage,
  CustomerInfo,
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
} from 'react-native-purchases';

// Identifiants RevenueCat (à configurer dans le dashboard RevenueCat)
const REVENUECAT_APPLE_API_KEY = 'appl_BroAoIDihZeckuxmoQSpceGphIo';
const REVENUECAT_GOOGLE_API_KEY = 'goog_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'; // À remplacer

// Identifiant de l'entitlement Premium dans RevenueCat
const PREMIUM_ENTITLEMENT_ID = 'premium';

// Identifiants des produits dans App Store Connect / Google Play
export const IAP_PRODUCT_IDS = {
  MONTHLY: 'fri2plan_monthly_v2',
  YEARLY: 'fri2plan_yearly_v2',
};

export interface RevenueCatState {
  isConfigured: boolean;
  isLoading: boolean;
  isPremium: boolean;
  packages: PurchasesPackage[];
  monthlyPackage: PurchasesPackage | null;
  yearlyPackage: PurchasesPackage | null;
  customerInfo: CustomerInfo | null;
  error: string | null;
}

export interface RevenueCatActions {
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  refreshCustomerInfo: () => Promise<void>;
}

export function useRevenueCat(userId?: string): RevenueCatState & RevenueCatActions {
  const [state, setState] = useState<RevenueCatState>({
    isConfigured: false,
    isLoading: true,
    isPremium: false,
    packages: [],
    monthlyPackage: null,
    yearlyPackage: null,
    customerInfo: null,
    error: null,
  });

  // Évite les setState après unmount
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Initialiser RevenueCat — uniquement sur iOS
  useEffect(() => {
    // Pas d'IAP sur Android (Stripe) ni Web
    if (Platform.OS !== 'ios') {
      if (isMounted.current) setState(s => ({ ...s, isLoading: false, isConfigured: false }));
      return;
    }

    let listenerSub: { remove: () => void } | null = null;

    const configure = async () => {
      try {
        if (__DEV__) {
          Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        }

        // Délai plus long pour laisser StoreKit s'initialiser complètement
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (!isMounted.current) return;

        await Purchases.configure({ apiKey: REVENUECAT_APPLE_API_KEY });
        if (!isMounted.current) return;

        // Identifier l'utilisateur si connecté (non-fatal si erreur)
        if (userId) {
          try { await Purchases.logIn(userId.toString()); } catch (e) {
            console.warn('[RevenueCat] logIn non-fatal:', e);
          }
        }
        if (!isMounted.current) return;

        // Charger les offres (non-fatal si erreur réseau)
        let monthlyPkg: PurchasesPackage | null = null;
        let yearlyPkg: PurchasesPackage | null = null;
        let allPackages: PurchasesPackage[] = [];
        try {
          const offerings = await Purchases.getOfferings();
          const current = offerings.current;
          if (current) {
            allPackages = current.availablePackages;
            monthlyPkg = current.monthly ?? allPackages.find(p =>
              p.product.identifier === IAP_PRODUCT_IDS.MONTHLY
            ) ?? null;
            yearlyPkg = current.annual ?? allPackages.find(p =>
              p.product.identifier === IAP_PRODUCT_IDS.YEARLY
            ) ?? null;
          }
        } catch (e) { console.warn('[RevenueCat] getOfferings non-fatal:', e); }
        if (!isMounted.current) return;

        // Vérifier le statut Premium (non-fatal si erreur)
        let hasPremium = false;
        let info: CustomerInfo | null = null;
        try {
          info = await Purchases.getCustomerInfo();
          hasPremium = info.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined;
        } catch (e) { console.warn('[RevenueCat] getCustomerInfo non-fatal:', e); }
        if (!isMounted.current) return;

        setState({
          isConfigured: true,
          isLoading: false,
          isPremium: hasPremium,
          packages: allPackages,
          monthlyPackage: monthlyPkg,
          yearlyPackage: yearlyPkg,
          customerInfo: info,
          error: null,
        });

        // Écouter les changements de statut client
        try {
          listenerSub = Purchases.addCustomerInfoUpdateListener((updatedInfo) => {
            if (!isMounted.current) return;
            const updatedPremium = updatedInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined;
            setState(s => ({ ...s, isPremium: updatedPremium, customerInfo: updatedInfo }));
          });
        } catch (e) { console.warn('[RevenueCat] listener non-fatal:', e); }

      } catch (err: any) {
        // Erreur générale — l'app continue sans IAP
        console.error('[RevenueCat] Configuration error (app continues):', err);
        if (isMounted.current) {
          setState(s => ({
            ...s,
            isConfigured: false,
            isLoading: false,
            error: err?.message || 'RevenueCat unavailable',
          }));
        }
      }
    };

    configure();

    return () => {
      if (listenerSub) { try { listenerSub.remove(); } catch (_) {} }
    };
  }, [userId]);

  // Acheter un package
  const purchasePackage = useCallback(async (pkg: PurchasesPackage): Promise<boolean> => {
    setState(s => ({ ...s, isLoading: true, error: null }));
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const hasPremium = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined;
      setState(s => ({
        ...s,
        isLoading: false,
        isPremium: hasPremium,
        customerInfo,
      }));
      return hasPremium;
    } catch (err: any) {
      if (err?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
        // L'utilisateur a annulé — pas une erreur
        setState(s => ({ ...s, isLoading: false }));
        return false;
      }
      console.error('[RevenueCat] Purchase error:', err);
      setState(s => ({
        ...s,
        isLoading: false,
        error: err?.message || 'Erreur lors de l\'achat',
      }));
      Alert.alert('Erreur', err?.message || 'L\'achat a échoué. Veuillez réessayer.');
      return false;
    }
  }, []);

  // Restaurer les achats
  const restorePurchases = useCallback(async (): Promise<boolean> => {
    setState(s => ({ ...s, isLoading: true, error: null }));
    try {
      const customerInfo = await Purchases.restorePurchases();
      const hasPremium = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined;
      setState(s => ({
        ...s,
        isLoading: false,
        isPremium: hasPremium,
        customerInfo,
      }));
      if (hasPremium) {
        Alert.alert('✅ Achats restaurés', 'Votre abonnement Premium a été restauré avec succès.');
      } else {
        Alert.alert('ℹ️ Aucun achat trouvé', 'Aucun abonnement actif n\'a été trouvé pour ce compte Apple.');
      }
      return hasPremium;
    } catch (err: any) {
      console.error('[RevenueCat] Restore error:', err);
      setState(s => ({
        ...s,
        isLoading: false,
        error: err?.message || 'Erreur lors de la restauration',
      }));
      Alert.alert('Erreur', 'Impossible de restaurer les achats. Veuillez réessayer.');
      return false;
    }
  }, []);

  // Rafraîchir les infos client
  const refreshCustomerInfo = useCallback(async (): Promise<void> => {
    if (!state.isConfigured) return;
    try {
      const info = await Purchases.getCustomerInfo();
      const hasPremium = info.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined;
      setState(s => ({
        ...s,
        isPremium: hasPremium,
        customerInfo: info,
      }));
    } catch (err) {
      console.error('[RevenueCat] Refresh error:', err);
    }
  }, [state.isConfigured]);

  return {
    ...state,
    purchasePackage,
    restorePurchases,
    refreshCustomerInfo,
  };
}
