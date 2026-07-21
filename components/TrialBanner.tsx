/**
 * TrialBanner — Bannière non bloquante affichée dans le Dashboard
 * - Pendant le trial (≤3 jours restants) : compte à rebours + bouton S'abonner
 * - En mode gratuit (trial expiré ou compte free) : "Vous êtes en mode Gratuit"
 *   + bouton "S'abonner" + bouton "Me rappeler dans 7 jours" (snooze AsyncStorage)
 *
 * OTA-compatible (pas de code natif).
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { trpc } from '../lib/trpc';
import { useIAP } from '../contexts/IAPContext';

const SNOOZE_KEY = 'trial_banner_snooze_until';

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
  const [snoozed, setSnoozed] = useState(false);
  const [snoozeLoaded, setSnoozeLoaded] = useState(false);

  const createCheckoutMutation = trpc.subscription.createCheckout.useMutation();

  // Vérifier si l'utilisateur a snoozé la bannière
  useEffect(() => {
    AsyncStorage.getItem(SNOOZE_KEY).then((val) => {
      if (val) {
        const snoozeUntil = parseInt(val, 10);
        if (Date.now() < snoozeUntil) {
          setSnoozed(true);
        } else {
          // Snooze expiré, supprimer
          AsyncStorage.removeItem(SNOOZE_KEY);
        }
      }
      setSnoozeLoaded(true);
    });
  }, []);

  // Ne rien afficher si premium actif
  if (hasPremium) return null;

  // Attendre le chargement du snooze
  if (!snoozeLoaded) return null;

  // Ne rien afficher si snoozé
  if (snoozed) return null;

  // Ne rien afficher pendant le trial si plus de 3 jours restants
  if (isTrialActive && trialDaysRemaining > 3) return null;

  // Bannière fermée manuellement (pendant trial seulement)
  if (dismissed && isTrialActive) return null;

  const isFreeMode = !isTrialActive && !hasPremium;
  const isExpiredTrial = isFreeMode; // même chose, alias plus clair

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

  const handleSnooze = async () => {
    const snoozeUntil = Date.now() + 7 * 24 * 60 * 60 * 1000; // +7 jours
    await AsyncStorage.setItem(SNOOZE_KEY, String(snoozeUntil));
    setSnoozed(true);
  };

  const colors = {
    bg: isExpiredTrial
      ? isDark ? '#1a1a2e' : '#f5f3ff'
      : isDark ? '#1a2a3b' : '#eff6ff',
    border: isExpiredTrial
      ? isDark ? '#4c1d95' : '#c4b5fd'
      : isDark ? '#1e3a5f' : '#93c5fd',
    text: isExpiredTrial
      ? isDark ? '#c4b5fd' : '#5b21b6'
      : isDark ? '#93c5fd' : '#1e40af',
    subtext: isDark ? '#9ca3af' : '#6b7280',
    ctaBg: '#7c3aed',
    ctaText: '#ffffff',
    snoozeText: isDark ? '#6b7280' : '#9ca3af',
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <View style={styles.row}>
        <Text style={styles.icon}>{isExpiredTrial ? '🆓' : '⏳'}</Text>
        <View style={styles.textContainer}>
          <Text style={[styles.message, { color: colors.text }]}>
            {isExpiredTrial
              ? t('settings.freeModeTitle')
              : t('settings.trialBannerDays', { count: trialDaysRemaining })}
          </Text>
          {isExpiredTrial && (
            <Text style={[styles.subtext, { color: colors.subtext }]}>
              {t('settings.freeModeDesc')}
            </Text>
          )}
        </View>
        {!isExpiredTrial && (
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

        {isExpiredTrial && (
          <TouchableOpacity
            style={styles.snoozeBtn}
            onPress={handleSnooze}
          >
            <Text style={[styles.snoozeText, { color: colors.snoozeText }]}>
              {t('settings.freeModeSnooze')}
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
    flexWrap: 'wrap',
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
  snoozeBtn: {
    paddingVertical: 8,
  },
  snoozeText: {
    fontSize: 12,
    textDecorationLine: 'underline',
  },
});
