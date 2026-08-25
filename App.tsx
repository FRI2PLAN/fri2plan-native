import { enableScreens } from 'react-native-screens';
enableScreens(true);
import 'react-native-gesture-handler';
import './i18n'; // Initialize i18n
import { i18nReady } from './i18n';
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
import FamilyLogoIntro from './components/FamilyLogoIntro';
import FamilyLoadingScreen from './components/FamilyLoadingScreen';
import { Alert, StyleSheet, Platform, AppState, InteractionManager, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import * as NavigationBar from 'expo-navigation-bar';
import * as Updates from 'expo-updates';
import { registerForPushNotificationsAsync } from './hooks/usePushNotifications';
import { useVersionCheck } from './hooks/useVersionCheck';
import { UpdateModal } from './components/UpdateModal';
import { OfflineProvider } from './contexts/OfflineContext';
import { OfflineBanner } from './components/OfflineBanner';
import { useOfflineExecutor } from './hooks/useOfflineExecutor';
import { useOffline } from './contexts/OfflineContext';
import { useFamily } from './contexts/FamilyContext';
import { IAPProvider } from './contexts/IAPContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import * as Notifications from 'expo-notifications';
import { Linking } from 'react-native';
import { useTranslation } from 'react-i18next';

// ─── Store global pour les deep links Google Calendar ────────────────────────
// Permet de capturer les deep links avant que CalendarScreen soit monté
export const pendingGoogleCalendarDeepLink = { url: null as string | null };

// ─── Store global pour le deep link subscription/success ─────────────────────
// Déclenche un refetch du statut abonnement quand l'app est rouverte après paiement
export const pendingSubscriptionSuccess = { triggered: false };

// ─── Store global pour le deep link invitation ────────────────────────────────
// Capturé avant que React soit monté (getInitialURL est async)
export const pendingInviteCode = { code: null as string | null };
export const pendingInviteEmail = { email: null as string | null };
export const pendingVerifiedInvitation = { value: false };

// Extraire le code d'invitation d'une URL
function extractInviteCode(url: string | null): string | null {
  if (!url) return null;
  try {
    // Supporte https://app.fri2plan.ch/invitation/{code}
    // et fri2plan://invitation/{code}
    const match = url.match(/\/invitation\/([^/?#]+)/);
    if (match) return decodeURIComponent(match[1]);
    const queryMatch = url.match(/[?&]invite=([^&#]+)/);
    if (queryMatch) return decodeURIComponent(queryMatch[1]);
  } catch {}
  return null;
}

function extractInviteEmail(url: string | null): string | null {
  if (!url) return null;
  try {
    const match = url.match(/[?&]email=([^&#]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {}
  return null;
}

// Intercepter les deep links dès le démarrage de l'app (avant le splash)
Linking.getInitialURL().then((url) => {
  if (url && (url.startsWith('fri2plan://google-calendar/oauth-done') || url.startsWith('fri2plan://google-calendar/callback'))) {
    pendingGoogleCalendarDeepLink.url = url;
  }
  if (url && url.startsWith('fri2plan://subscription/success')) {
    pendingSubscriptionSuccess.triggered = true;
  }
  const inviteCode = extractInviteCode(url);
  if (inviteCode) {
    pendingInviteCode.code = inviteCode;
    pendingInviteEmail.email = extractInviteEmail(url);
    pendingVerifiedInvitation.value = /[?&]verified=1(?:[&#]|$)/.test(url || '');
    console.log('[DeepLink] invitation code capturé au démarrage:', inviteCode);
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
  // Invitation deep link (app en arrière-plan ou ouverte)
  const inviteCode = extractInviteCode(event.url);
  if (inviteCode) {
    pendingInviteCode.code = inviteCode;
    pendingInviteEmail.email = extractInviteEmail(event.url);
    pendingVerifiedInvitation.value = /[?&]verified=1(?:[&#]|$)/.test(event.url);
    console.log('[DeepLink] invitation code reçu (app active):', inviteCode);
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
      // Conserver les dernières données utiles assez longtemps pour rouvrir
      // l'application immédiatement, puis les réconcilier discrètement réseau.
      gcTime: 7 * 24 * 60 * 60 * 1000, // 7 jours
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

// Le contenu du cache React Query est conservé après une déconnexion pour que
// le même compte retrouve immédiatement ses données. Cette clé associe le
// cache persistant à son propriétaire et impose une purge avant tout rendu si
// un autre compte se connecte sur le même appareil.
const QUERY_CACHE_OWNER_KEY = '@fri2plan:query_cache_owner';
const FAMILY_CACHE_SCOPE_KEY = '@fri2plan:query_cache_family_scope';

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

// ─── Store global pour le deep link verify-email ────────────────────────────
// Capturé avant que React soit monté (getInitialURL est async)
export const pendingVerifyEmailToken = { token: null as string | null };

// Extraire le token verify-email d'une URL
function extractVerifyEmailToken(url: string | null): string | null {
  if (!url) return null;
  try {
    // Supporte https://app.fri2plan.ch/verify-email?token=xxx
    const match = url.match(/[?&]token=([^&]+)/);
    if (match && (url.includes('/verify-email') || url.includes('verify-email'))) {
      return decodeURIComponent(match[1]);
    }
  } catch {}
  return null;
}

// Composant principal AppContent ──────────────────────────────────────────
function AppContent() {
  const { isAuthenticated, isLoading, hasSeenOnboarding, completeOnboarding, logout, token, user, login } = useAuth();
  const [currentPage, setCurrentPage] = useState(0);
  const [languageReady, setLanguageReady] = useState(false);
  const [sessionCacheReady, setSessionCacheReady] = useState(false);
  const [familyCacheReady, setFamilyCacheReady] = useState(false);
  const [showFamilyLoading, setShowFamilyLoading] = useState(true);
  const [familyLoadingPhase, setFamilyLoadingPhase] = useState<'intro' | 'glass'>('intro');
  // Durée minimale du splash : 800ms pour que le logo soit visible sans bloquer l'utilisateur
  const [splashMinDone, setSplashMinDone] = useState(false);
  // Code d'invitation depuis deep link (capturé avant le montage React)
  const [inviteCodeFromLink, setInviteCodeFromLink] = useState<string | undefined>(
    pendingInviteCode.code || undefined
  );
  // Email associé à l'invitation (récupéré via invitations.getByCode)
  const [inviteEmailFromLink, setInviteEmailFromLink] = useState<string | undefined>(
    pendingInviteEmail.email || undefined,
  );
  const [inviteHasExistingAccount, setInviteHasExistingAccount] = useState(pendingVerifiedInvitation.value);
  // Vérification de version au démarrage
  const { needsUpdate, forceUpdate, storeUrl, latestVersion, isLoading: versionLoading } = useVersionCheck();
  const [updateModalDismissed, setUpdateModalDismissed] = useState(false);

  // Ref vers la fonction logout enrichie (avec suppression FCM) — pas de re-render
  const fcmLogoutRef = useRef<(() => Promise<void>) | null>(null);

  // Timer durée minimale splash (800ms) — laisse le temps au logo d'apparaître sans bloquer
  // Masque le splash natif dès que React est prêt (après 300ms pour laisser le temps au rendu)
  useEffect(() => {
    let cancelled = false;
    void i18nReady.finally(() => {
      if (!cancelled) setLanguageReady(true);
    });
    return () => { cancelled = true; };
  }, []);

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

  // Écouter les deep links d'invitation quand l'app est déjà ouverte (arrière-plan)
  useEffect(() => {
    const subscription = Linking.addEventListener('url', (event) => {
      const code = extractInviteCode(event.url);
      if (code) {
        setInviteCodeFromLink(code);
        setInviteEmailFromLink(extractInviteEmail(event.url));
        setInviteHasExistingAccount(
          /[?&]verified=1(?:[&#]|$)/.test(event.url),
        );
        console.log('[DeepLink] invitation code mis à jour dans AppContent:', code);
      }
    });
    return () => subscription.remove();
  }, []);

  // Ne recréer le client tRPC QUE quand le token change
  // activeFamilyId est lu dynamiquement depuis AsyncStorage dans chaque requête (lib/trpc.ts)
  const trpcClient = useMemo(() => createTRPCClient(), [token]);

  // Ne jamais vider le cache lors d’une simple déconnexion : il est utile au
  // prochain accès du même compte. En revanche, un cache appartenant à un
  // autre utilisateur est purgé AVANT le montage de l’interface authentifiée.
  useEffect(() => {
    let cancelled = false;
    if (isLoading) return () => { cancelled = true; };
    if (!isAuthenticated || !user?.id) {
      setSessionCacheReady(false);
      return () => { cancelled = true; };
    }

    const ownerId = String(user.id);
    void (async () => {
      const cachedOwnerId = await AsyncStorage.getItem(QUERY_CACHE_OWNER_KEY);
      if (cancelled) return;
      if (cachedOwnerId !== ownerId) {
        queryClient.clear();
        await AsyncStorage.setItem(QUERY_CACHE_OWNER_KEY, ownerId);
      }
      if (!cancelled) setSessionCacheReady(true);
    })();

    return () => { cancelled = true; };
  }, [isAuthenticated, isLoading, user?.id]);

  // Une nouvelle connexion doit toujours passer par le sas familial. Lors
  // d’une simple fermeture/réouverture, l’interface est déjà préchargée sous
  // cette couche pendant que le cache local est restauré.
  useEffect(() => {
    if (!isAuthenticated) {
      setShowFamilyLoading(true);
      setFamilyLoadingPhase('intro');
    }
  }, [isAuthenticated]);

  const completeFirstConnectionOnboarding = useCallback(async () => {
    // L'onboarding est toujours le premier écran. Le logo et le verre ne
    // démarrent qu'une fois le guide fermé ou passé.
    setFamilyLoadingPhase('intro');
    setShowFamilyLoading(true);
    await completeOnboarding();
  }, [completeOnboarding]);

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
      <VerifyEmailHandler login={login} />
      <InvitationHandler
        inviteCode={inviteCodeFromLink}
        isAuthenticated={isAuthenticated}
        currentUserEmail={user?.email ?? undefined}
        onInvitationFound={({ email, hasExistingAccount }) => {
          setInviteEmailFromLink(email);
          setInviteHasExistingAccount(hasExistingAccount);
        }}
        onSwitchAccount={effectiveLogout}
        onFamilyJoined={() => {
          setInviteCodeFromLink(undefined);
          setInviteEmailFromLink(undefined);
        }}
      />
      <OfflineExecutorRegistrar />
      <FamilyCacheScopeGate onReady={setFamilyCacheReady} />
      <DataWarmup />

      <SubscriptionProvider>
        <View style={styles.appRoot}>
          {/* Splash screen pendant le chargement auth OU durée minimale non écoulée OU user pas encore chargé */}
          {(isLoading || !languageReady || !splashMinDone || (isAuthenticated && (!user || !sessionCacheReady || !familyCacheReady))) ? (
            <SplashScreen />
          ) : isAuthenticated ? (
            !hasSeenOnboarding ? (
              <OnboardingScreen
                visible
                onComplete={completeFirstConnectionOnboarding}
                onNavigate={(pageIndex) => {
                  setCurrentPage(pageIndex);
                }}
              />
            ) : (
              <>
                <AppNavigator onLogout={effectiveLogout} />
                <CircleTransitionOverlay />
                {showFamilyLoading && (
                  <View style={styles.familyLoadingOverlay} accessibilityViewIsModal>
                    <StatusBar style="dark" backgroundColor="#fffdf7" />
                    {familyLoadingPhase === 'intro' ? (
                      <FamilyLogoIntro onComplete={() => setFamilyLoadingPhase('glass')} />
                    ) : (
                      <FamilyLoadingScreen onComplete={() => setShowFamilyLoading(false)} />
                    )}
                  </View>
                )}
              </>
            )
          ) : (
            <LoginScreen
              initialInviteCode={inviteCodeFromLink}
              initialScreenMode={inviteCodeFromLink ? (inviteHasExistingAccount ? 'login' : 'register') : undefined}
              isEmailInvitation={!!inviteCodeFromLink}
              initialEmail={inviteEmailFromLink}
            />
          )}
        </View>
      </SubscriptionProvider>

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

// Séquence globale lors d’un changement de cercle. Elle recouvre aussi le
// header afin qu’aucun état intermédiaire des pages conservées par le pager ne
// puisse apparaître avant la disponibilité du nouveau contexte familial.
function CircleTransitionOverlay() {
  const { isCircleTransitioning, completeCircleTransition } = useFamily();
  const [phase, setPhase] = useState<'intro' | 'glass'>('intro');

  useEffect(() => {
    if (isCircleTransitioning) setPhase('intro');
  }, [isCircleTransitioning]);

  if (!isCircleTransitioning) return null;

  return (
    <View style={styles.familyLoadingOverlay} accessibilityViewIsModal>
      <StatusBar style="dark" backgroundColor="#fffdf7" />
      {phase === 'intro' ? (
        <FamilyLogoIntro onComplete={() => setPhase('glass')} />
      ) : (
        <FamilyLoadingScreen onComplete={completeCircleTransition} />
      )}
    </View>
  );
}

// ─── Gestion du deep link verify-email (dans le contexte tRPC) ───────────────
function VerifyEmailHandler({ login }: { login: (user: any, token: string) => Promise<void> }) {
  const verifyEmailMutation = trpc.auth.verifyEmail.useMutation();
  const verifyEmailTokenRef = useRef<string | null>(null);
  const handleVerifyEmailUrl = useCallback(async (url: string | null) => {
    const emailToken = extractVerifyEmailToken(url);
    if (!emailToken) return;
    if (verifyEmailTokenRef.current === emailToken) return;
    verifyEmailTokenRef.current = emailToken;
    try {
      const result = await verifyEmailMutation.mutateAsync({ token: emailToken });
      if (result?.user && (result.user as any)?.id) {
        const authToken = (result as any).token;
        if (authToken) { await login(result.user as any, authToken); }
      }
    } catch (err) { console.warn("[DeepLink] verify-email error:", err); }
  }, [verifyEmailMutation, login]);
  useEffect(() => {
    Linking.getInitialURL().then((url) => { handleVerifyEmailUrl(url); }).catch(() => {});
    const subscription = Linking.addEventListener("url", (event) => { handleVerifyEmailUrl(event.url); });
    return () => subscription.remove();
  }, [handleVerifyEmailUrl]);
  return null;
}
// ─── Gestion du deep link invitation (dans le contexte tRPC) ─────────────────
function InvitationHandler({
  inviteCode,
  isAuthenticated,
  currentUserEmail,
  onInvitationFound,
  onSwitchAccount,
  onFamilyJoined,
}: {
  inviteCode: string | undefined;
  isAuthenticated: boolean;
  currentUserEmail?: string;
  onInvitationFound: (invitation: { email: string; hasExistingAccount: boolean }) => void;
  onSwitchAccount: () => Promise<void>;
  onFamilyJoined: () => void;
}) {
  const { t } = useTranslation();
  const getByCodeQuery = trpc.invitations.getByCode.useQuery(
    { code: inviteCode! },
    {
      enabled: !!inviteCode,
      retry: false,
      networkMode: 'always',
    }
  );
  const acceptByCodeMutation = trpc.invitations.acceptByCode.useMutation();
  const utils = trpc.useUtils();

  // Quand on récupère l'invitation, pré-remplir l'email
  useEffect(() => {
    if ((getByCodeQuery.data as any)?.email) {
      onInvitationFound({
        email: (getByCodeQuery.data as any).email,
        hasExistingAccount: Boolean((getByCodeQuery.data as any).hasExistingAccount),
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(getByCodeQuery.data as any)?.email, (getByCodeQuery.data as any)?.hasExistingAccount]);

  // Si l'utilisateur est déjà connecté et qu'un code d'invitation arrive
  const acceptedRef = useRef(false);
  const accountPromptedRef = useRef(false);
  useEffect(() => {
    if (!inviteCode || !isAuthenticated || acceptedRef.current) return;
    if (!getByCodeQuery.data) return;
    const inv = getByCodeQuery.data as any;
    if (inv.status !== 'pending') return;
    if (currentUserEmail?.toLowerCase() !== inv.email?.toLowerCase()) {
      if (accountPromptedRef.current) return;
      accountPromptedRef.current = true;
      Alert.alert(
        t('invitation.wrongAccountTitle'),
        t('invitation.wrongAccountMessage', { email: inv.email }),
        [
          { text: t('common.cancel'), style: 'cancel', onPress: onFamilyJoined },
          {
            text: t('invitation.switchAccount'),
            onPress: () => { void onSwitchAccount(); },
          },
        ],
      );
      return;
    }
    acceptedRef.current = true;
    acceptByCodeMutation.mutateAsync({ code: inviteCode })
      .then(() => {
        utils.family.list.invalidate();
        onFamilyJoined();
        console.log('[Invitation] Famille rejointe automatiquement (utilisateur déjà connecté)');
      })
      .catch((err: any) => {
        acceptedRef.current = false;
        console.warn('[Invitation] Erreur acceptation automatique:', err.message);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteCode, isAuthenticated, currentUserEmail, getByCodeQuery.data, onFamilyJoined, onSwitchAccount, t]);

  return null;
}


// ─── Enregistrement de l'exécuteur offline (dans le contexte tRPC) ───────────
function OfflineExecutorRegistrar() {
  useOfflineExecutor();
  return null;
}

// ─── Préchargement discret des écrans principaux ────────────────────────────
// Les données restaurées restent visibles immédiatement. Une fois le premier
// rendu stabilisé, on réchauffe les écrans utilisés au quotidien afin que leur
// première ouverture ne déclenche pas une attente perceptible.
function DataWarmup() {
  const { isAuthenticated } = useAuth();
  const { activeFamilyId, isReady: isFamilyReady } = useFamily();
  const utils: any = trpc.useUtils();
  const warmedFamilyRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !isFamilyReady || !activeFamilyId || warmedFamilyRef.current === activeFamilyId) return;
    warmedFamilyRef.current = activeFamilyId;

    const task = InteractionManager.runAfterInteractions(() => {
      const currentDay = new Date().toISOString().slice(0, 10);
      void Promise.allSettled([
        utils.auth.me.prefetch(),
        utils.family.list.prefetch(),
        utils.family.members.prefetch({ familyId: activeFamilyId }),
        utils.tasks.list.prefetch(),
        utils.events.list.prefetch(),
        utils.messages.list.prefetch({ familyId: activeFamilyId, limit: 50, offset: 0 }),
        utils.meals.list.prefetch({ familyId: activeFamilyId, startDate: `${currentDay}T00:00:00`, endDate: `${currentDay}T23:59:59` }),
        utils.rewards.familyPoints.prefetch({ familyId: activeFamilyId }),
        utils.notifications.getUnreadCount.prefetch({ familyId: activeFamilyId }),
        utils.shopping.listsByFamily.prefetch({ familyId: activeFamilyId }),
      ]);
    });

    return () => task.cancel();
  }, [activeFamilyId, isAuthenticated, isFamilyReady, utils]);

  return null;
}

// Les requêtes dont la clé ne contient pas familyId (Calendrier, Notes, Tâches,
// Demandes…) ne doivent jamais survivre à un changement de cercle. Cette porte
// attend la restauration du cercle sélectionné, puis purge le cache d’un autre
// contexte AVANT de rendre l’interface familiale.
function FamilyCacheScopeGate({ onReady }: { onReady: (ready: boolean) => void }) {
  const { isAuthenticated, user } = useAuth();
  const { activeFamilyId, isReady: isFamilyReady } = useFamily();

  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated || !user?.id || !isFamilyReady) {
      onReady(false);
      return () => { cancelled = true; };
    }

    const scope = `${user.id}:${activeFamilyId ?? 'none'}`;
    onReady(false);
    void (async () => {
      const cachedScope = await AsyncStorage.getItem(FAMILY_CACHE_SCOPE_KEY);
      if (cancelled) return;
      if (cachedScope !== scope) {
        queryClient.clear();
        await AsyncStorage.setItem(FAMILY_CACHE_SCOPE_KEY, scope);
      }
      if (!cancelled) onReady(true);
    })();

    return () => { cancelled = true; };
  }, [activeFamilyId, isAuthenticated, isFamilyReady, onReady, user?.id]);

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
    <KeyboardProvider>
      <SafeAreaProvider>
        <ThemeProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister: asyncStoragePersister,
            // Une donnée restaurée est visible immédiatement. React Query la
            // rafraîchit ensuite selon staleTime, sans bloquer les écrans.
            maxAge: 7 * 24 * 60 * 60 * 1000,
          }}
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
    </KeyboardProvider>
  );
}

const styles = StyleSheet.create({
  appRoot: { flex: 1 },
  familyLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fffdf7',
    elevation: 1000,
    zIndex: 1000,
  },
});
