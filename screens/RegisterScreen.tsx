import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';

const REMEMBER_ME_EMAIL_KEY = 'rememberMe_email';
const REMEMBER_ME_ENABLED_KEY = 'rememberMe_enabled';

interface RegisterScreenProps {
  onBackToLogin: () => void;
  onRegistered?: () => void; // auto-login après inscription
}

export default function RegisterScreen({ onBackToLogin, onRegistered }: RegisterScreenProps) {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // tRPC mutation for auto-login after registration
  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async (data) => {
      if (data?.user && data?.token) {
        await login(data.user, data.token);
        // onRegistered sera appelé automatiquement via AuthContext
      }
      setLoading(false);
    },
    onError: () => {
      // Si l'auto-login échoue, rediriger vers le login
      setLoading(false);
      Alert.alert(
        'Compte créé !',
        'Votre compte a été créé. Veuillez vous connecter.',
        [{ text: 'OK', onPress: onBackToLogin }]
      );
    },
  });

  // tRPC mutation for registration
  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      // Auto-login après inscription réussie
      loginMutation.mutate({ email, password, rememberMe: false });
    },
    onError: (error) => {
      console.error('Registration error:', error);
      setLoading(false);
      Alert.alert('Erreur', error.message || 'Erreur lors de l\'inscription');
    },
  });

  const handleRegister = async () => {
    if (!email || !password || !name) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 8 caractères');
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.content}
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
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="votre@email.com"
                placeholderTextColor="#6b7280"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>

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
            <Text style={styles.hint}>{t('auth.minChars')}</Text>

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

            {/* Règles du mot de passe */}
            <View style={styles.passwordRules}>
              <Text style={styles.passwordRulesTitle}>Le mot de passe doit contenir :</Text>
              {[
                { label: '8 caractères minimum', ok: password.length >= 8 },
                { label: 'Une majuscule (A-Z)', ok: /[A-Z]/.test(password) },
                { label: 'Une minuscule (a-z)', ok: /[a-z]/.test(password) },
                { label: 'Un chiffre (0-9)', ok: /[0-9]/.test(password) },
                { label: 'Un caractère spécial (!@#$...)', ok: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
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

            {/* Bouton S'inscrire (rose/magenta) */}
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

            {/* Boutons OAuth */}
            <TouchableOpacity style={styles.oauthButton}>
              <Text style={styles.oauthButtonText}>{t('auth.continueWithManus')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.oauthButton}>
              <Ionicons name="logo-google" size={20} color="#fff" style={styles.oauthIcon} />
              <Text style={styles.oauthButtonText}>{t('auth.continueWithGoogle')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.oauthButton}>
              <Ionicons name="logo-apple" size={20} color="#fff" style={styles.oauthIcon} />
              <Text style={styles.oauthButtonText}>{t('auth.continueWithApple')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.oauthButton}>
              <Ionicons name="logo-microsoft" size={20} color="#fff" style={styles.oauthIcon} />
              <Text style={styles.oauthButtonText}>{t('auth.continueWithMicrosoft')}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#7c3aed', // Fond violet
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#1e293b', // Card sombre (slate-800)
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
    backgroundColor: '#2d3748', // Fond sombre pour input
    borderRadius: 8,
    width: '100%',
    marginBottom: 4,
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
  hint: {
    fontSize: 12,
    color: '#6b7280',
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#ec4899', // Rose/Magenta
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2d3748',
    borderRadius: 8,
    padding: 14,
    width: '100%',
    marginBottom: 12,
  },
  oauthIcon: {
    marginRight: 10,
  },
  oauthButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
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
