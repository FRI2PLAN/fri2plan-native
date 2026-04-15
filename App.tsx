import 'react-native-gesture-handler';
import './i18n'; // Initialize i18n
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc, createTRPCClient } from './lib/trpc';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { FamilyProvider, useFamily } from './contexts/FamilyContext';
import { PagerProvider } from './contexts/PagerContext';
import LoginScreen from './screens/LoginScreen';
import AppNavigator from './navigation/AppNavigator';
import OnboardingScreen from './screens/OnboardingScreen';
import { ActivityIndicator, View, StyleSheet, Platform } from 'react-native';
import { useEffect, useState, useMemo, useRef } from 'react';
import * as NavigationBar from 'expo-navigation-bar';
import { registerForPushNotificationsAsync } from './hooks/usePushNotifications';

// Create QueryClient (stable, never recreated)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5000,
    },
  },
});

// ─── Sous-composant PushRegistrar ─────────────────────────────────────────────
// Doit être rendu INSIDE <trpc.Provider> pour pouvoir utiliser les hooks tRPC
function PushRegistrar() {
  const { isAuthenticated, token } = useAuth();
  const pushTokenRegistered = useRef(false);
  const registerPushMutation = trpc.fcm.registerToken.useMutation();

  useEffect(() => {
    if (isAuthenticated && token && !pushTokenRegistered.current) {
      pushTokenRegistered.current = true;
      registerForPushNotificationsAsync()
        .then(expoPushToken => {
          if (expoPushToken) {
            registerPushMutation.mutate(
              { token: expoPushToken, platform: Platform.OS },
              {
                onSuccess: () => console.log('[Push] Token Expo enregistré sur le serveur'),
                onError: (err) => console.error('[Push] Erreur enregistrement token:', err),
              }
            );
          }
        })
        .catch(err => console.error('[Push] Erreur obtention token:', err));
    }
    // Réinitialiser lors de la déconnexion
    if (!isAuthenticated) {
      pushTokenRegistered.current = false;
    }
  }, [isAuthenticated, token]);

  return null; // Composant invisible — effet uniquement
}

// ─── Composant principal AppContent ──────────────────────────────────────────
function AppContent() {
  const { isAuthenticated, isLoading, hasSeenOnboarding, completeOnboarding, logout, token } = useAuth();
  const [currentPage, setCurrentPage] = useState(0);
  const [isInitializing, setIsInitializing] = useState(false);

  const { activeFamilyId } = useFamily();
  // Recreate tRPC client whenever the auth token or active family changes so requests include the correct headers
  const trpcClient = useMemo(() => createTRPCClient(), [token, activeFamilyId]);

  // Invalidate all queries when the token changes (login / logout)
  const prevTokenRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevTokenRef.current !== token) {
      const wasNull = prevTokenRef.current === null;
      prevTokenRef.current = token;
      queryClient.clear();
      // When token appears for the first time (app start or login),
      // show a brief initializing state so queries have time to fire
      if (token && wasNull) {
        setIsInitializing(true);
        setTimeout(() => setIsInitializing(false), 800);
      }
    }
  }, [token]);

  if (isLoading || isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      {/* PushRegistrar est INSIDE trpc.Provider — peut utiliser les hooks tRPC */}
      <PushRegistrar />
      {isAuthenticated ? (
        <>
          <AppNavigator onLogout={logout} />
          <OnboardingScreen
            visible={!hasSeenOnboarding}
            onComplete={completeOnboarding}
            onNavigate={(pageIndex) => {
              setCurrentPage(pageIndex);
            }}
          />
        </>
      ) : (
        <LoginScreen />
      )}
    </trpc.Provider>
  );
}

export default function App() {
  // Hide Android navigation bar on app startup
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden');
      NavigationBar.setBehaviorAsync('overlay-swipe');
    }
  }, []);

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <FamilyProvider>
            <PagerProvider>
              <AppContent />
            </PagerProvider>
          </FamilyProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
