/**
 * PremiumOverlay
 *
 * Overlay affiché sur les modules réservés au plan Premium
 * (Budget, Repas, Récompenses, Requêtes, Calendrier intime).
 *
 * Stratégie : si visible=true, on remplace TOUT le contenu de l'écran
 * par un écran de verrouillage premium (plus fiable sur Android que absoluteFill).
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  Linking,
  SafeAreaView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { useFamily } from '../contexts/FamilyContext';
import { trpc } from '../lib/trpc';
import { useIAP } from '../contexts/IAPContext';

interface PremiumOverlayProps {
  /** Si true, affiche l'overlay (plan gratuit) */
  visible: boolean;
}

export default function PremiumOverlay({ visible }: PremiumOverlayProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { activeFamilyId } = useFamily();
  const iap = useIAP();
  const createCheckoutMutation = (trpc as any).subscription.createCheckout.useMutation();

  if (!visible) return null;

  const pageBg = isDark ? '#111827' : '#f9fafb';
  const cardBg = isDark ? '#1f2937' : '#ffffff';
  const textColor = isDark ? '#f9fafb' : '#111827';
  const subtextColor = isDark ? '#9ca3af' : '#6b7280';
  const borderColor = isDark ? '#374151' : '#e5e7eb';

  const handleUpgrade = () => {
    if (Platform.OS === 'ios' && iap.isIAPAvailable) {
      const pkg = iap.yearlyPackage || iap.monthlyPackage;
      if (pkg) {
        iap.purchasePackage(pkg).then((success) => {
          if (success) {
            Alert.alert('🎉', t('settings.purchaseSuccess'));
          }
        });
      } else {
        Alert.alert('⚠️', t('settings.iapNotAvailable'));
      }
      return;
    }
    createCheckoutMutation.mutate(
      { familyId: activeFamilyId ?? 0, plan: 'YEARLY' },
      {
        onSuccess: (data: any) => {
          if (data?.checkoutUrl) {
            Linking.openURL(data.checkoutUrl);
          }
        },
        onError: (err: any) =>
          Alert.alert('❌', err?.message || t('common.error')),
      }
    );
  };

  return (
    <View style={[styles.fullScreen, { backgroundColor: pageBg }]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          {/* Badge Premium */}
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumBadgeText}>⭐ PREMIUM</Text>
          </View>

          {/* Icône cadenas */}
          <Text style={styles.lockIcon}>🔒</Text>

          {/* Titre */}
          <Text style={[styles.title, { color: textColor }]}>
            {t('freemium.premiumModuleTitle')}
          </Text>

          {/* Description */}
          <Text style={[styles.desc, { color: subtextColor }]}>
            {t('freemium.premiumModuleBody')}
          </Text>

          {/* Bouton Découvrir Premium */}
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={handleUpgrade}
            disabled={createCheckoutMutation.isLoading}
          >
            <Text style={styles.upgradeButtonText}>
              {createCheckoutMutation.isLoading ? '...' : t('freemium.premiumModuleBtn')}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    width: '100%',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 18,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  premiumBadge: {
    backgroundColor: '#7c3aed',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 16,
  },
  premiumBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  lockIcon: {
    fontSize: 44,
    marginBottom: 12,
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
    marginBottom: 22,
  },
  upgradeButton: {
    backgroundColor: '#7c3aed',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
