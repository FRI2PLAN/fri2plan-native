/**
 * FirstConnectionFlow — Flux de première connexion en 2 étapes (natif)
 *
 * Étape 1 : Créer le cercle familial (nom)
 * Étape 2 : Inviter la famille (code + WhatsApp, SMS, Copier) → Accéder à l'app
 *
 * S'affiche une seule fois lors de la première connexion d'un nouvel utilisateur
 * sans famille. L'onboarding de découverte est géré par OnboardingScreen (overlay)
 * dans App.tsx après l'accès à l'app (hasSeenOnboarding=false + activeFamilyId set).
 *
 * networkMode: 'always' sur createFamily pour garantir que la famille est bien
 * créée en base de données (évite le bug offlineFirst).
 */
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView, Share, Platform,
  KeyboardAvoidingView, Dimensions, Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../lib/trpc';
import { useFamily } from '../contexts/FamilyContext';
import { useQueryClient } from '@tanstack/react-query';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const APP_URL = 'https://app.fri2plan.ch';

// ─── Types ────────────────────────────────────────────────────────────────────

type FlowStep = 'create-circle' | 'invite-family';

interface OnboardingSlide {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  category: 'essential' | 'premium';
}

const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    title: 'Bienvenue sur FRI2PLAN ! 🎉',
    description: 'Votre organiseur familial complet pour gérer le quotidien ensemble. Découvrez comment FRI2PLAN peut simplifier votre vie de famille.',
    icon: 'home',
    category: 'essential',
  },
  {
    title: 'Calendrier familial 📅',
    description: 'Créez et partagez des événements avec toute la famille. Synchronisez vos calendriers Google pour ne rien manquer.',
    icon: 'calendar',
    category: 'essential',
  },
  {
    title: 'Gestion des tâches ✅',
    description: 'Organisez vos tâches, assignez-les aux membres de la famille et suivez leur progression. Gagnez des points en complétant des tâches !',
    icon: 'checkmark-circle',
    category: 'essential',
  },
  {
    title: 'Messages en temps réel 💬',
    description: 'Communiquez en temps réel avec votre famille. Créez des groupes thématiques pour organiser vos échanges.',
    icon: 'chatbubbles',
    category: 'essential',
  },
  {
    title: 'Listes de courses 🛒',
    description: 'Créez des listes de courses partagées. Cochez les articles en temps réel pendant vos courses.',
    icon: 'cart',
    category: 'essential',
  },
  {
    title: 'Budget familial 💰',
    description: 'Gérez vos finances familiales. Suivez vos dépenses et revenus par catégorie. (Fonctionnalité Premium)',
    icon: 'wallet',
    category: 'premium',
  },
  {
    title: 'Notes partagées 📝',
    description: 'Créez des notes personnelles ou partagées avec la famille. Ajoutez des pièces jointes et épinglez les notes importantes. (Premium)',
    icon: 'document-text',
    category: 'premium',
  },
  {
    title: 'Système de récompenses 🏆',
    description: 'Motivez les membres de la famille avec un système de points et de récompenses personnalisées. (Premium)',
    icon: 'trophy',
    category: 'premium',
  },
  {
    title: 'Personnalisez votre expérience ⚙️',
    description: 'Configurez vos préférences, choisissez votre thème, activez les notifications et personnalisez votre tableau de bord.',
    icon: 'settings',
    category: 'essential',
  },
  {
    title: 'Vous êtes prêt ! 🚀',
    description: 'Vous avez découvert toutes les fonctionnalités principales. Commencez à organiser votre vie familiale dès maintenant !',
    icon: 'sparkles',
    category: 'essential',
  },
];

// ─── Props ─────────────────────────────────────────────────────────────────────

interface FirstConnectionFlowProps {
  onComplete: () => void;
}

// ─── Composant principal ───────────────────────────────────────────────────────

