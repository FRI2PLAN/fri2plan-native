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
import { GoogleSignin } from '@react-native-google-signin/google-signin';

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
      // Réinitialiser lors de la déconnexion pour forcer le re-enregistrement à la prochaine connexion
      lastRegisteredToken.current = null;
      return;
    }

    // Enregistrer le token push à chaque démarrage/connexion
    // (le serveur fait un upsert donc pas de doublon)
    registerForPushNotificationsAsync()
      .then(expoPushToken => {
        if (expoPushToken && expoPushToken !== lastRegisteredToken.current) {
          lastRegisteredToken.current = expoPushToken;
          registerPushMutation.mutate(
            { token: expoPushToken, platform: Platform.OS },
            {
              onSuccess: () => console.log('[Push] Token Expo enregistré/mis à jour sur le serveur:', expoPushToken.slice(0, 40) + '...'),
              onError: (err) => console.error('[Push] Erreur enregistrement token:', err),
            }
          );
        } else if (!expoPushToken) {
          console.warn('[Push] Impossible d\'obtenir le token Expo Push (permissions refusées ou émulateur)');
        }
      })
      .catch(err => console.error('[Push] Erreur obtention token:', err));
  }, [isAuthenticated, token]);

  return null; // Composant invisible — effet uniquement
}

// ─── Composant principal AppContent ──────────────────────────────────────────
function AppContent() {
  const { isAuthenticated, isLoading, hasSeenOnboarding, completeOnboarding, logout, token } = useAuth();
  const [currentPage, setCurrentPage] = useState(0);
  const [isInitializing, setIsInitializing] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);

  // Initialiser Google Sign-In au niveau app (une seule fois, avant l'écran de login)
  useEffect(() => {
    const initGoogle = async () => {
      try {
        GoogleSignin.configure({
          webClientId: '846470017457-qh90rioca6oujshvm05p23b5do8fbv6t.apps.googleusercontent.com',
          offlineAccess: true,
        });
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: false });
      } catch (e) {
        // Play Services non disponible — on continue quand même
        console.warn('[App] Google Play Services non disponible:', e);
      } finally {
        setGoogleReady(true);
      }
    };
    initGoogle();
  }, []);

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

  // Le trpc.Provider enveloppe TOUT (splash + login + app)
  // pour que LoginScreen puisse utiliser les hooks tRPC (trpc.auth.login.useMutation)
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      {/* PushRegistrar est INSIDE trpc.Provider — peut utiliser les hooks tRPC */}
      <PushRegistrar />

      {/* Splash screen tant que l'auth OU Google Sign-In ne sont pas prêts */}
      {(isLoading || isInitializing || !googleReady) ? (
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
        <LoginScreen googleAlreadyReady={googleReady} />
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

const styles = StyleSheet.create({});
