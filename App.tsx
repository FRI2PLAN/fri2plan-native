import { enableScreens } from 'react-native-screens';
enableScreens(true);
import 'react-native-gesture-handler';
import './i18n'; // Initialize i18n
import * as NativeSplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider, focusManager, onlineManager } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { trpc, createTRPCClient } from './lib/trpc';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { FamilyProvider } from './contexts/FamilyContext';
import { PagerProvider } from './contexts/PagerContext';
import LoginScreen from './screens/LoginScreen';
import AppNavigator from './navigation/AppNavigator';
import OnboardingScreen from './screens/OnboardingScreen';
import SplashScreen from './screens/SplashScreen';
import { StyleSheet, Platform, AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import * as NavigationBar from 'expo-navigation-bar';
import * as Updates from 'expo-updates';
import { registerForPushNotificationsAsync } from './hooks/usePushNotifications';
import { useVersionCheck } from './hooks/useVersionCheck';
import { UpdateModal } from './components/UpdateModal';
import { OfflineProvider } from './contexts/OfflineContext';
import { OfflineBanner } from './components/OfflineBanner';
import { useOfflineExecutor } from './hooks/useOfflineExecutor';
import { useOffline } from './contexts/OfflineContext';
import { IAPProvider } from './contexts/IAPContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import * as Notifications from 'expo-notifications';
import { Linking } from 'react-native';

// ─── Store global pour les deep links Google Calendar ────────────────────────
// Permet de capturer les deep links avant que CalendarScreen soit monté
export const pendingGoogleCalendarDeepLink = { url: null as string | null };

// ─── Store global pour le deep link subscription/success ─────────────────────
// Déclenche un refetch du statut abonnement quand l'app est rouverte après paiement
export const pendingSubscriptionSuccess = { triggered: false };

// Intercepter les deep links dès le démarrage de l'app (avant le splash)
Linking.getInitialURL().then((url) => {
  if (url && (url.startsWith('fri2plan://google-calendar/oauth-done') || url.startsWith('fri2plan://google-calendar/callback'))) {
    pendingGoogleCalendarDeepLink.url = url;
  }
  if (url && url.startsWith('fri2plan://subscription/success')) {
    pendingSubscriptionSuccess.triggered = true;
  }
}).catch(() => {});

Linking.addEventListener('url', (event) => {
  if (event.url && (event.url.startsWith('fri2plan://google-calendar/oauth-done') || event.url.startsWith('fri2plan://google-calendar/callback'))) {
    pendingGoogleCalendarDeepLink.url = event.url;
  }
  if (event.url && event.url.startsWith('fri2plan://subscription/success')) {
    pendingSubscriptionSuccess.triggered = true;
    // Invalider le cache abonnement pour forcer un refetch immédiat
    queryClient.invalidateQueries({ queryKey: [['subscription', 'checkAccess']] });
    queryClient.invalidateQueries({ queryKey: [['subscription', 'getSubscriptionDetails']] });
    queryClient.invalidateQueries({ queryKey: [['subscription', 'getPaymentHistory']] });
    console.log('[DeepLink] subscription/success → cache abonnement invalidé');
  }
});

// Empêcher le splash natif de se cacher automatiquement avant que React soit prêt
NativeSplashScreen.preventAutoHideAsync().catch(() => {});

// Configure onlineManager pour utiliser NetInfo
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(state.isConnected ?? false);
  });
});

// Configure focusManager pour React Native (AppState)
// Permet à React Query de refetch les données stale quand l'app reprend le focus
AppState.addEventListener('change', (status) => {
  focusManager.setFocused(status === 'active');
});

// Create QueryClient (stable, never recreated)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 24 * 60 * 60 * 1000, // 24h (pour le cache hors ligne)
      networkMode: 'offlineFirst',
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
});

// Persister AsyncStorage pour le cache hors ligne
const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: '@fri2plan:query_cache',
  throttleTime: 1000,
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
// Supprime le token FCM natif côté serveur lors de la déconnexion.
// Utilise useRef pour exposer la fonction logout sans déclencher de re-render.
function FCMLogoutHandler({ logoutRef }: { logoutRef: React.MutableRefObject<(() => Promise<void>) | null> }) {
  const { logout } = useAuth();
  const deleteTokenMutation = trpc.fcm.deleteToken.useMutation();

  // Mettre à jour la ref à chaque render — pas de re-render parent car c'est une ref
  logoutRef.current = useCallback(async () => {
    try {
      const platform = Platform.OS === 'android' ? 'native_android' : 'native_ios';
      await deleteTokenMutation.mutateAsync({ platform });
      console.log('[Push] Token FCM supprimé côté serveur pour platform:', platform);
    } catch (err) {
      // Ne pas bloquer la déconnexion si la suppression échoue
      console.warn('[Push] Erreur suppression token FCM:', err);
    }
    await logout();
  }, [logout, deleteTokenMutation]);

  return null;
}

