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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/logo.jpg')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.logo}>FRI2PLAN</Text>
          </View>
          <Text style={styles.subtitle}>Organiseur Familial</Text>
        </View>

        {/* Login Form */}
        <View style={styles.form}>
          <Text style={styles.title}>Connexion</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="votre@email.com"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Mot de passe</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#9ca3af"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

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

          <TouchableOpacity style={styles.linkButton} onPress={() => setScreenMode('forgotPassword')}>
            <Text style={styles.linkText}>Mot de passe oublié ?</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.registerButton} onPress={() => setScreenMode('register')}>
            <Text style={styles.registerText}>Pas encore de compte ? <Text style={styles.registerTextBold}>S'inscrire</Text></Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Version Native • React Native</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#7c3aed',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  logoImage: {
    width: 60,
    height: 60,
    marginRight: 15,
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 18,
    color: '#e9d5ff',
  },
  form: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1f2937',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  button: {
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: '#7c3aed',
    fontSize: 16,
  },
  registerButton: {
    marginTop: 30,
    alignItems: 'center',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  registerText: {
    color: '#6b7280',
    fontSize: 16,
  },
  registerTextBold: {
    color: '#7c3aed',
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    color: '#e9d5ff',
    fontSize: 14,
  },
});
