/**
 * UpdateModal — Modale de mise à jour de l'app
 *
 * Affichée au démarrage si une nouvelle version est disponible sur les stores.
 * - Mode forcé (forceUpdate=true) : bloque l'app, pas de bouton "Plus tard"
 * - Mode recommandé (forceUpdate=false) : bouton "Plus tard" pour fermer
 *
 * S'adapte automatiquement à la plateforme :
 * - iOS  → lien App Store
 * - Android → lien Google Play
 *
 * Textes traduits via i18n (FR / EN / DE).
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';

interface UpdateModalProps {
  visible: boolean;
  forceUpdate: boolean;
  storeUrl: string;
  latestVersion: string;
  onDismiss: () => void;
}

export function UpdateModal({
  visible,
  forceUpdate,
  storeUrl,
  latestVersion,
  onDismiss,
}: UpdateModalProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();

  const handleUpdate = () => {
    if (storeUrl) {
      Linking.openURL(storeUrl).catch(err =>
        console.warn('[UpdateModal] Impossible d\'ouvrir le store:', err)
      );
    }
  };

  // Icône selon la plateforme
  const platformIcon = Platform.OS === 'ios' ? '🍎' : '🤖';
  const storeName =
    Platform.OS === 'ios'
      ? t('updateModal.storeNameIos')
      : t('updateModal.storeNameAndroid');

  const colors = {
    overlay: 'rgba(0,0,0,0.65)',
    card: isDark ? '#1C1C1E' : '#FFFFFF',
    title: isDark ? '#FFFFFF' : '#1A1A1A',
    subtitle: isDark ? '#AEAEB2' : '#6B6B6B',
    version: isDark ? '#636366' : '#AEAEB2',
    updateBtn: '#007AFF',
    updateBtnText: '#FFFFFF',
    laterBtn: isDark ? '#2C2C2E' : '#F2F2F7',
    laterBtnText: isDark ? '#AEAEB2' : '#6B6B6B',
    separator: isDark ? '#38383A' : '#E5E5EA',
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      // Empêcher la fermeture par swipe/back si forcé
      onRequestClose={forceUpdate ? undefined : onDismiss}
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {/* Icône plateforme */}
          <Text style={styles.platformIcon}>{platformIcon}</Text>

          {/* Titre */}
          <Text style={[styles.title, { color: colors.title }]}>
            {forceUpdate
              ? t('updateModal.titleForce')
              : t('updateModal.titleRecommended')}
          </Text>

          {/* Description */}
          <Text style={[styles.subtitle, { color: colors.subtitle }]}>
            {forceUpdate
              ? t('updateModal.descriptionForce', { store: storeName })
              : t('updateModal.descriptionRecommended', { store: storeName })}
          </Text>

          {/* Numéro de version */}
          <Text style={[styles.version, { color: colors.version }]}>
            {t('updateModal.version', { version: latestVersion })}
          </Text>

          <View style={[styles.separator, { backgroundColor: colors.separator }]} />

          {/* Bouton principal : Mettre à jour */}
          <TouchableOpacity
            style={[styles.updateButton, { backgroundColor: colors.updateBtn }]}
            onPress={handleUpdate}
            activeOpacity={0.85}
          >
            <Text style={[styles.updateButtonText, { color: colors.updateBtnText }]}>
              {t('updateModal.updateButton', { store: storeName })}
            </Text>
          </TouchableOpacity>

          {/* Bouton secondaire : Plus tard (seulement si non forcé) */}
          {!forceUpdate && (
            <TouchableOpacity
              style={[styles.laterButton, { backgroundColor: colors.laterBtn }]}
              onPress={onDismiss}
              activeOpacity={0.75}
            >
              <Text style={[styles.laterButtonText, { color: colors.laterBtnText }]}>
                {t('updateModal.laterButton')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  platformIcon: {
    fontSize: 52,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  version: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
    fontVariant: ['tabular-nums'],
  },
  separator: {
    width: '100%',
    height: 1,
    marginBottom: 20,
  },
  updateButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  laterButton: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  laterButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
