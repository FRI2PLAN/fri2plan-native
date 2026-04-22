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
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import Svg, { Path, G, Rect, ClipPath, Defs } from 'react-native-svg';
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
  const [googleReady, setGoogleReady] = useState(false);

  // Initialiser Google Sign-In
  useEffect(() => {
    const initGoogle = async () => {
      try {
        GoogleSignin.configure({
          webClientId: '846470017457-qh90rioca6oujshvm05p23b5do8fbv6t.apps.googleusercontent.com',
          offlineAccess: true,
        });
        // Vérifier que Play Services est disponible avant d'activer le bouton
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: false });
      } catch (e) {
        // Play Services non disponible ou erreur — on active quand même le bouton
      } finally {
        setGoogleReady(true);
      }
    };
    initGoogle();
  }, []);

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

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;
      if (!idToken) throw new Error('Pas de token Google');

      // Envoyer le token au serveur pour validation et connexion
      // API_URL = 'https://app.fri2plan.ch/api/trpc' → base = 'https://app.fri2plan.ch'
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
        // L'utilisateur a annulé — ne rien faire
      } else if (err.code === statusCodes.IN_PROGRESS) {
        // Connexion déjà en cours
      } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Erreur', 'Google Play Services non disponible');
      } else {
        Alert.alert('❌', err.message || 'Impossible de se connecter avec Google');
      }
    } finally {
      setGoogleLoading(false);
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
            <TouchableOpacity
              style={[styles.oauthButton, styles.oauthButtonGoogle, (!googleReady || googleLoading || loading) && styles.buttonDisabled]}
              onPress={handleGoogleLogin}
              disabled={!googleReady || googleLoading || loading}
            >
              {googleLoading ? (
                <View style={styles.oauthLoadingRow}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={[styles.oauthButtonText, { marginLeft: 8 }]}>Connexion en cours...</Text>
                </View>
              ) : !googleReady ? (
                <View style={styles.oauthLoadingRow}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={[styles.oauthButtonText, { marginLeft: 8 }]}>{t('auth.continueWithGoogle')}</Text>
                </View>
              ) : (
                <View style={styles.oauthLoadingRow}>
                  <Svg width={20} height={20} viewBox="0 0 48 48" style={{ marginRight: 8 }}>
                    <Defs>
                      <ClipPath id="clip">
                        <Rect width={48} height={48} rx={24} />
                      </ClipPath>
                    </Defs>
                    <G clipPath="url(#clip)">
                      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    </G>
                  </Svg>
                  <Text style={styles.oauthButtonText}>{t('auth.continueWithGoogle')}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={[styles.oauthButton, styles.oauthButtonApple]} disabled>
              <View style={styles.oauthLoadingRow}>
                <Text style={{ fontSize: 18, marginRight: 8, color: '#fff', fontWeight: 'bold' }}></Text>
                <Text style={styles.oauthButtonText}>{t('auth.continueWithApple')}</Text>
              </View>
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
  oauthButtonApple: {
    backgroundColor: '#000',
    opacity: 0.6,
  },
});
