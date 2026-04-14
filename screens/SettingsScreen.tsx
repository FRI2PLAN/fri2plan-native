import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Modal,
  TextInput, Alert, ActivityIndicator, Linking, KeyboardAvoidingView, Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useFamily } from '../contexts/FamilyContext';
import { usePager } from '../contexts/PagerContext';
import { useTranslation } from 'react-i18next';
import { changeLanguage, getCurrentLanguage } from '../i18n';
import { trpc } from '../lib/trpc';

interface SettingsScreenProps {
  onNavigate?: (screen: string) => void;
  onLogout?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
}

type SubScreen =
  | null
  | 'pushNotifications'
  | 'emailNotifications'
  | 'account'
  | 'personalInfo'
  | 'subscription';

// Palette de couleurs (identique à MembersScreen)
const COLORS = [
  '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B',
  '#10B981', '#3B82F6', '#6366F1', '#14B8A6',
  '#F97316', '#06B6D4', '#84CC16', '#A855F7',
];

export default function SettingsScreen({ onNavigate, onLogout }: SettingsScreenProps) {
  const { t } = useTranslation();
  const { isDark, setDarkMode: setGlobalDarkMode } = useTheme();
  const { user } = useAuth();
  const { activeFamilyId } = useFamily();
  const styles = getStyles(isDark);

  const { setSwipeEnabled } = usePager();

  const [subScreen, setSubScreen] = useState<SubScreen>(null);

  // Désactiver le swipe du pager quand un sous-écran est ouvert
  const navigateToSubScreen = (screen: SubScreen) => {
    setSwipeEnabled(false);
    setSubScreen(screen);
  };
  const navigateBack = () => {
    setSwipeEnabled(true);
    setSubScreen(null);
  };
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(getCurrentLanguage());

  // ─── Données serveur ───────────────────────────────────────────────────────
  const { data: userSettings, refetch: refetchSettings } = (trpc.settings as any).get?.useQuery?.(undefined) || { data: null, refetch: () => {} };
  const { data: families } = (trpc.family as any).list?.useQuery?.() || { data: [] };
  // Utiliser la famille active du contexte (pas toujours la première)
  const activeFamily = (() => {
    if (!families || families.length === 0) return undefined;
    if (activeFamilyId) {
      const found = (families as any[]).find((f: any) => f.id === activeFamilyId);
      if (found) return found;
    }
    return (families as any[])[0];
  })();
  const activeFamilyIdForQuery = activeFamilyId ?? activeFamily?.id ?? 0;
  const { data: subscriptionData, refetch: refetchSub } = trpc.subscription.checkAccess.useQuery(
    { familyId: activeFamilyIdForQuery },
    { enabled: activeFamilyIdForQuery > 0 }
  );

  // Forcer le rechargement du statut Premium quand le cercle actif change
  useEffect(() => {
    if (activeFamilyIdForQuery > 0) {
      refetchSub();
    }
  }, [activeFamilyIdForQuery]);

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const updateSettingsMutation = (trpc.settings as any).update?.useMutation?.({ onSuccess: () => refetchSettings() });
  const updateNameMutation = (trpc.members as any).updateName?.useMutation?.();
  const updateColorMutation = (trpc.members as any).updateColor?.useMutation?.();
  const deleteAccountMutation = (trpc.user as any).deleteMyAccount?.useMutation?.();
  const createCheckoutMutation = trpc.subscription.createCheckout.useMutation();
  const createPortalMutation = trpc.subscription.createPortal.useMutation();
  const forgotPasswordMutation = (trpc.auth as any).forgotPassword?.useMutation?.();

  // ─── État local notifications ──────────────────────────────────────────────
  const [pushPrefs, setPushPrefs] = useState({
    events: true, tasks: true, messages: true, requests: true,
    budget: true, rewards: true, shopping: true, notes: true,
  });
  const [emailPrefs, setEmailPrefs] = useState({
    digest: true, events: true, tasks: true, requests: true, budget: true,
  });

  useEffect(() => {
    if (userSettings) {
      setPushPrefs({
        events: (userSettings as any).notifyEvents !== 0,
        tasks: (userSettings as any).notifyTasks !== 0,
        messages: (userSettings as any).notifyMessages !== 0,
        requests: (userSettings as any).notifyRequests !== 0,
        budget: (userSettings as any).notifyBudget !== 0,
        rewards: (userSettings as any).notifyRewards !== 0,
        shopping: (userSettings as any).notifyShopping !== 0,
        notes: (userSettings as any).notifyNotes !== 0,
      });
      setEmailPrefs({
        digest: (userSettings as any).emailDigest !== 0,
        events: (userSettings as any).emailDigestEvents !== 0,
        tasks: (userSettings as any).emailDigestTasks !== 0,
        requests: (userSettings as any).emailDigestRequests !== 0,
        budget: (userSettings as any).emailDigestBudget !== 0,
      });
    }
  }, [userSettings]);

  // ─── Langue ────────────────────────────────────────────────────────────────
  const handleLanguageChange = async (language: string) => {
    await changeLanguage(language);
    setCurrentLanguage(language);
    setShowLanguageModal(false);
  };
  const getLanguageLabel = (lang: string) => {
    if (lang === 'fr') return '🇫🇷 Français';
    if (lang === 'en') return '🇬🇧 English';
    if (lang === 'de') return '🇩🇪 Deutsch';
    return '🇫🇷 Français';
  };

  // ─── Sauvegarde push ───────────────────────────────────────────────────────
  const savePushPrefs = useCallback(() => {
    if (!updateSettingsMutation) return;
    updateSettingsMutation.mutate({
      notifyEvents: pushPrefs.events ? 1 : 0,
      notifyTasks: pushPrefs.tasks ? 1 : 0,
      notifyMessages: pushPrefs.messages ? 1 : 0,
      notifyRequests: pushPrefs.requests ? 1 : 0,
      notifyBudget: pushPrefs.budget ? 1 : 0,
      notifyRewards: pushPrefs.rewards ? 1 : 0,
      notifyShopping: pushPrefs.shopping ? 1 : 0,
      notifyNotes: pushPrefs.notes ? 1 : 0,
    }, {
      onSuccess: () => Alert.alert('✅', t('settings.saved')),
      onError: () => Alert.alert('❌', t('common.error')),
    });
  }, [pushPrefs, updateSettingsMutation, t]);

  // ─── Sauvegarde email ──────────────────────────────────────────────────────
  const saveEmailPrefs = useCallback(() => {
    if (!updateSettingsMutation) return;
    updateSettingsMutation.mutate({
      emailDigest: emailPrefs.digest ? 1 : 0,
      emailDigestEvents: emailPrefs.events ? 1 : 0,
      emailDigestTasks: emailPrefs.tasks ? 1 : 0,
      emailDigestRequests: emailPrefs.requests ? 1 : 0,
      emailDigestBudget: emailPrefs.budget ? 1 : 0,
    }, {
      onSuccess: () => Alert.alert('✅', t('settings.saved')),
      onError: () => Alert.alert('❌', t('common.error')),
    });
  }, [emailPrefs, updateSettingsMutation, t]);

  // ─── Modifier le nom ───────────────────────────────────────────────────────
  const [editName, setEditName] = useState('');
  const [showNameModal, setShowNameModal] = useState(false);
  const handleSaveName = () => {
    if (!user || !editName.trim()) return;
    updateNameMutation?.mutate({ userId: user.id, name: editName.trim() }, {
      onSuccess: () => { setShowNameModal(false); Alert.alert('✅', t('settings.nameSaved')); },
      onError: () => Alert.alert('❌', t('common.error')),
    });
  };

  // ─── Couleur ───────────────────────────────────────────────────────────────
  const [showColorModal, setShowColorModal] = useState(false);
  const [selectedColor, setSelectedColor] = useState(user?.userColor || '#8B5CF6');
  const [pricingTab, setPricingTab] = useState<'mensuel' | 'annuel'>('annuel');
  const handleSaveColor = () => {
    if (!user) return;
    updateColorMutation?.mutate({ userId: user.id, color: selectedColor }, {
      onSuccess: () => { setShowColorModal(false); Alert.alert('✅', t('common.success')); },
      onError: () => Alert.alert('❌', t('common.error')),
    });
  };

  // ─── Mot de passe (envoi lien reset) ──────────────────────────────────────
  const handleResetPassword = () => {
    if (!user?.email) return;
    Alert.alert(
      t('settings.changePassword'),
      `${t('auth.checkYourEmail')} : ${user.email}`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('auth.sendResetLink'),
          onPress: () => {
            forgotPasswordMutation?.mutate({ email: user.email! }, {
              onSuccess: () => Alert.alert('✅', t('auth.emailSent')),
              onError: () => Alert.alert('❌', t('common.error')),
            });
          },
        },
      ]
    );
  };

  // ─── Suppression compte ────────────────────────────────────────────────────
  const handleDeleteAccount = () => {
    Alert.alert(
      t('settings.deleteAccount'),
      t('settings.deleteAccountConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.deleteAccount'),
          style: 'destructive',
          onPress: () => {
            deleteAccountMutation?.mutate(undefined, {
              onSuccess: () => onLogout?.(),
              onError: () => Alert.alert('❌', t('common.error')),
            });
          },
        },
      ]
    );
  };

  // ─── Abonnement ────────────────────────────────────────────────────────────
  const handleSubscribe = (plan: 'MONTHLY' | 'YEARLY') => {
    if (!activeFamily) return;
    createCheckoutMutation.mutate({ familyId: activeFamily.id, plan }, {
      onSuccess: (data: any) => {
        if (data?.checkoutUrl) Linking.openURL(data.checkoutUrl);
      },
      onError: (err: any) => Alert.alert('❌', err?.message || t('common.error')),
    });
  };

  const handleManageSubscription = () => {
    if (!activeFamily) {
      Alert.alert('❌', t('common.error'));
      return;
    }
    createPortalMutation.mutate({ familyId: activeFamily.id }, {
      onSuccess: (data: any) => {
        if (data?.portalUrl) Linking.openURL(data.portalUrl);
        else Alert.alert('❌', t('common.error'));
      },
      onError: (err: any) => Alert.alert('❌', err?.message || t('common.error')),
    });
  };

  // ─── En-tête sous-écran ────────────────────────────────────────────────────
  const renderSubHeader = (title: string) => (
    <View style={styles.subHeader}>
      <TouchableOpacity onPress={() => navigateBack()} style={styles.backButton}>
        <Ionicons name="chevron-back" size={24} color={isDark ? '#f9fafb' : '#1f2937'} />
      </TouchableOpacity>
      <Text style={styles.subHeaderTitle}>{title}</Text>
      <View style={{ width: 40 }} />
    </View>
  );

  // ─── Sous-écran : Notifications Push ──────────────────────────────────────
  if (subScreen === 'pushNotifications') {
    const pushItems: { key: keyof typeof pushPrefs; icon: string; label: string }[] = [
      { key: 'events', icon: '📅', label: t('navigation.calendar') },
      { key: 'tasks', icon: '✅', label: t('navigation.tasks') },
      { key: 'messages', icon: '💬', label: t('navigation.messages') },
      { key: 'requests', icon: '🙏', label: t('navigation.requests') },
      { key: 'budget', icon: '💰', label: t('navigation.budget') },
      { key: 'rewards', icon: '🎁', label: t('navigation.rewards') },
      { key: 'shopping', icon: '🛒', label: t('navigation.shopping') },
      { key: 'notes', icon: '📝', label: t('navigation.notes') },
    ];
    return (
      <View style={styles.container}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        {renderSubHeader(t('settings.pushNotifications'))}
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.section}>
            <Text style={styles.sectionDesc}>{t('settings.pushNotificationsDesc')}</Text>
            {pushItems.map(item => (
              <View key={item.key} style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingIcon}>{item.icon}</Text>
                  <Text style={styles.settingLabel}>{item.label}</Text>
                </View>
                <Switch
                  value={pushPrefs[item.key]}
                  onValueChange={v => setPushPrefs(p => ({ ...p, [item.key]: v }))}
                  trackColor={{ false: '#d1d5db', true: '#7c3aed' }}
                  thumbColor="#fff"
                />
              </View>
            ))}
          </View>
          <View style={styles.section}>
            <TouchableOpacity style={styles.saveButton} onPress={savePushPrefs}>
              <Text style={styles.saveButtonText}>{t('settings.saveSettings')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ─── Sous-écran : Notifications Email ─────────────────────────────────────
  if (subScreen === 'emailNotifications') {
    const emailItems: { key: keyof typeof emailPrefs; icon: string; label: string }[] = [
      { key: 'digest', icon: '📰', label: t('settings.emailDigest') },
      { key: 'events', icon: '📅', label: t('navigation.calendar') },
      { key: 'tasks', icon: '✅', label: t('navigation.tasks') },
      { key: 'requests', icon: '🙏', label: t('navigation.requests') },
      { key: 'budget', icon: '💰', label: t('navigation.budget') },
    ];
    return (
      <View style={styles.container}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        {renderSubHeader(t('settings.emailNotifications'))}
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.section}>
            <Text style={styles.sectionDesc}>{t('settings.emailNotificationsDesc')}</Text>
            {emailItems.map(item => (
              <View key={item.key} style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingIcon}>{item.icon}</Text>
                  <Text style={styles.settingLabel}>{item.label}</Text>
                </View>
                <Switch
                  value={emailPrefs[item.key]}
                  onValueChange={v => setEmailPrefs(p => ({ ...p, [item.key]: v }))}
                  trackColor={{ false: '#d1d5db', true: '#7c3aed' }}
                  thumbColor="#fff"
                />
              </View>
            ))}
          </View>
          <View style={styles.section}>
            <TouchableOpacity style={styles.saveButton} onPress={saveEmailPrefs}>
              <Text style={styles.saveButtonText}>{t('settings.saveSettings')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ─── Sous-écran : Compte ───────────────────────────────────────────────────
  if (subScreen === 'account') {
    return (
      <View style={styles.container}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        {renderSubHeader(t('settings.account'))}
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Profil */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('settings.profile')}</Text>
            {/* Avatar */}
            <View style={styles.avatarRow}>
              <TouchableOpacity
                style={[styles.avatarCircle, { backgroundColor: user?.userColor || '#7c3aed' }]}
                onPress={() => { setSelectedColor(user?.userColor || '#8B5CF6'); setShowColorModal(true); }}
              >
                <Text style={styles.avatarInitial}>
                  {(user?.name || '?').charAt(0).toUpperCase()}
                </Text>
                <View style={styles.avatarEditBadge}>
                  <Text style={styles.avatarEditBadgeText}>✏️</Text>
                </View>
              </TouchableOpacity>
              <View style={styles.avatarInfo}>
                <Text style={styles.avatarName}>{user?.name || '—'}</Text>
                <Text style={styles.avatarEmail}>{user?.email || '—'}</Text>
              </View>
            </View>
            {/* Modifier le nom */}
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => { setEditName(user?.name || ''); setShowNameModal(true); }}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>✏️</Text>
                <Text style={styles.settingLabel}>{t('settings.editName')}</Text>
              </View>
              <Text style={styles.settingArrow}>›</Text>
            </TouchableOpacity>
            {/* Couleur et avatar */}
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => { setSelectedColor(user?.userColor || '#8B5CF6'); setShowColorModal(true); }}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>🎨</Text>
                <Text style={styles.settingLabel}>{t('settings.colorAvatar')}</Text>
              </View>
              <View style={[styles.colorDot, { backgroundColor: user?.userColor || '#7c3aed' }]} />
              <Text style={styles.settingArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Informations personnelles */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('settings.personalInfo')}</Text>
            {/* Email affiché */}
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>📧</Text>
                <Text style={styles.settingLabel}>{t('settings.emailAddress')}</Text>
              </View>
              <Text style={styles.settingValue} numberOfLines={1}>{user?.email || '—'}</Text>
            </View>
            {/* Changer email → WebView */}
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => Linking.openURL('https://app.fri2plan.ch/settings?tab=account')}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>✉️</Text>
                <Text style={styles.settingLabel}>{t('settings.changeEmail')}</Text>
              </View>
              <Text style={styles.settingArrow}>›</Text>
            </TouchableOpacity>
            {/* Changer mdp → envoi lien reset */}
            <TouchableOpacity style={styles.settingItem} onPress={handleResetPassword}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>🔑</Text>
                <Text style={styles.settingLabel}>{t('settings.changePassword')}</Text>
              </View>
              <Text style={styles.settingArrow}>›</Text>
            </TouchableOpacity>
            {/* Méthodes de connexion → WebView */}
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => Linking.openURL('https://app.fri2plan.ch/settings?tab=account')}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>🔗</Text>
                <Text style={styles.settingLabel}>{t('settings.loginMethods')}</Text>
              </View>
              <Text style={styles.settingArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Données */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('settings.data')}</Text>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => Linking.openURL('https://app.fri2plan.ch/settings?tab=data')}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>📥</Text>
                <Text style={styles.settingLabel}>{t('settings.downloadData')}</Text>
              </View>
              <Text style={styles.settingArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Zone dangereuse */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('settings.dangerZone')}</Text>
            <TouchableOpacity style={styles.dangerItem} onPress={handleDeleteAccount}>
              <Text style={styles.settingIcon}>🗑️</Text>
              <Text style={styles.dangerLabel}>{t('settings.deleteAccount')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Modal modifier nom */}
        <Modal visible={showNameModal} transparent animationType="fade" onRequestClose={() => setShowNameModal(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <View style={styles.modalOverlay}>
              <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setShowNameModal(false)} />
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>{t('settings.editName')}</Text>
                <TextInput
                  style={styles.textInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder={t('settings.namePlaceholder')}
                  placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
                  autoFocus
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowNameModal(false)}>
                    <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveName}>
                    <Text style={styles.modalSaveText}>{t('common.save')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Modal couleur */}
        <Modal visible={showColorModal} transparent animationType="fade" onRequestClose={() => setShowColorModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setShowColorModal(false)} />
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t('settings.colorAvatar')}</Text>
              {/* Aperçu */}
              <View style={styles.colorPreviewRow}>
                <View style={[styles.colorPreviewCircle, { backgroundColor: selectedColor }]}>
                  <Text style={styles.colorPreviewInitial}>
                    {(user?.name || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.colorPreviewName}>{user?.name || '—'}</Text>
              </View>
              {/* Grille de couleurs */}
              <View style={styles.colorGrid}>
                {COLORS.map(color => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: color },
                      selectedColor === color && styles.colorSwatchSelected,
                    ]}
                    onPress={() => setSelectedColor(color)}
                  >
                    {selectedColor === color && (
                      <Text style={styles.colorSwatchCheck}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowColorModal(false)}>
                  <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveColor}>
                  <Text style={styles.modalSaveText}>{t('common.save')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // ─── Sous-écran : Abonnement ───────────────────────────────────────────────
  if (subScreen === 'subscription') {
    const hasPremium = subscriptionData?.hasPremium ?? false;
    const isTrialActive = subscriptionData?.isTrialActive ?? false;
    const trialDaysRemaining = subscriptionData?.trialDaysRemaining ?? 0;
    const isPortalLoading = createPortalMutation.isLoading;

    return (
      <View style={styles.container}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        {renderSubHeader(t('settings.subscription'))}
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Statut actuel */}
          <View style={[styles.premiumBanner, hasPremium ? styles.premiumBannerActive : styles.premiumBannerFree]}>
            <Text style={styles.premiumBannerIcon}>{hasPremium ? '⭐' : '🔓'}</Text>
            <View style={{ flex: 1 }}>
              {activeFamily?.name && (
                <Text style={{ fontSize: 11, color: hasPremium ? '#e9d5ff' : '#6b7280', marginBottom: 2 }}>
                  👨‍👩‍👧 {activeFamily.name}
                </Text>
              )}
              <Text style={styles.premiumBannerTitle}>
                {hasPremium ? t('settings.premiumActive') : t('settings.freePlan')}
              </Text>
              {isTrialActive && (
                <Text style={styles.premiumBannerSub}>
                  {t('settings.trialDaysRemaining', { count: trialDaysRemaining })}
                </Text>
              )}
              {hasPremium && !isTrialActive && (
                <Text style={styles.premiumBannerSub}>{t('settings.premiumActiveDesc')}</Text>
              )}
              {!hasPremium && !isTrialActive && (
                <Text style={styles.premiumBannerSub}>{t('settings.freePlanDesc')}</Text>
              )}
            </View>
          </View>

          {/* Plans tarifaires (si pas premium) */}
          {!hasPremium && (
            <View style={styles.section}>

              {/* Plan gratuit EN HAUT — uniquement ce qui est inclus */}
              <View style={[styles.planCard, { marginBottom: 16, borderStyle: 'dashed' }]}>
                <Text style={[styles.planName, { marginBottom: 8, fontSize: 15 }]}>{t('settings.freePlan')} 🔓</Text>
                <View style={{ gap: 4 }}>
                  {[
                    { icon: '📅', text: t('settings.featureCalendar') },
                    { icon: '✅', text: t('settings.featureTasks') },
                    { icon: '💬', text: t('settings.featureMessages') },
                    { icon: '👥', text: t('settings.featureMembersLimit') },
                  ].map((f, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 13 }}>{f.icon}</Text>
                      <Text style={{ fontSize: 12, color: isDark ? '#9ca3af' : '#6b7280', flex: 1 }}>{f.text}</Text>
                      <Text style={{ color: '#9ca3af', fontSize: 13 }}>✓</Text>
                    </View>
                  ))}
                </View>
              </View>

              <Text style={styles.sectionTitle}>{t('settings.premiumPlan')}</Text>

              {/* Toggle Mensuel / Annuel */}
              <View style={{ flexDirection: 'row', backgroundColor: isDark ? '#374151' : '#f3f4f6', borderRadius: 12, padding: 3, marginBottom: 16 }}>
                <TouchableOpacity
                  style={[{ flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
                    pricingTab === 'mensuel' ? { backgroundColor: isDark ? '#1f2937' : '#fff', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 } : {}]}
                  onPress={() => setPricingTab('mensuel')}>
                  <Text style={{ fontWeight: '600', fontSize: 14, color: pricingTab === 'mensuel' ? '#7c3aed' : (isDark ? '#9ca3af' : '#6b7280') }}>{t('settings.monthlyPlan')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[{ flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
                    pricingTab === 'annuel' ? { backgroundColor: isDark ? '#1f2937' : '#fff', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 } : {}]}
                  onPress={() => setPricingTab('annuel')}>
                  <Text style={{ fontWeight: '600', fontSize: 14, color: pricingTab === 'annuel' ? '#7c3aed' : (isDark ? '#9ca3af' : '#6b7280') }}>{t('settings.yearlyPlan')}</Text>
                  {pricingTab !== 'annuel' && <Text style={{ fontSize: 9, color: '#22c55e', fontWeight: '700' }}>{t('settings.save17') || 'Économisez 17%'}</Text>}
                </TouchableOpacity>
              </View>

              {/* Carte Premium — prix + CTA uniquement, sans description redondante */}
              <TouchableOpacity
                style={[styles.planCard, pricingTab === 'annuel' ? styles.planCardHighlight : {}]}
                onPress={() => handleSubscribe(pricingTab === 'mensuel' ? 'MONTHLY' : 'YEARLY')}>
                <View style={styles.planHeader}>
                    <Text style={[styles.planName, pricingTab === 'annuel' ? { color: '#fff' } : {}]}>
                    {t('settings.premiumPlan')}
                  </Text>
                  {pricingTab === 'annuel' && (
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      <View style={{ backgroundColor: '#22c55e', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{t('settings.save17') || 'Économisez 17%'}</Text>
                      </View>
                      <View style={[styles.planBadge, { backgroundColor: '#fff' }]}>
                        <Text style={[styles.planBadgeText, { color: '#7c3aed' }]}>{t('settings.bestValue')}</Text>
                      </View>
                    </View>
                  )}
                  {pricingTab === 'mensuel' && (
                    <View style={styles.planBadge}>
                      <Text style={styles.planBadgeText}>{t('settings.flexible')}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.planPrice, pricingTab === 'annuel' ? { color: '#e9d5ff' } : {}]}>
                  {pricingTab === 'mensuel' ? `CHF 4.99 / ${t('settings.month')}` : `CHF 49.99 / ${t('settings.year')}`}
                </Text>
                {pricingTab === 'annuel' && (
                  <Text style={{ color: '#bbf7d0', fontSize: 11, marginBottom: 8 }}>{t('settings.monthlyEquiv') || '≈ CHF 4.17/mois'}</Text>
                )}
                <Text style={[styles.planCta, pricingTab === 'annuel' ? { color: '#fff' } : {}]}>{t('settings.subscribeCta')}</Text>
              </TouchableOpacity>

              {/* Liste des fonctionnalités Premium — séparée de la carte */}
              <View style={{ marginTop: 12, gap: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: isDark ? '#e5e7eb' : '#374151', marginBottom: 4 }}>✨ {t('settings.premiumFeatures')}</Text>
                {[
                  { icon: '📅', text: t('settings.featureCalendar') },
                  { icon: '✅', text: t('settings.featureTasks') },
                  { icon: '💬', text: t('settings.featureMessages') },
                  { icon: '🍽️', text: t('settings.featureMeals') },
                  { icon: '🛒', text: t('settings.featureShopping') },
                  { icon: '📝', text: t('settings.featureNotes') },
                  { icon: '💰', text: t('settings.featureBudget') },
                  { icon: '🏆', text: t('settings.featureRewards') },
                  { icon: '🔔', text: t('settings.featureNotifications') },
                  { icon: '👥', text: t('settings.featureMembers') },
                  { icon: '💑', text: t('settings.featureIntimate') },
                ].map((f, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 13 }}>{f.icon}</Text>
                    <Text style={{ fontSize: 12, color: isDark ? '#d1d5db' : '#374151', flex: 1 }}>{f.text}</Text>
                    <Text style={{ color: '#22c55e', fontWeight: '700', fontSize: 13 }}>✓</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Gérer l'abonnement existant */}
          {hasPremium && (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.settingItem}
                onPress={handleManageSubscription}
                disabled={isPortalLoading}
              >
                <View style={styles.settingLeft}>
                  <Text style={styles.settingIcon}>⚙️</Text>
                  <Text style={styles.settingLabel}>{t('settings.manageSubscription')}</Text>
                </View>
                {isPortalLoading
                  ? <ActivityIndicator size="small" color="#7c3aed" />
                  : <Text style={styles.settingArrow}>›</Text>
                }
              </TouchableOpacity>
              {/* Factures → même portail Stripe qui inclut les factures */}
              <TouchableOpacity
                style={styles.settingItem}
                onPress={handleManageSubscription}
                disabled={isPortalLoading}
              >
                <View style={styles.settingLeft}>
                  <Text style={styles.settingIcon}>🧾</Text>
                  <Text style={styles.settingLabel}>{t('settings.invoices')}</Text>
                </View>
                {isPortalLoading
                  ? <ActivityIndicator size="small" color="#7c3aed" />
                  : <Text style={styles.settingArrow}>›</Text>
                }
              </TouchableOpacity>
              <Text style={styles.invoicesNote}>
                {t('settings.invoicesNote') || 'Les factures sont disponibles dans le portail Stripe.'}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // ─── Écran principal Paramètres ────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Modal langue */}
      <Modal visible={showLanguageModal} transparent animationType="fade" onRequestClose={() => setShowLanguageModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setShowLanguageModal(false)} />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('settings.selectLanguage')}</Text>
            {['fr', 'en', 'de'].map(lang => (
              <TouchableOpacity
                key={lang}
                style={[styles.languageOption, currentLanguage === lang && styles.languageOptionSelected]}
                onPress={() => handleLanguageChange(lang)}
              >
                <Text style={styles.languageOptionText}>{getLanguageLabel(lang)}</Text>
                {currentLanguage === lang && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowLanguageModal(false)}>
              <Text style={styles.modalCloseButtonText}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Titre */}
      <View style={styles.pageTitleContainer}>
        <Text style={styles.pageTitle}>⚙️ {t('settings.title')}</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Général */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.general')}</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>🌙</Text>
              <Text style={styles.settingLabel}>{t('settings.darkMode')}</Text>
            </View>
            <Switch value={isDark} onValueChange={setGlobalDarkMode} trackColor={{ false: '#d1d5db', true: '#7c3aed' }} thumbColor="#fff" />
          </View>
          <TouchableOpacity style={styles.settingItem} onPress={() => setShowLanguageModal(true)}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>🌍</Text>
              <Text style={styles.settingLabel}>{t('settings.language')}</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>{getLanguageLabel(currentLanguage)}</Text>
              <Text style={styles.settingArrow}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.notifications')}</Text>
          <TouchableOpacity style={styles.settingItem} onPress={() => navigateToSubScreen('pushNotifications')}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>🔔</Text>
              <Text style={styles.settingLabel}>{t('settings.pushNotifications')}</Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem} onPress={() => navigateToSubScreen('emailNotifications')}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>📧</Text>
              <Text style={styles.settingLabel}>{t('settings.emailNotifications')}</Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Compte */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.account')}</Text>
          <TouchableOpacity style={styles.settingItem} onPress={() => navigateToSubScreen('account')}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>👤</Text>
              <Text style={styles.settingLabel}>{t('settings.account')}</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue} numberOfLines={1}>{user?.name || '—'}</Text>
              <Text style={styles.settingArrow}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Abonnement */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.subscription')}</Text>
          <TouchableOpacity style={styles.settingItem} onPress={() => navigateToSubScreen('subscription')}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>⭐</Text>
              <Text style={styles.settingLabel}>{t('settings.subscription')}</Text>
            </View>
            <View style={styles.settingRight}>
              <View style={[styles.subBadge, (subscriptionData?.hasPremium ?? false) ? styles.subBadgePremium : styles.subBadgeFree]}>
                <Text style={styles.subBadgeText}>
                  {(subscriptionData?.hasPremium ?? false) ? 'Premium' : 'Free'}
                </Text>
              </View>
              <Text style={styles.settingArrow}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* À propos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.about')}</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>ℹ️</Text>
              <Text style={styles.settingLabel}>{t('settings.version')}</Text>
            </View>
            <Text style={styles.settingValue}>1.0.0</Text>
          </View>
          <TouchableOpacity style={styles.settingItem} onPress={() => Linking.openURL('https://app.fri2plan.ch/terms')}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>📜</Text>
              <Text style={styles.settingLabel}>{t('settings.termsOfUse')}</Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem} onPress={() => Linking.openURL('https://app.fri2plan.ch/privacy')}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>🔐</Text>
              <Text style={styles.settingLabel}>{t('settings.privacyPolicy')}</Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Déconnexion */}
        {onLogout && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
              <Text style={styles.logoutText}>{t('settings.logout')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function getStyles(isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? '#111827' : '#f9fafb' },
    pageTitleContainer: {
      backgroundColor: isDark ? '#1f2937' : '#fff',
      paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
      borderBottomWidth: 1, borderBottomColor: isDark ? '#374151' : '#e5e7eb',
    },
    pageTitle: { fontSize: 24, fontWeight: 'bold', color: isDark ? '#f9fafb' : '#1f2937', textAlign: 'center' },
    subHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: isDark ? '#1f2937' : '#fff',
      paddingHorizontal: 12, paddingTop: 16, paddingBottom: 12,
      borderBottomWidth: 1, borderBottomColor: isDark ? '#374151' : '#e5e7eb',
    },
    backButton: { padding: 4, width: 40 },
    subHeaderTitle: { fontSize: 18, fontWeight: '700', color: isDark ? '#f9fafb' : '#1f2937', textAlign: 'center', flex: 1 },
    content: { flex: 1 },
    contentContainer: { paddingBottom: 60 },
    section: {
      marginTop: 24, backgroundColor: isDark ? '#1f2937' : '#fff',
      paddingHorizontal: 16, paddingVertical: 8,
    },
    sectionTitle: {
      fontSize: 13, fontWeight: '600', color: isDark ? '#9ca3af' : '#6b7280',
      textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, marginTop: 8,
    },
    sectionDesc: {
      fontSize: 14, color: isDark ? '#9ca3af' : '#6b7280',
      marginBottom: 12, marginTop: 4, lineHeight: 20,
    },
    settingItem: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: isDark ? '#374151' : '#f3f4f6',
    },
    settingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    settingIcon: { fontSize: 20, marginRight: 12 },
    settingLabel: { fontSize: 16, color: isDark ? '#f9fafb' : '#1f2937' },
    settingRight: { flexDirection: 'row', alignItems: 'center' },
    settingValue: { fontSize: 14, color: isDark ? '#9ca3af' : '#6b7280', marginRight: 6, maxWidth: 120 },
    settingArrow: { fontSize: 20, color: '#9ca3af' },
    colorDot: { width: 20, height: 20, borderRadius: 10, marginRight: 8 },
    saveButton: {
      backgroundColor: '#7c3aed', borderRadius: 10, padding: 16,
      alignItems: 'center', marginVertical: 8,
    },
    saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    logoutButton: {
      backgroundColor: '#ef4444', borderRadius: 8, padding: 16,
      alignItems: 'center', marginVertical: 16,
    },
    logoutText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    // Avatar
    avatarRow: {
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: isDark ? '#374151' : '#f3f4f6',
    },
    avatarCircle: {
      width: 60, height: 60, borderRadius: 30,
      alignItems: 'center', justifyContent: 'center', marginRight: 16,
    },
    avatarInitial: { fontSize: 26, fontWeight: 'bold', color: '#fff' },
    avatarEditBadge: {
      position: 'absolute', bottom: -2, right: -2,
      backgroundColor: isDark ? '#374151' : '#fff',
      borderRadius: 10, width: 20, height: 20,
      alignItems: 'center', justifyContent: 'center',
    },
    avatarEditBadgeText: { fontSize: 10 },
    avatarInfo: { flex: 1 },
    avatarName: { fontSize: 18, fontWeight: '700', color: isDark ? '#f9fafb' : '#1f2937' },
    avatarEmail: { fontSize: 14, color: isDark ? '#9ca3af' : '#6b7280', marginTop: 2 },
    // Zone dangereuse
    dangerItem: {
      flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: isDark ? '#374151' : '#f3f4f6',
    },
    dangerLabel: { fontSize: 16, color: '#ef4444', fontWeight: '600' },
    // Abonnement
    premiumBanner: {
      flexDirection: 'row', alignItems: 'center', margin: 16,
      padding: 16, borderRadius: 12,
    },
    premiumBannerActive: { backgroundColor: isDark ? '#3b2f6e' : '#f3e8ff', borderWidth: 2, borderColor: '#7c3aed' },
    premiumBannerFree: { backgroundColor: isDark ? '#1f2937' : '#f9fafb', borderWidth: 1, borderColor: isDark ? '#374151' : '#e5e7eb' },
    premiumBannerIcon: { fontSize: 36, marginRight: 16 },
    premiumBannerTitle: { fontSize: 18, fontWeight: '700', color: isDark ? '#f9fafb' : '#1f2937' },
    premiumBannerSub: { fontSize: 13, color: isDark ? '#9ca3af' : '#6b7280', marginTop: 4 },
    featureRow: {
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: isDark ? '#374151' : '#f3f4f6',
    },
    featureIcon: { fontSize: 18, marginRight: 12 },
    featureText: { flex: 1, fontSize: 15, color: isDark ? '#d1d5db' : '#374151' },
    featureCheck: { fontSize: 16, color: '#7c3aed', fontWeight: 'bold' },
    planCard: {
      borderRadius: 12, padding: 16, marginBottom: 12,
      borderWidth: 2, borderColor: isDark ? '#4b5563' : '#e5e7eb',
      backgroundColor: isDark ? '#1f2937' : '#fff',
    },
    planCardHighlight: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
    planHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    planName: { fontSize: 18, fontWeight: '700', color: isDark ? '#f9fafb' : '#1f2937' },
    planBadge: { backgroundColor: '#7c3aed', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
    planBadgeText: { fontSize: 12, color: '#fff', fontWeight: '600' },
    planPrice: { fontSize: 22, fontWeight: 'bold', color: isDark ? '#f9fafb' : '#1f2937', marginBottom: 12 },
    planCta: { fontSize: 15, color: '#7c3aed', fontWeight: '600', textAlign: 'center' },
    subBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3, marginRight: 8 },
    subBadgePremium: { backgroundColor: '#7c3aed' },
    subBadgeFree: { backgroundColor: isDark ? '#374151' : '#e5e7eb' },
    subBadgeText: { fontSize: 12, color: '#fff', fontWeight: '600' },
    invoicesNote: {
      fontSize: 12, color: isDark ? '#6b7280' : '#9ca3af',
      marginTop: 8, marginBottom: 4, fontStyle: 'italic',
    },
    // Couleur
    colorPreviewRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      marginBottom: 16,
    },
    colorPreviewCircle: {
      width: 56, height: 56, borderRadius: 28,
      alignItems: 'center', justifyContent: 'center', marginRight: 12,
    },
    colorPreviewInitial: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
    colorPreviewName: { fontSize: 18, fontWeight: '600', color: isDark ? '#f9fafb' : '#1f2937' },
    colorGrid: {
      flexDirection: 'row', flexWrap: 'wrap', gap: 10,
      justifyContent: 'center', marginVertical: 8,
    },
    colorSwatch: {
      width: 44, height: 44, borderRadius: 22,
      alignItems: 'center', justifyContent: 'center',
    },
    colorSwatchSelected: {
      borderWidth: 3, borderColor: isDark ? '#f9fafb' : '#1f2937',
    },
    colorSwatchCheck: { fontSize: 18, color: '#fff', fontWeight: 'bold' },
    // Modals
    modalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center', alignItems: 'center',
    },
    modalContent: {
      backgroundColor: isDark ? '#1f2937' : '#fff',
      borderRadius: 16, padding: 24, width: '88%', maxWidth: 420,
      zIndex: 10,
    },
    modalTitle: {
      fontSize: 20, fontWeight: 'bold',
      color: isDark ? '#f9fafb' : '#1f2937',
      marginBottom: 20, textAlign: 'center',
    },
    textInput: {
      borderWidth: 1.5, borderColor: isDark ? '#4b5563' : '#d1d5db',
      borderRadius: 8, padding: 12, fontSize: 16,
      color: isDark ? '#f9fafb' : '#1f2937',
      backgroundColor: isDark ? '#374151' : '#fff',
      marginBottom: 16,
    },
    modalButtons: { flexDirection: 'row', gap: 12 },
    modalCancelBtn: {
      flex: 1, padding: 14, borderRadius: 8,
      backgroundColor: isDark ? '#374151' : '#f3f4f6', alignItems: 'center',
    },
    modalCancelText: { fontSize: 16, color: isDark ? '#d1d5db' : '#6b7280', fontWeight: '600' },
    modalSaveBtn: { flex: 1, padding: 14, borderRadius: 8, backgroundColor: '#7c3aed', alignItems: 'center' },
    modalSaveText: { fontSize: 16, color: '#fff', fontWeight: '600' },
    languageOption: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      padding: 16, borderRadius: 8, borderWidth: 2,
      borderColor: isDark ? '#4b5563' : '#e5e7eb', marginBottom: 12,
    },
    languageOptionSelected: { borderColor: '#7c3aed', backgroundColor: isDark ? '#3b2f6e' : '#f3e8ff' },
    languageOptionText: { fontSize: 16, color: isDark ? '#f9fafb' : '#1f2937', fontWeight: '500' },
    checkmark: { fontSize: 20, color: '#7c3aed', fontWeight: 'bold' },
    modalCloseButton: {
      backgroundColor: isDark ? '#374151' : '#f3f4f6',
      borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 8,
    },
    modalCloseButtonText: { color: isDark ? '#d1d5db' : '#6b7280', fontSize: 16, fontWeight: '600' },
  });
}
