import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trpc } from '../lib/trpc';
import { useAuth } from '../contexts/AuthContext';
import RegisterScreen from './RegisterScreen';
import ForgotPasswordScreen from './ForgotPasswordScreen';
import { useTranslation } from 'react-i18next';
import { Linking } from 'react-native';
import { API_URL } from '../lib/trpc';

type ScreenMode = 'login' | 'register' | 'forgotPassword';

const REMEMBER_ME_EMAIL_KEY = 'rememberMe_email';
const REMEMBER_ME_ENABLED_KEY = 'rememberMe_enabled';

export default function LoginScreen() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [screenMode, setScreenMode] = useState<ScreenMode>('login');
  const [googleLoading, setGoogleLoading] = useState(false);
  const googlePollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Charger l'email sauvegardé au démarrage si "Se souvenir de moi" était coché
  useEffect(() => {
    const loadSavedEmail = async () => {
      try {
        const [savedEmail, savedRememberMe] = await Promise.all([
          AsyncStorage.getItem(REMEMBER_ME_EMAIL_KEY),
          AsyncStorage.getItem(REMEMBER_ME_ENABLED_KEY),
        ]);
        if (savedRememberMe === 'true' && savedEmail) {
          setEmail(savedEmail);
          setRememberMe(true);
        }
      } catch (e) {
        // Ignorer les erreurs de lecture
      }
    };
    loadSavedEmail();
  }, []);

  // Nettoyage du polling au démontage
  useEffect(() => {
    return () => {
      if (googlePollRef.current) clearInterval(googlePollRef.current);
    };
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      // Générer un sessionId unique
      const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      // Ouvrir le navigateur pour la connexion Google
      const loginUrl = `${API_URL.replace('/trpc', '')}/api/google/login?sessionId=${sessionId}&mode=native`;
      await Linking.openURL(loginUrl);
      // Démarrer le polling toutes les 2 secondes (max 3 minutes)
      let attempts = 0;
      const maxAttempts = 90;
      googlePollRef.current = setInterval(async () => {
        attempts++;
        if (attempts > maxAttempts) {
          clearInterval(googlePollRef.current!);
          setGoogleLoading(false);
          Alert.alert('⏱️', 'Délai de connexion dépassé. Veuillez réessayer.');
          return;
        }
        try {
          const pollUrl = `${API_URL.replace('/trpc', '')}/api/google/poll?sessionId=${sessionId}`;
          const resp = await fetch(pollUrl);
          const data = await resp.json();
          if (data.status === 'success' && data.token && data.user) {
            clearInterval(googlePollRef.current!);
            setGoogleLoading(false);
            await login(data.user, data.token);
          }
        } catch { /* ignorer les erreurs réseau temporaires */ }
      }, 2000);
    } catch (err) {
      setGoogleLoading(false);
      Alert.alert('❌', 'Impossible d\'ouvrir la connexion Google');
    }
  };

  // tRPC mutation for login
  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async (data) => {
      try {
        console.log('Login response:', data);

        // Validate response data
        if (!data || !data.user || !data.token) {
          console.error('Invalid login response:', data);
          Alert.alert('Erreur', 'Réponse invalide du serveur');
          setLoading(false);
          return;
        }

        // Sauvegarder ou effacer l'email selon l'option "Se souvenir de moi"
        if (rememberMe) {
          await Promise.all([
            AsyncStorage.setItem(REMEMBER_ME_EMAIL_KEY, email),
            AsyncStorage.setItem(REMEMBER_ME_ENABLED_KEY, 'true'),
          ]);
        } else {
          await Promise.all([
            AsyncStorage.removeItem(REMEMBER_ME_EMAIL_KEY),
            AsyncStorage.removeItem(REMEMBER_ME_ENABLED_KEY),
          ]);
        }

        // Store token and user data using AuthContext
        await login(data.user, data.token);
        setLoading(false);
        // User will be automatically redirected by AuthContext
      } catch (error) {
        console.error('Error saving user data:', error);
        setLoading(false);
        Alert.alert('Erreur', error instanceof Error ? error.message : 'Erreur lors de la sauvegarde des données');
      }
    },
    onError: (error) => {
      console.error('Login error:', error);
      setLoading(false);
      Alert.alert('Erreur', error.message || 'Identifiants incorrects');
    },
  });

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    // Transmettre rememberMe au serveur pour obtenir un token de 30 jours
    loginMutation.mutate({ email, password, rememberMe });
  };

  // Show Register screen
  if (screenMode === 'register') {
    return <RegisterScreen onBackToLogin={() => setScreenMode('login')} />;
  }

  // Show Forgot Password screen
  if (screenMode === 'forgotPassword') {
    return <ForgotPasswordScreen onBackToLogin={() => setScreenMode('login')} />;
  }

  // Show Login screen (default)
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* Card sombre de connexion */}
          <View style={styles.card}>
            {/* Logo centré dans la card */}
            <Image
              source={require('../assets/logo.jpg')}
              style={styles.cardLogo}
              resizeMode="contain"
            />

            <Text style={styles.title}>Connexion</Text>
            <Text style={styles.subtitle}>
              Connectez-vous à votre compte Fri2Plan - Votre agenda familial
            </Text>

            {/* Email */}
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputContainer}>
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
            <View style={styles.inputContainer}>
              <View style={styles.passwordRow}>
                <TextInput
                  style={styles.passwordInput}
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
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Se souvenir de moi + Mot de passe oublié */}
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setRememberMe(!rememberMe)}
                disabled={loading}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>{t('auth.rememberMe')}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setScreenMode('forgotPassword')} disabled={loading}>
                <Text style={styles.forgotPassword}>{t('auth.forgotPassword')}</Text>
              </TouchableOpacity>
            </View>

            {/* Bouton Se connecter (rose/magenta) */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Se connecter</Text>
              )}
            </TouchableOpacity>

            {/* Pas encore de compte */}
            <TouchableOpacity onPress={() => setScreenMode('register')} disabled={loading}>
              <Text style={styles.registerText}>
                Pas encore de compte ? <Text style={styles.registerLink}>S'inscrire</Text>
              </Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OU</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* OAuth buttons */}
            <TouchableOpacity style={styles.oauthButton} disabled>
              <Text style={styles.oauthButtonText}>{t('auth.continueWithManus')}</Text>
            </TouchableOpacity>

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
                <Text style={styles.oauthButtonText}>🔵 {t('auth.continueWithGoogle')}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.oauthButton} disabled>
              <Text style={styles.oauthButtonText}>{t('auth.continueWithApple')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#7c3aed', // Fond violet
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#1f2937', // Card sombre
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
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    alignSelf: 'flex-start',
    marginBottom: 8,
    marginTop: 10,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 15,
  },
  input: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#fff',
    width: '100%',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    borderRadius: 8,
    width: '100%',
  },
  passwordInput: {
    flex: 1,
    padding: 14,
    fontSize: 16,
    color: '#fff',
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeIcon: {
    fontSize: 18,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
    marginBottom: 25,
    flexWrap: 'wrap',
    gap: 10,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 150,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#06b6d4',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#06b6d4',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#9ca3af',
  },
  forgotPassword: {
    fontSize: 14,
    color: '#c084fc',
    fontWeight: '600',
    flexShrink: 1,
  },
  button: {
    backgroundColor: '#ec4899', // Rose/Magenta
    borderRadius: 8,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerText: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 25,
  },
  registerLink: {
    color: '#c084fc',
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
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
    opacity: 0.5,
  },
  oauthButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  oauthButtonGoogle: {
    backgroundColor: '#4285f4',
    opacity: 1,
  },
  oauthLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
