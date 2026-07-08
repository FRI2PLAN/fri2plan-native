/**
 * SubscriptionContext
 *
 * Fournit à toute l'app :
 * - hasPremium : boolean (false = trial expiré ou compte gratuit)
 * - isTrialActive : boolean
 * - trialDaysRemaining : number
 * - requirePremium(callback) : exécute le callback si premium, sinon affiche la modale paywall
 *
 * La modale PaywallModal est rendue ici une seule fois pour toute l'app.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from './ThemeContext';
import { useFamily } from './FamilyContext';
import { trpc } from '../lib/trpc';
import { useIAP } from './IAPContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubscriptionContextType {
  hasPremium: boolean;
  isTrialActive: boolean;
  trialDaysRemaining: number;
  /** Exécute fn() si premium, sinon affiche la modale paywall */
  requirePremium: (fn: () => void) => void;
  /** Invalide le cache subscription (après achat) */
  refreshSubscription: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const SubscriptionContext = createContext<SubscriptionContextType>({
  hasPremium: true, // défaut safe : pas de blocage si contexte non disponible
  isTrialActive: true,
  trialDaysRemaining: 21,
  requirePremium: (fn) => fn(),
  refreshSubscription: () => {},
});

export function useSubscription() {
  return useContext(SubscriptionContext);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { activeFamilyId } = useFamily();
  const utils = trpc.useUtils();
  const [paywallVisible, setPaywallVisible] = useState(false);

  const { data: subscriptionData } = trpc.subscription.checkAccess.useQuery(
    { familyId: activeFamilyId ?? 0 },
    {
      enabled: !!activeFamilyId,
      staleTime: 5 * 60 * 1000,
    }
  );

  const hasPremium = subscriptionData?.hasPremium ?? true;
  const isTrialActive = subscriptionData?.isTrialActive ?? true;
  const trialDaysRemaining = subscriptionData?.trialDaysRemaining ?? 21;

  const requirePremium = useCallback(
    (fn: () => void) => {
      if (hasPremium || isTrialActive) {
        fn();
      } else {
        setPaywallVisible(true);
      }
    },
    [hasPremium, isTrialActive]
  );

  const refreshSubscription = useCallback(() => {
    utils.subscription.checkAccess.invalidate();
  }, [utils]);

  return (
    <SubscriptionContext.Provider
      value={{ hasPremium, isTrialActive, trialDaysRemaining, requirePremium, refreshSubscription }}
    >
      {children}
      <PaywallModal
        visible={paywallVisible}
        familyId={activeFamilyId ?? 0}
        onClose={() => setPaywallVisible(false)}
        onSubscribed={() => {
          setPaywallVisible(false);
          refreshSubscription();
        }}
      />
    </SubscriptionContext.Provider>
  );
}

// ─── PaywallModal ─────────────────────────────────────────────────────────────

interface PaywallModalProps {
  visible: boolean;
  familyId: number;
  onClose: () => void;
  onSubscribed: () => void;
}

function PaywallModal({ visible, familyId, onClose, onSubscribed }: PaywallModalProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const iap = useIAP();
  const createCheckoutMutation = trpc.subscription.createCheckout.useMutation();

  const handleSubscribe = () => {
    if (Platform.OS === 'ios' && iap.isIAPAvailable) {
      const pkg = iap.yearlyPackage || iap.monthlyPackage;
      if (pkg) {
        iap.purchasePackage(pkg).then((success) => {
          if (success) {
            Alert.alert('🎉', t('settings.purchaseSuccess'));
            onSubscribed();
          }
        });
      } else {
        Alert.alert('⚠️', t('settings.iapNotAvailable'));
      }
      return;
    }
    createCheckoutMutation.mutate(
      { familyId, plan: 'YEARLY' },
      {
        onSuccess: (data: any) => {
          if (data?.checkoutUrl) {
            onClose();
            Linking.openURL(data.checkoutUrl);
          }
        },
        onError: (err: any) =>
          Alert.alert('❌', err?.message || t('common.error')),
      }
    );
  };

  const bg = isDark ? '#1f2937' : '#ffffff';
  const textColor = isDark ? '#f9fafb' : '#111827';
  const subtextColor = isDark ? '#9ca3af' : '#6b7280';
  const borderColor = isDark ? '#374151' : '#e5e7eb';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: bg, borderColor }]}>
          {/* Icône */}
          <Text style={styles.lockIcon}>🔒</Text>

          {/* Titre */}
          <Text style={[styles.title, { color: textColor }]}>
            {t('settings.trialExpiredTitle')}
          </Text>

          {/* Description */}
          <Text style={[styles.desc, { color: subtextColor }]}>
            {t('settings.trialExpiredDesc')}
          </Text>

          {/* Mode lecture seule */}
          <View style={[styles.readOnlyBadge, { borderColor: isDark ? '#374151' : '#e5e7eb' }]}>
            <Text style={[styles.readOnlyText, { color: subtextColor }]}>
              {t('settings.trialExpiredReadOnly')}
            </Text>
          </View>

          {/* Bouton S'abonner */}
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={handleSubscribe}
            disabled={createCheckoutMutation.isPending}
          >
            <Text style={styles.ctaText}>
              {createCheckoutMutation.isPending ? '...' : t('settings.trialExpiredCta')}
            </Text>
          </TouchableOpacity>

          {/* Fermer (continuer en lecture seule) */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={[styles.closeText, { color: subtextColor }]}>
              {t('settings.trialExpiredContinueReadOnly')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  lockIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  desc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  readOnlyBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 20,
    width: '100%',
  },
  readOnlyText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  ctaButton: {
    backgroundColor: '#7c3aed',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  ctaText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  closeBtn: {
    paddingVertical: 8,
  },
  closeText: {
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
