import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../lib/trpc';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { API_URL } from '../lib/trpc';

interface RegisterScreenProps {
  onBackToLogin: () => void;
  onRegistered?: () => void; // auto-login après inscription
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen({ onBackToLogin, onRegistered }: RegisterScreenProps) {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Initialiser Google Sign-In
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '846470017457-qh90rioca6oujshvm05p23b5do8fbv6t.apps.googleusercontent.com',
      offlineAccess: true,
    });
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;
      if (!idToken) throw new Error('Pas de token Google');

      const baseUrl = API_URL.replace('/api/trpc', '').replace('/trpc', '');
      const resp = await fetch(`${baseUrl}/api/google/native-signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const data = await resp.json();
      if (data.token && data.user) {
        await login(data.user, data.token);
      } else {
        throw new Error(data.error || 'Erreur de connexion Google');
      }
    } catch (err: any) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        // annulé
      } else if (err.code === statusCodes.IN_PROGRESS) {
        // en cours
      } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Erreur', 'Google Play Services non disponible');
      } else {
        Alert.alert('❌', err.message || 'Impossible de se connecter avec Google');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // tRPC mutation for auto-login after registration
  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async (data) => {
      if (data?.user && data?.token) {
        await login(data.user, data.token);
      }
      setLoading(false);
    },
    onError: () => {
      setLoading(false);
      Alert.alert(
        t('register.accountCreatedTitle'),
        t('register.accountCreatedMsg'),
        [{ text: 'OK', onPress: onBackToLogin }]
      );
    },
  });

  // tRPC mutation for registration
  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      loginMutation.mutate({ email, password, rememberMe: true });
    },
    onError: (error) => {
      console.error('Registration error:', error);
      setLoading(false);
      Alert.alert(t('common.error'), error.message || t('common.error'));
    },
  });

  const validateEmail = (value: string) => {
    if (!value) {
      setEmailError('');
      return;
    }
    if (!EMAIL_REGEX.test(value)) {
      setEmailError(t('auth.invalidEmail') || 'Adresse email invalide');
    } else {
      setEmailError('');
    }
  };

  const handleRegister = async () => {
    if (!email || !password || !name) {
      Alert.alert(t('common.error'), t('auth.fillAllFields') || 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (!EMAIL_REGEX.test(email)) {
      Alert.alert(t('common.error'), t('auth.invalidEmail') || 'Adresse email invalide');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(t('common.error'), t('auth.passwordMismatch') || 'Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 8) {
      Alert.alert(t('common.error'), t('register.passwordMinLength') || 'Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    setLoading(true);
    registerMutation.mutate({
      email,
      password,
      name,
      inviteCode: inviteCode || undefined,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      {/* KeyboardAvoidingView enveloppe ScrollView pour que le scroll fonctionne correctement */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* Card sombre d'inscription */}
          <View style={styles.card}>
            {/* Logo centré dans la card */}
            <Image
              source={require('../assets/logo.jpg')}
              style={styles.cardLogo}
              resizeMode="contain"
            />

            <Text style={styles.title}>Inscription</Text>
            <Text style={styles.subtitle}>
              Créez votre compte Fri2Plan - Votre agenda familial
            </Text>

            {/* Nom complet */}
            <Text style={styles.label}>Nom complet</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Jean Dupont"
                placeholderTextColor="#6b7280"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                editable={!loading}
              />
            </View>

            {/* Email */}
            <Text style={styles.label}>Email</Text>
            <View style={[styles.inputWrapper, emailError ? styles.inputWrapperError : null]}>
              <Ionicons name="mail-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="votre@email.com"
                placeholderTextColor="#6b7280"
                value={email}
                onChangeText={(v) => { setEmail(v); validateEmail(v); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

            {/* Mot de passe */}
            <Text style={styles.label}>{t('auth.password')}</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#6b7280"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="#9ca3af"
                />
              </TouchableOpacity>
            </View>

            {/* Règles du mot de passe */}
            <View style={styles.passwordRules}>
              <Text style={styles.passwordRulesTitle}>{t('auth.passwordMustContain') || 'Le mot de passe doit contenir :'}</Text>
              {[
                { label: t('register.passwordMinLength'), ok: password.length >= 8 },
                { label: t('auth.pwdUppercase') || 'Une majuscule (A-Z)', ok: /[A-Z]/.test(password) },
                { label: t('auth.pwdLowercase') || 'Une minuscule (a-z)', ok: /[a-z]/.test(password) },
                { label: t('auth.pwdDigit') || 'Un chiffre (0-9)', ok: /[0-9]/.test(password) },
                { label: t('auth.pwdSpecial') || 'Un caractère spécial (!@#$...)', ok: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
              ].map((rule, i) => (
                <View key={i} style={styles.passwordRule}>
                  <Ionicons
                    name={rule.ok ? 'checkmark-circle' : 'ellipse-outline'}
                    size={14}
                    color={rule.ok ? '#10b981' : '#6b7280'}
                  />
                  <Text style={[styles.passwordRuleText, rule.ok && styles.passwordRuleOk]}>
                    {rule.label}
                  </Text>
                </View>
              ))}
            </View>

            {/* Confirmer mot de passe */}
            <Text style={styles.label}>{t('auth.confirmPassword')}</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#6b7280"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="#9ca3af"
                />
              </TouchableOpacity>
            </View>

            {/* Code d'invitation (optionnel) */}
            <TouchableOpacity
              style={styles.inviteToggle}
              onPress={() => setShowInviteCode(!showInviteCode)}
            >
              <Ionicons
                name={showInviteCode ? 'chevron-up-outline' : 'chevron-down-outline'}
                size={16} color="#7c3aed"
              />
              <Text style={styles.inviteToggleText}>
                {showInviteCode ? 'Masquer le code d\'invitation' : 'J\'ai un code d\'invitation'}
              </Text>
            </TouchableOpacity>
            {showInviteCode && (
              <View style={styles.inputWrapper}>
                <Ionicons name="key-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Code d'invitation (optionnel)"
                  placeholderTextColor="#6b7280"
                  value={inviteCode}
                  onChangeText={setInviteCode}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>
            )}

            {/* Bouton S'inscrire */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>S'inscrire</Text>
              )}
            </TouchableOpacity>

            {/* Déjà un compte */}
            <TouchableOpacity onPress={onBackToLogin} disabled={loading}>
              <Text style={styles.backText}>
                Déjà un compte ? <Text style={styles.backLink}>Se connecter</Text>
              </Text>
            </TouchableOpacity>

            {/* Séparateur OU */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OU</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Bouton Google */}
            <TouchableOpacity
              style={[styles.oauthButton, styles.oauthButtonGoogle]}
              onPress={handleGoogleLogin}
              disabled={googleLoading || loading}
            >
              {googleLoading ? (
                <View style={styles.oauthLoadingRow}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={[styles.oauthButtonText, { marginLeft: 8 }]}>Connexion en cours...</Text>
                </View>
              ) : (
                <View style={styles.oauthLoadingRow}>
                  <Text style={{ fontSize: 18, marginRight: 8, color: '#fff', fontWeight: 'bold' }}>G</Text>
                  <Text style={styles.oauthButtonText}>{t('auth.continueWithGoogle')}</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Bouton Apple */}
            <TouchableOpacity style={[styles.oauthButton, styles.oauthButtonApple]} disabled>
              <View style={styles.oauthLoadingRow}>
                <Text style={{ fontSize: 18, marginRight: 8, color: '#fff', fontWeight: 'bold' }}></Text>
                <Text style={styles.oauthButtonText}>{t('auth.continueWithApple')}</Text>
              </View>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#7c3aed',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
  },
  cardLogo: {
    width: 80,
    height: 80,
    marginBottom: 20,
    borderRadius: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    alignSelf: 'flex-start',
    marginBottom: 8,
    marginTop: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d3748',
    borderRadius: 8,
    width: '100%',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputWrapperError: {
    borderColor: '#ef4444',
  },
  inputIcon: {
    marginLeft: 14,
    marginRight: 10,
  },
  input: {
    flex: 1,
    padding: 14,
    fontSize: 16,
    color: '#fff',
  },
  eyeIcon: {
    padding: 14,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  button: {
    backgroundColor: '#ec4899',
    borderRadius: 8,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 15,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 20,
  },
  backLink: {
    color: '#c084fc',
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#374151',
  },
  dividerText: {
    color: '#9ca3af',
    fontSize: 14,
    marginHorizontal: 15,
  },
  oauthButton: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  oauthButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  oauthButtonGoogle: {
    backgroundColor: '#4285f4',
  },
  oauthButtonApple: {
    backgroundColor: '#000',
    opacity: 0.7,
  },
  oauthLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inviteToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 8,
    marginTop: 4,
    gap: 6,
  },
  inviteToggleText: {
    color: '#7c3aed',
    fontSize: 13,
    fontWeight: '600',
  },
  passwordRules: {
    width: '100%',
    backgroundColor: '#111827',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    marginTop: 4,
  },
  passwordRulesTitle: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  passwordRule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  passwordRuleText: {
    color: '#6b7280',
    fontSize: 12,
  },
  passwordRuleOk: {
    color: '#10b981',
  },
});