// ─── Vérification OTA au démarrage ──────────────────────────────────────────
async function checkAndApplyUpdate() {
  try {
    // Vérifier toujours les OTAs, qu'on soit sur le build natif ou une OTA précédente.
    // L'ancienne condition (!isEmbeddedLaunch → return) empêchait les OTAs successives
    // car une fois une OTA installée, isEmbeddedLaunch = false → la vérification était skippée.
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      console.log('[OTA] Update available, fetching...');
      await Updates.fetchUpdateAsync();
      console.log('[OTA] Update fetched, reloading...');
      await Updates.reloadAsync();
    } else {
      console.log('[OTA] No update available');
    }
  } catch (e) {
    console.warn('[OTA] Check failed:', e);
  }
}

// ─── Composant principal AppContent ──────────────────────────────────────────
function AppContent() {
  const { isAuthenticated, isLoading, hasSeenOnboarding, completeOnboarding, logout, token, user } = useAuth();
  const [currentPage, setCurrentPage] = useState(0);
  // Durée minimale du splash : 800ms pour que le logo soit visible sans bloquer l'utilisateur
  const [splashMinDone, setSplashMinDone] = useState(false);
  // Vérification de version au démarrage
  const { needsUpdate, forceUpdate, storeUrl, latestVersion, isLoading: versionLoading } = useVersionCheck();
  const [updateModalDismissed, setUpdateModalDismissed] = useState(false);

  // Ref vers la fonction logout enrichie (avec suppression FCM) — pas de re-render
  const fcmLogoutRef = useRef<(() => Promise<void>) | null>(null);

  // Timer durée minimale splash (800ms) — laisse le temps au logo d'apparaître sans bloquer
  // Masque le splash natif dès que React est prêt (après 300ms pour laisser le temps au rendu)
  useEffect(() => {
    const hideNative = setTimeout(() => {
      NativeSplashScreen.hideAsync().catch(() => {});
    }, 300);
    const timer = setTimeout(() => setSplashMinDone(true), 800);
    // Remettre le badge iOS à 0 au démarrage de l'app
    Notifications.setBadgeCountAsync(0).catch(() => {});
    // Vérifier et appliquer les mises à jour OTA au démarrage
    checkAndApplyUpdate();
    return () => { clearTimeout(hideNative); clearTimeout(timer); };
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
        // Pas de délai artificiel — l'app s'affiche immédiatement après login
        // setIsInitializing(true/false) supprimé pour éviter le décalage de 800ms
      }
    }
  }, [token]);

  // Wrapper stable qui délègue à fcmLogoutRef.current au moment de l'appel
  const effectiveLogout = useCallback(async () => {
    if (fcmLogoutRef.current) {
      await fcmLogoutRef.current();
    } else {
      await logout();
    }
  }, [logout]);

  // Enregistrer l'exécuteur offline (doit être dans un composant avec accès tRPC)
  // Note: useOfflineExecutor est appelé dans OfflineAwareContent ci-dessous

  // Le trpc.Provider enveloppe TOUT pour que LoginScreen puisse utiliser les hooks tRPC
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <PushRegistrar />
      <FCMLogoutHandler logoutRef={fcmLogoutRef} />
      <OfflineExecutorRegistrar />

      {/* Splash screen pendant le chargement auth OU durée minimale non écoulée OU user pas encore chargé */}
      {(isLoading || !splashMinDone || (isAuthenticated && !user)) ? (
        <SplashScreen />
      ) : isAuthenticated ? (
        <SubscriptionProvider>
          <AppNavigator onLogout={effectiveLogout} />
          <OnboardingScreen
            visible={!hasSeenOnboarding}
            onComplete={completeOnboarding}
            onNavigate={(pageIndex) => {
              setCurrentPage(pageIndex);
            }}
          />
        </SubscriptionProvider>
      ) : (
        <LoginScreen />
      )}

      {/* Modale de mise à jour — affichée après le splash, indépendamment de l'auth */}
      {!versionLoading && needsUpdate && !updateModalDismissed && (
        <UpdateModal
          visible={true}
          forceUpdate={forceUpdate}
          storeUrl={storeUrl}
          latestVersion={latestVersion}
          onDismiss={() => setUpdateModalDismissed(true)}
        />
      )}
    </trpc.Provider>
  );
}

// ─── Enregistrement de l'exécuteur offline (dans le contexte tRPC) ───────────
function OfflineExecutorRegistrar() {
  useOfflineExecutor();
  return null;
}

// ─── Bannière hors ligne (dans le contexte Offline) ──────────────────────────
function OfflineBannerWrapper() {
  const { queueSize, processQueue } = useOffline();
  return <OfflineBanner queueSize={queueSize} />;
}

export default function App() {
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden');
      NavigationBar.setBehaviorAsync('overlay-swipe');
    }
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister: asyncStoragePersister }}
        >
          <OfflineProvider>
            <AuthProvider>
              <IAPProvider>
                <FamilyProvider>
                  <PagerProvider>
                    <AppContent />
                    <OfflineBannerWrapper />
                  </PagerProvider>
                </FamilyProvider>
              </IAPProvider>
            </AuthProvider>
          </OfflineProvider>
        </PersistQueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({});
