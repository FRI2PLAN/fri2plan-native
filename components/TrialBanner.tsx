/**
 * TrialBanner — Bannière non bloquante affichée dans le Dashboard
 * - Pendant le trial : compte à rebours des jours restants
 * - Après expiration sans abo : message + bouton S'abonner + option lecture seule
 *
 * OTA-compatible (pas de code natif).
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { trpc } from '../lib/trpc';
import { useIAP } from '../contexts/IAPContext';

interface TrialBannerProps {
  familyId: number;
  hasPremium: boolean;
  isTrialActive: boolean;
  trialDaysRemaining: number;
  onSubscribed?: () => void;
}

export function TrialBanner({
  familyId,
  hasPremium,
  isTrialActive,
  trialDaysRemaining,
  onSubscribed,
}: TrialBannerProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const iap = useIAP();
  const [dismissed, setDismissed] = useState(false);
  const [readOnlyMode, setReadOnlyMode] = useState(false);

  const createCheckoutMutation = trpc.subscription.createCheckout.useMutation();

  // Ne rien afficher si premium actif ou si bannière fermée en lecture seule
  if (hasPremium || readOnlyMode) return null;

  // Ne rien afficher pendant le trial si plus de 3 jours restants
  if (isTrialActive && trialDaysRemaining > 3) return null;

  // Bannière fermée manuellement (pendant trial seulement)
  if (dismissed && isTrialActive) return null;

  const isExpired = !isTrialActive && !hasPremium;

  const handleSubscribe = () => {
    if (Platform.OS === 'ios' && iap.isIAPAvailable) {
      const pkg = iap.yearlyPackage || iap.monthlyPackage;
      if (pkg) {
        iap.purchasePackage(pkg).then((success) => {
          if (success) {
            Alert.alert('🎉', t('settings.purchaseSuccess'));
            onSubscribed?.();
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
          if (data?.checkoutUrl) Linking.openURL(data.checkoutUrl);
        },
        onError: (err: any) =>
          Alert.alert('❌', err?.message || t('common.error')),
      }
    );
  };

  const colors = {
    bg: isExpired
      ? isDark ? '#3b1a1a' : '#fef2f2'
      : isDark ? '#1a2a3b' : '#eff6ff',
    border: isExpired
      ? isDark ? '#7f1d1d' : '#fca5a5'
      : isDark ? '#1e3a5f' : '#93c5fd',
    text: isExpired
      ? isDark ? '#fca5a5' : '#991b1b'
      : isDark ? '#93c5fd' : '#1e40af',
    subtext: isDark ? '#9ca3af' : '#6b7280',
    ctaBg: '#7c3aed',
    ctaText: '#ffffff',
    readOnlyText: isDark ? '#6b7280' : '#9ca3af',
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <View style={styles.row}>
        <Text style={[styles.icon]}>{isExpired ? '🔒' : '⏳'}</Text>
        <View style={styles.textContainer}>
          <Text style={[styles.message, { color: colors.text }]}>
            {isExpired
              ? t('settings.trialBannerExpired')
              : t('settings.trialBannerDays', { count: trialDaysRemaining })}
          </Text>
          {isExpired && (
            <Text style={[styles.subtext, { color: colors.subtext }]}>
              {t('settings.trialExpiredReadOnly')}
            </Text>
          )}
        </View>
        {!isExpired && (
          <TouchableOpacity onPress={() => setDismissed(true)} style={styles.closeBtn}>
            <Text style={{ color: colors.subtext, fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: colors.ctaBg }]}
          onPress={handleSubscribe}
          disabled={createCheckoutMutation.isPending}
        >
          <Text style={[styles.ctaText, { color: colors.ctaText }]}>
            {createCheckoutMutation.isPending ? '...' : t('settings.trialBannerCta')}
          </Text>
        </TouchableOpacity>

        {isExpired && (
          <TouchableOpacity
            style={styles.readOnlyBtn}
            onPress={() => setReadOnlyMode(true)}
          >
            <Text style={[styles.readOnlyText, { color: colors.readOnlyText }]}>
              {t('settings.trialExpiredContinueReadOnly')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  icon: {
    fontSize: 18,
    marginRight: 8,
    marginTop: 1,
  },
  textContainer: {
    flex: 1,
  },
  message: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  subtext: {
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ctaButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '700',
  },
  readOnlyBtn: {
    paddingVertical: 8,
  },
  readOnlyText: {
    fontSize: 12,
    textDecorationLine: 'underline',
  },
});
