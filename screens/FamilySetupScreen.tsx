import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView, Share, Platform,
  KeyboardAvoidingView, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../lib/trpc';
import { useFamily } from '../contexts/FamilyContext';
import { useQueryClient } from '@tanstack/react-query';

interface FamilySetupScreenProps {
  onComplete: () => void; // appelé quand la famille est créée/rejointe
  onSkip?: () => void;    // optionnel : ignorer pour l'instant
}

type Mode = 'choice' | 'create' | 'join' | 'created';

export default function FamilySetupScreen({ onComplete, onSkip }: FamilySetupScreenProps) {
  const [mode, setMode] = useState<Mode>('choice');
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [createdInviteCode, setCreatedInviteCode] = useState('');
  const [createdFamilyName, setCreatedFamilyName] = useState('');
  const { setActiveFamilyId } = useFamily();
  const queryClient = useQueryClient();

  // ── Mutation : créer une famille ──
  const createFamily = trpc.family.create.useMutation({
    onSuccess: (data) => {
      setActiveFamilyId(data.familyId);
      setCreatedInviteCode(data.inviteCode || '');
      setCreatedFamilyName(familyName.trim());
      queryClient.invalidateQueries();
      setMode('created');
    },
    onError: (e: any) => Alert.alert('Erreur', e.message || 'Impossible de créer la famille'),
  });

  // ── Mutation : rejoindre une famille ──
  const joinFamily = trpc.family.join.useMutation({
    onSuccess: (data) => {
      setActiveFamilyId(data.familyId);
      queryClient.invalidateQueries();
      Alert.alert('✅ Famille rejointe !', 'Vous avez rejoint la famille avec succès.', [
        { text: 'Continuer', onPress: onComplete },
      ]);
    },
    onError: (e: any) => Alert.alert('Erreur', e.message || 'Code d\'invitation invalide'),
  });

  const handleCreate = () => {
    if (!familyName.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un nom de famille');
      return;
    }
    createFamily.mutate({ name: familyName.trim() });
  };

  const handleJoin = () => {
    if (!inviteCode.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un code d\'invitation');
      return;
    }
    joinFamily.mutate({ inviteCode: inviteCode.trim().toUpperCase() });
  };

  const handleShareCode = async () => {
    try {
      await Share.share({
        message: `Rejoins ma famille sur FRI2PLAN ! 🏠\n\nCode d'invitation : ${createdInviteCode}\n\nTélécharge l'app sur https://app.fri2plan.ch`,
        title: 'Invitation FRI2PLAN',
      });
    } catch { /* ignorer */ }
  };

  // ─── Écran de choix ───────────────────────────────────────────────────────────
  if (mode === 'choice') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <Image source={require('../assets/logo.jpg')} style={styles.logo} resizeMode="contain" />
            <Text style={styles.title}>Bienvenue ! 🎉</Text>
            <Text style={styles.subtitle}>
              Pour commencer, créez votre famille ou rejoignez une famille existante.
            </Text>

            <TouchableOpacity style={styles.primaryBtn} onPress={() => setMode('create')}>
              <Ionicons name="home-outline" size={22} color="#fff" style={styles.btnIcon} />
              <Text style={styles.primaryBtnText}>Créer une famille</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setMode('join')}>
              <Ionicons name="people-outline" size={22} color="#7c3aed" style={styles.btnIcon} />
              <Text style={styles.secondaryBtnText}>Rejoindre une famille</Text>
            </TouchableOpacity>

            {onSkip && (
              <TouchableOpacity style={styles.skipBtn} onPress={onSkip}>
                <Text style={styles.skipBtnText}>Plus tard</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Créer une famille ────────────────────────────────────────────────────────
  if (mode === 'create') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.card}>
              <TouchableOpacity style={styles.backBtn} onPress={() => setMode('choice')}>
                <Ionicons name="arrow-back" size={20} color="#9ca3af" />
                <Text style={styles.backBtnText}>Retour</Text>
              </TouchableOpacity>

              <Text style={styles.title}>🏠 Créer une famille</Text>
              <Text style={styles.subtitle}>
                Donnez un nom à votre famille. Vous pourrez ensuite inviter vos proches.
              </Text>

              <Text style={styles.label}>Nom de la famille</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="home-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Famille Dupont"
                  placeholderTextColor="#6b7280"
                  value={familyName}
                  onChangeText={setFamilyName}
                  autoCapitalize="words"
                  editable={!createFamily.isPending}
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, createFamily.isPending && styles.btnDisabled]}
                onPress={handleCreate}
                disabled={createFamily.isPending}
              >
                {createFamily.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={22} color="#fff" style={styles.btnIcon} />
                    <Text style={styles.primaryBtnText}>Créer la famille</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ─── Rejoindre une famille ────────────────────────────────────────────────────
  if (mode === 'join') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.card}>
              <TouchableOpacity style={styles.backBtn} onPress={() => setMode('choice')}>
                <Ionicons name="arrow-back" size={20} color="#9ca3af" />
                <Text style={styles.backBtnText}>Retour</Text>
              </TouchableOpacity>

              <Text style={styles.title}>👥 Rejoindre une famille</Text>
              <Text style={styles.subtitle}>
                Saisissez le code d'invitation que vous avez reçu d'un membre de la famille.
              </Text>

              <Text style={styles.label}>Code d'invitation</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="key-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.codeInput]}
                  placeholder="Ex: ABC123"
                  placeholderTextColor="#6b7280"
                  value={inviteCode}
                  onChangeText={setInviteCode}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={!joinFamily.isPending}
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, joinFamily.isPending && styles.btnDisabled]}
                onPress={handleJoin}
                disabled={joinFamily.isPending}
              >
                {joinFamily.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="enter-outline" size={22} color="#fff" style={styles.btnIcon} />
                    <Text style={styles.primaryBtnText}>Rejoindre</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ─── Famille créée avec succès + code d'invitation ───────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={64} color="#10b981" />
          </View>
          <Text style={styles.title}>🎉 Famille créée !</Text>
          <Text style={styles.subtitle}>
            La famille <Text style={styles.bold}>"{createdFamilyName}"</Text> a été créée avec succès.
          </Text>

          {createdInviteCode ? (
            <>
              <Text style={styles.label}>Code d'invitation</Text>
              <Text style={styles.hint}>Partagez ce code avec vos proches pour qu'ils rejoignent votre famille.</Text>
              <View style={styles.codeBox}>
                <Text style={styles.codeText}>{createdInviteCode}</Text>
              </View>

              <TouchableOpacity style={styles.shareBtn} onPress={handleShareCode}>
                <Ionicons name="share-social-outline" size={20} color="#fff" style={styles.btnIcon} />
                <Text style={styles.primaryBtnText}>Partager le code</Text>
              </TouchableOpacity>
            </>
          ) : null}

          <TouchableOpacity style={styles.primaryBtn} onPress={onComplete}>
            <Ionicons name="arrow-forward-outline" size={22} color="#fff" style={styles.btnIcon} />
            <Text style={styles.primaryBtnText}>Accéder à l'application</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#7c3aed' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: {
    backgroundColor: '#1f2937',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logo: { width: 80, height: 80, alignSelf: 'center', marginBottom: 16, borderRadius: 12 },
  title: { fontSize: 24, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#9ca3af', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  bold: { fontWeight: '700', color: '#e5e7eb' },
  label: { fontSize: 13, fontWeight: '600', color: '#9ca3af', marginBottom: 6, marginTop: 12 },
  hint: { fontSize: 12, color: '#6b7280', marginBottom: 8 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111827', borderRadius: 12,
    borderWidth: 1, borderColor: '#374151',
    paddingHorizontal: 12, marginBottom: 16,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, color: '#fff', fontSize: 16, paddingVertical: 14 },
  codeInput: { letterSpacing: 4, fontWeight: '700', fontSize: 18 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#7c3aed', borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 20, marginTop: 8,
  },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'transparent', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#7c3aed',
    paddingVertical: 14, paddingHorizontal: 20, marginTop: 12,
  },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#059669', borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 20, marginTop: 8, marginBottom: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnIcon: { marginRight: 8 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryBtnText: { color: '#7c3aed', fontWeight: '700', fontSize: 16 },
  skipBtn: { alignItems: 'center', marginTop: 16 },
  skipBtnText: { color: '#6b7280', fontSize: 14 },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtnText: { color: '#9ca3af', fontSize: 14, marginLeft: 4 },
  successIcon: { alignItems: 'center', marginBottom: 16 },
  codeBox: {
    backgroundColor: '#111827', borderRadius: 12,
    borderWidth: 2, borderColor: '#7c3aed',
    padding: 16, alignItems: 'center', marginBottom: 8,
  },
  codeText: { fontSize: 28, fontWeight: '800', color: '#7c3aed', letterSpacing: 6 },
});
