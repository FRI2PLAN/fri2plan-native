/**
 * FreemiumLimitModal
 *
 * Modal réutilisable affiché quand l'utilisateur atteint une limite du plan gratuit.
 * Affiche le message de limite et propose de passer à Premium.
 */
import React from 'react';
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
import { useTheme } from '../contexts/ThemeContext';
import { useFamily } from '../contexts/FamilyContext';
import { trpc } from '../lib/trpc';
import { useIAP } from '../contexts/IAPContext';

interface FreemiumLimitModalProps {
  visible: boolean;
  /** Clé i18n du message de corps, ex: 'freemium.limitTasksBody' */
  messageKey: string;
  onClose: () => void;
  /** Callback après abonnement réussi */
  onSubscribed?: () => void;
}

export default function FreemiumLimitModal({
  visible,
  messageKey,
  onClose,
  onSubscribed,
}: FreemiumLimitModalProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { activeFamilyId } = useFamily();
  const iap = useIAP();
  const createCheckoutMutation = (trpc as any).subscription.createCheckout.useMutation();

  const bg = isDark ? '#1f2937' : '#ffffff';
  const textColor = isDark ? '#f9fafb' : '#111827';
  const subtextColor = isDark ? '#9ca3af' : '#6b7280';
  const borderColor = isDark ? '#374151' : '#e5e7eb';
  const limitBg = isDark ? '#292524' : '#fef3c7';
  const limitBorder = isDark ? '#78350f' : '#fcd34d';
  const limitText = isDark ? '#fbbf24' : '#92400e';

  const handleUpgrade = () => {
    if (Platform.OS === 'ios' && iap.isIAPAvailable) {
      const pkg = iap.yearlyPackage || iap.monthlyPackage;
      if (pkg) {
        iap.purchasePackage(pkg).then((success) => {
          if (success) {
            Alert.alert('🎉', t('settings.purchaseSuccess'));
            onClose();
            onSubscribed?.();
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
            onClose();
            Linking.openURL(data.checkoutUrl);
          }
        },
        onError: (err: any) =>
          Alert.alert('❌', err?.message || t('common.error')),
      }
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: bg, borderColor }]}>
          {/* Icône limite */}
          <Text style={styles.icon}>🔒</Text>

          {/* Titre */}
          <Text style={[styles.title, { color: textColor }]}>
            {t('freemium.limitTitle')}
          </Text>

          {/* Message de limite */}
          <View style={[styles.limitBadge, { backgroundColor: limitBg, borderColor: limitBorder }]}>
            <Text style={[styles.limitText, { color: limitText }]}>
              {t(messageKey)}
            </Text>
          </View>

          {/* Bouton Passer à Premium */}
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={handleUpgrade}
            disabled={createCheckoutMutation.isLoading}
          >
            <Text style={styles.upgradeButtonText}>
              {createCheckoutMutation.isLoading ? '...' : t('freemium.upgradeBtn')}
            </Text>
          </TouchableOpacity>

          {/* Bouton Rester gratuit */}
          <TouchableOpacity style={styles.stayFreeBtn} onPress={onClose}>
            <Text style={[styles.stayFreeText, { color: subtextColor }]}>
              {t('freemium.stayFreeBtn')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

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
  icon: {
    fontSize: 44,
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
  },
  limitBadge: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 20,
    width: '100%',
  },
  limitText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  upgradeButton: {
    backgroundColor: '#7c3aed',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  upgradeButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  stayFreeBtn: {
    paddingVertical: 8,
  },
  stayFreeText: {
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
