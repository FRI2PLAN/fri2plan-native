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
import SplashScreen from './screens/SplashScreen';
import { StyleSheet, Platform } from 'react-native';
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
  const lastRegisteredToken = useRef<string | null>(null);
  const registerPushMutation = trpc.fcm.registerToken.useMutation();

  useEffect(() => {
    if (!isAuthenticated || !token) {
      lastRegisteredToken.current = null;
      return;
    }

    registerForPushNotificationsAsync()
      .then(expoPushToken => {
        if (expoPushToken && expoPushToken !== lastRegisteredToken.current) {
          lastRegisteredToken.current = expoPushToken;
          registerPushMutation.mutate(
            { token: expoPushToken, platform: Platform.OS },
            {
              onSuccess: () => console.log('[Push] Token enregistré:', expoPushToken.slice(0, 40) + '...'),
              onError: (err) => console.error('[Push] Erreur enregistrement token:', err),
            }
          );
        }
      })
      .catch(err => console.error('[Push] Erreur obtention token:', err));
  }, [isAuthenticated, token]);

  return null;
}

// ─── Composant principal AppContent ──────────────────────────────────────────
function AppContent() {
  const { isAuthenticated, isLoading, hasSeenOnboarding, completeOnboarding, logout, token } = useAuth();
  const [currentPage, setCurrentPage] = useState(0);
  const [isInitializing, setIsInitializing] = useState(false);
  // Durée minimale du splash : 1500ms pour que l'animation soit visible
  const [splashMinDone, setSplashMinDone] = useState(false);

  // Timer durée minimale splash (1500ms)
  useEffect(() => {
    const timer = setTimeout(() => setSplashMinDone(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const { activeFamilyId } = useFamily();
  const trpcClient = useMemo(() => createTRPCClient(), [token, activeFamilyId]);

  // Invalider les requêtes quand le token change (connexion / déconnexion)
  const prevTokenRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevTokenRef.current !== token) {
      const wasNull = prevTokenRef.current === null;
      prevTokenRef.current = token;
      queryClient.clear();
      if (token && wasNull) {
        setIsInitializing(true);
        setTimeout(() => setIsInitializing(false), 800);
      }
    }
  }, [token]);

  // Le trpc.Provider enveloppe TOUT pour que LoginScreen puisse utiliser les hooks tRPC
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <PushRegistrar />

      {/* Splash screen pendant le chargement auth OU durée minimale non écoulée */}
      {(isLoading || isInitializing || !splashMinDone) ? (
        <SplashScreen />
      ) : isAuthenticated ? (
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

const styles = StyleSheet.create({});