export default function FirstConnectionFlow({ onComplete }: FirstConnectionFlowProps) {
  const [step, setStep] = useState<FlowStep>('create-circle');
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  // onboardingStep supprimé — l'onboarding est géré par OnboardingScreen dans App.tsx
  const { setActiveFamilyId } = useFamily();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const appUrl = APP_URL;
  const joinLink = inviteCode ? `${appUrl}/invite/${inviteCode}` : appUrl;
  const inviteMessage = inviteCode
    ? `Rejoins notre famille sur FRI2PLAN ! 🏠\n\nClique sur ce lien pour nous rejoindre directement :\n${joinLink}\n\nOu utilise le code : ${inviteCode}`
    : `Rejoins notre famille sur FRI2PLAN ! 🏠\n\nTélécharge l'app : ${appUrl}`;

  // ── Étape 1 : Créer le cercle ──────────────────────────────────────────────
  // networkMode: 'always' = force l'envoi au serveur, pas de succès local offline
  const createFamilyMutation = trpc.family.create.useMutation({
    networkMode: 'always',
    onSuccess: (data) => {
      if (!data?.familyId) {
        Alert.alert('Erreur', 'La famille n\'a pas pu être créée. Veuillez réessayer.');
        return;
      }
      setActiveFamilyId(data.familyId);
      setInviteCode(data.inviteCode || null);
      queryClient.invalidateQueries();
      setStep('invite-family');
    },
    onError: (e: any) => {
      const msg = e?.message || 'Erreur lors de la création';
      if (msg.includes('network') || msg.includes('fetch') || msg.includes('connect') || msg.includes('Network')) {
        Alert.alert(
          'Pas de connexion',
          'Impossible de créer votre cercle sans connexion internet. Vérifiez votre réseau et réessayez.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Erreur', msg);
      }
    },
  });

  const handleCreateFamily = () => {
    if (!familyName.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un nom pour votre cercle');
      return;
    }
    createFamilyMutation.mutate({ name: familyName.trim() });
  };

  // ── Étape 2 : Inviter ─────────────────────────────────────────────────────

  const handleShareWhatsApp = async () => {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(inviteMessage)}`;
    try {
      const { Linking } = require('react-native');
      const canOpen = await Linking.canOpenURL(waUrl);
      if (canOpen) {
        await Linking.openURL(waUrl);
      } else {
        // WhatsApp non installé — partage natif
        await Share.share({ message: inviteMessage, title: 'Invitation FRI2PLAN' });
      }
    } catch {
      await Share.share({ message: inviteMessage, title: 'Invitation FRI2PLAN' });
    }
  };

  const handleShareSMS = async () => {
    const smsUrl = Platform.OS === 'ios'
      ? `sms:&body=${encodeURIComponent(inviteMessage)}`
      : `sms:?body=${encodeURIComponent(inviteMessage)}`;
    try {
      const { Linking } = require('react-native');
      await Linking.openURL(smsUrl);
    } catch {
      await Share.share({ message: inviteMessage, title: 'Invitation FRI2PLAN' });
    }
  };

  const handleCopyLink = async () => {
    try {
      const Clipboard = require('@react-native-clipboard/clipboard').default;
      Clipboard.setString(inviteMessage);
      Alert.alert('✅ Copié !', 'Le message d\'invitation a été copié dans le presse-papier.');
    } catch {
      // Fallback si Clipboard non disponible
      await Share.share({ message: inviteMessage, title: 'Invitation FRI2PLAN' });
    }
  };

  const handleShareNative = async () => {
    await Share.share({ message: inviteMessage, title: 'Invitation FRI2PLAN' });
  };

  // L'onboarding est géré par OnboardingScreen dans App.tsx après onComplete()

  // ─── Rendu ─────────────────────────────────────────────────────────────────

  // ── Étape 1 : Créer le cercle ─────────────────────────────────────────────
  if (step === 'create-circle') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {/* En-tête coloré */}
            <View style={styles.headerGradientPurple}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="people" size={36} color="#fff" />
              </View>
              <Text style={styles.headerTitle}>Créez votre cercle</Text>
              <Text style={styles.headerSubtitle}>Donnez un nom à votre espace partagé</Text>
            </View>

            {/* Contenu */}
            <View style={styles.card}>
              <Text style={styles.label}>Nom du cercle</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="home-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="ex: Famille Martin, Notre Maison..."
                  placeholderTextColor="#6b7280"
                  value={familyName}
                  onChangeText={setFamilyName}
                  autoCapitalize="words"
                  autoFocus
                  editable={!createFamilyMutation.isPending}
                  onSubmitEditing={handleCreateFamily}
                />
              </View>
              <Text style={styles.hint}>Ce nom sera visible par tous les membres de votre cercle</Text>

              <TouchableOpacity
                style={[styles.primaryBtn, createFamilyMutation.isPending && styles.btnDisabled]}
                onPress={handleCreateFamily}
                disabled={createFamilyMutation.isPending}
              >
                {createFamilyMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>Créer mon cercle</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
                  </>
                )}
              </TouchableOpacity>

              {/* Indicateur d'étape */}
              <View style={styles.stepIndicator}>
                <View style={[styles.stepDot, styles.stepDotActive]} />
                <View style={styles.stepDot} />
              </View>
              <Text style={styles.stepLabel}>Étape 1 sur 2</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Étape 2 : Inviter la famille ──────────────────────────────────────────
  if (step === 'invite-family') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* En-tête coloré */}
          <View style={styles.headerGradientGreen}>
            <View style={styles.headerIconCircle}>
              <Ionicons name="share-social" size={36} color="#fff" />
            </View>
            <Text style={styles.headerTitle}>Invitez votre famille</Text>
            <Text style={styles.headerSubtitle}>
              Partagez le lien ou le code pour que vos proches vous rejoignent directement
            </Text>
          </View>

          <View style={styles.card}>
            {/* Bouton retour */}
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep('create-circle')}>
              <Ionicons name="arrow-back" size={18} color="#9ca3af" />
              <Text style={styles.backBtnText}>Retour</Text>
            </TouchableOpacity>

            {/* Code d'invitation */}
            {inviteCode && (
              <View style={styles.codeBox}>
                <Text style={styles.codeLabel}>Code d'invitation</Text>
                <Text style={styles.codeText}>{inviteCode}</Text>
                <Text style={styles.codeHint}>Vos proches peuvent entrer ce code dans l'app pour rejoindre votre cercle</Text>
              </View>
            )}

            {/* Boutons de partage */}
            <Text style={styles.shareTitle}>Partager le lien d'invitation</Text>
            <View style={styles.shareRow}>
              <TouchableOpacity style={[styles.shareBtn, styles.shareBtnWhatsApp]} onPress={handleShareWhatsApp}>
                <Ionicons name="logo-whatsapp" size={22} color="#fff" />
                <Text style={styles.shareBtnText}>WhatsApp</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.shareBtn, styles.shareBtnSMS]} onPress={handleShareSMS}>
                <Ionicons name="phone-portrait-outline" size={22} color="#fff" />
                <Text style={styles.shareBtnText}>SMS</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.shareBtn, styles.shareBtnCopy]} onPress={handleShareNative}>
                <Ionicons name="share-outline" size={22} color="#7c3aed" />
                <Text style={[styles.shareBtnText, { color: '#7c3aed' }]}>Partager</Text>
              </TouchableOpacity>
            </View>

            {/* Bouton principal */}
            <TouchableOpacity style={styles.primaryBtn} onPress={onComplete}>
              <Ionicons name="home" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.primaryBtnText}>Accéder à l'app</Text>
            </TouchableOpacity>

            {/* Passer */}
            <TouchableOpacity style={styles.skipBtn} onPress={onComplete}>
              <Text style={styles.skipBtnText}>Inviter plus tard</Text>
            </TouchableOpacity>
            <Text style={styles.skipHint}>
              Vous pourrez inviter votre famille à tout moment depuis{'\n'}
              <Text style={{ fontWeight: '600', color: '#9ca3af' }}>Mon Cercle → Inviter un membre</Text>
            </Text>

            {/* Indicateur d'étape */}
            <View style={styles.stepIndicator}>
              <View style={[styles.stepDot, styles.stepDotActive]} />
            </View>
            <Text style={styles.stepLabel}>Étape 2 sur 2</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Ce return ne devrait jamais être atteint (FlowStep = 'create-circle' | 'invite-family')
  return null;
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#7c3aed' },
  scrollContent: { flexGrow: 1, padding: 16, paddingBottom: 32 },

  // En-têtes colorés
  headerGradientPurple: {
    backgroundColor: '#7c3aed',
    padding: 32,
    alignItems: 'center',
    borderRadius: 20,
    marginBottom: 16,
  },
  headerGradientGreen: {
    backgroundColor: '#059669',
    padding: 32,
    alignItems: 'center',
    borderRadius: 20,
    marginBottom: 16,
  },
  headerIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 8 },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 20 },

  // Carte principale
  card: {
    backgroundColor: '#1f2937',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  // Formulaire
  label: { fontSize: 13, fontWeight: '600', color: '#9ca3af', marginBottom: 8 },
  hint: { fontSize: 12, color: '#6b7280', marginBottom: 16, marginTop: 4 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, color: '#fff', fontSize: 16, paddingVertical: 14 },

  // Bouton principal
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  btnDisabled: { opacity: 0.6 },

  // Bouton retour
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtnText: { color: '#9ca3af', fontSize: 14, marginLeft: 4 },

  // Bouton passer
  skipBtn: { alignItems: 'center', marginTop: 12 },
  skipBtnText: { color: '#6b7280', fontSize: 14 },
  skipHint: { fontSize: 11, color: '#6b7280', textAlign: 'center', marginTop: 6, lineHeight: 16 },

  // Code d'invitation
  codeBox: {
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#7c3aed',
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  codeLabel: { fontSize: 11, fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  codeText: { fontSize: 28, fontWeight: '800', color: '#a78bfa', letterSpacing: 6, marginBottom: 8 },
  codeHint: { fontSize: 11, color: '#6b7280', textAlign: 'center' },

  // Partage
  shareTitle: { fontSize: 14, fontWeight: '600', color: '#d1d5db', marginBottom: 10 },
  shareRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  shareBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 4,
  },
  shareBtnWhatsApp: { backgroundColor: '#25D366' },
  shareBtnSMS: { backgroundColor: '#7c3aed' },
  shareBtnCopy: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#7c3aed' },
  shareBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  // Indicateurs d'étape
  stepIndicator: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 20 },
  stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#374151' },
  stepDotActive: { backgroundColor: '#7c3aed' },
  stepLabel: { textAlign: 'center', fontSize: 11, color: '#6b7280', marginTop: 6 },

  // Barre de progression onboarding
  progressBar: { height: 4, backgroundColor: '#374151' },
  progressFill: { height: 4, backgroundColor: '#7c3aed' },

  // Slide onboarding
  slideContent: { alignItems: 'center', paddingVertical: 24 },
  slideIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  slideIconCirclePremium: { backgroundColor: 'rgba(168, 85, 247, 0.15)' },
  premiumBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 12,
  },
  premiumBadgeText: { color: '#a78bfa', fontSize: 12, fontWeight: '600' },
  slideTitle: { fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 12 },
  slideDesc: { fontSize: 14, color: '#9ca3af', textAlign: 'center', lineHeight: 22 },

  // Navigation onboarding
  navRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  prevBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#374151',
  },
  prevBtnText: { color: '#9ca3af', fontWeight: '600', fontSize: 15 },

  // Indicateurs de slide
  slideIndicators: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 16 },
  slideIndicatorDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#374151' },
  slideIndicatorDotActive: { width: 20, height: 8, borderRadius: 4, backgroundColor: '#7c3aed' },
});
