import 'react-native-gesture-handler';
import './i18n'; // Initialize i18n
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc, createTRPCClient } from './lib/trpc';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { FamilyProvider } from './contexts/FamilyContext';
import { PagerProvider } from './contexts/PagerContext';
import LoginScreen from './screens/LoginScreen';
import AppNavigator from './navigation/AppNavigator';
import OnboardingScreen from './screens/OnboardingScreen';
import SplashScreen from './screens/SplashScreen';
import { StyleSheet, Platform } from 'react-native';
import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
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

    // Délai de 3s après connexion avant de demander les permissions push
    // évite le crash Android quand la dialog système s'ouvre trop tôt
    const pushTimer = setTimeout(() => {
      registerForPushNotificationsAsync()
        .then(fcmToken => {
          if (fcmToken && fcmToken !== lastRegisteredToken.current) {
            lastRegisteredToken.current = fcmToken;
            registerPushMutation.mutate(
              { token: fcmToken, platform: Platform.OS === 'android' ? 'native_android' : 'native_ios' },
              {
                onSuccess: () => console.log('[Push] Token FCM enregistré:', fcmToken.slice(0, 40) + '...'),
                onError: (err) => console.error('[Push] Erreur enregistrement token:', err),
              }
            );
          }
        })
        .catch(err => console.error('[Push] Erreur obtention token:', err));
    }, 3000);
    return () => clearTimeout(pushTimer);
  }, [isAuthenticated, token]);

  return null;
}

// ─── Sous-composant FCMLogoutHandler ─────────────────────────────────────────
// Supprime le token FCM natif côté serveur lors de la déconnexion
// Doit être rendu INSIDE <trpc.Provider> pour pouvoir utiliser les hooks tRPC
function FCMLogoutHandler({ onLogoutReady }: { onLogoutReady: (logoutFn: () => Promise<void>) => void }) {
  const { logout } = useAuth();
  const deleteTokenMutation = trpc.fcm.deleteToken.useMutation();

  const handleLogout = useCallback(async () => {
    try {
      // Supprimer uniquement le token native_android (ou native_ios) côté serveur
      const platform = Platform.OS === 'android' ? 'native_android' : 'native_ios';
      await deleteTokenMutation.mutateAsync({ platform });
      console.log('[Push] Token FCM supprimé côté serveur pour platform:', platform);
    } catch (err) {
      // Ne pas bloquer la déconnexion si la suppression échoue
      console.warn('[Push] Erreur suppression token FCM:', err);
    }
    // Puis déconnecter localement
    await logout();
  }, [logout, deleteTokenMutation]);

  useEffect(() => {
    onLogoutReady(handleLogout);
  }, [handleLogout, onLogoutReady]);

  return null;
}

// ─── Composant principal AppContent ──────────────────────────────────────────
function AppContent() {
  const { isAuthenticated, isLoading, hasSeenOnboarding, completeOnboarding, logout, token } = useAuth();
  const [currentPage, setCurrentPage] = useState(0);
  const [isInitializing, setIsInitializing] = useState(false);
  // Durée minimale du splash : 3000ms pour que l'animation soit visible
  const [splashMinDone, setSplashMinDone] = useState(false);
  // Fonction logout enrichie (avec suppression FCM) fournie par FCMLogoutHandler
  const [fcmLogout, setFcmLogout] = useState<(() => Promise<void>) | null>(null);

  // Timer durée minimale splash (3000ms) — laisse le temps à l'app de se monter complètement
  useEffect(() => {
    const timer = setTimeout(() => setSplashMinDone(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Ne recréer le client tRPC QUE quand le token change
  // activeFamilyId est lu dynamiquement depuis AsyncStorage dans chaque requête (lib/trpc.ts)
  const trpcClient = useMemo(() => createTRPCClient(), [token]);

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

  // Callback stable pour recevoir la fonction logout enrichie depuis FCMLogoutHandler
  const handleLogoutReady = useCallback((logoutFn: () => Promise<void>) => {
    setFcmLogout(() => logoutFn);
  }, []);

  // Utiliser le logout enrichi (avec suppression FCM) si disponible, sinon le logout simple
  const effectiveLogout = fcmLogout ?? logout;

  // Le trpc.Provider enveloppe TOUT pour que LoginScreen puisse utiliser les hooks tRPC
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <PushRegistrar />
      <FCMLogoutHandler onLogoutReady={handleLogoutReady} />

      {/* Splash screen pendant le chargement auth OU durée minimale non écoulée */}
      {(isLoading || isInitializing || !splashMinDone) ? (
        <SplashScreen />
      ) : isAuthenticated ? (
        <>
          <AppNavigator onLogout={effectiveLogout} />
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