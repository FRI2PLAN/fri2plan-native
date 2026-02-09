import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { trpc } from '../lib/trpc';
import { useAuth } from '../contexts/AuthContext';
import RegisterScreen from './RegisterScreen';
import ForgotPasswordScreen from './ForgotPasswordScreen';

type ScreenMode = 'login' | 'register' | 'forgotPassword';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [screenMode, setScreenMode] = useState<ScreenMode>('login');

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
    loginMutation.mutate({ email, password });
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
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.content}
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
                placeholder="ixarialexandre@gmail.com"
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
            <Text style={styles.label}>Mot de passe</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#6b7280"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
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
                <Text style={styles.checkboxLabel}>Se souvenir de moi</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setScreenMode('forgotPassword')} disabled={loading}>
                <Text style={styles.forgotPassword}>Mot de passe oublié ?</Text>
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

            {/* OAuth buttons (disabled for now) */}
            <TouchableOpacity style={styles.oauthButton} disabled>
              <Text style={styles.oauthButtonText}>Continuer avec Manus</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.oauthButton} disabled>
              <Text style={styles.oauthButtonText}>Continuer avec Google</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.oauthButton} disabled>
              <Text style={styles.oauthButtonText}>Continuer avec Apple</Text>
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
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60, // Start card after safe zone
    justifyContent: 'center',
    paddingBottom: 40,
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
});
