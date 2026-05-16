import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';
import { User } from '../lib/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasSeenOnboarding: boolean;
  login: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const API_URL = 'https://app.fri2plan.ch';

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  // Indique si c'est le premier chargement (démarrage à froid) ou un retour d'arrière-plan
  const isColdStart = useRef(true);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  // Timestamp de mise en arrière-plan pour calculer la durée d'inactivité
  const backgroundedAtRef = useRef<number | null>(null);
  // Durée max d'inactivité avant revalidation du token (30 minutes)
  const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

  // Écouter les changements d'état de l'app (active / background / inactive)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = nextAppState;

      // L'app passe en arrière-plan → noter l'heure
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        backgroundedAtRef.current = Date.now();
        console.log('[AuthContext] App mise en arrière-plan à', new Date().toISOString());
      }

      // L'app revient au premier plan depuis l'arrière-plan
      if (
        (prev === 'background' || prev === 'inactive') &&
        nextAppState === 'active'
      ) {
        const backgroundedAt = backgroundedAtRef.current;
        const elapsed = backgroundedAt ? Date.now() - backgroundedAt : 0;
        console.log('[AuthContext] App revenue au premier plan, inactivité:', Math.round(elapsed / 1000), 'sec');

        if (elapsed > SESSION_TIMEOUT_MS) {
          // Inactivité > 30 min → revalider le token
          console.log('[AuthContext] Inactivité > 30 min, revalidation du token...');
          isColdStart.current = true;
          loadUserData();
        } else {
          // Inactivité courte → utiliser le cache sans revalidation
          isColdStart.current = false;
          console.log('[AuthContext] Inactivité courte — token utilisé depuis le cache');
        }
        backgroundedAtRef.current = null;
      }
    });

    return () => subscription.remove();
  }, []);

  // Load user data on mount (démarrage à froid uniquement)
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const [storedToken, storedUser, storedOnboarding] = await Promise.all([
        AsyncStorage.getItem('authToken'),
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('hasSeenOnboarding'),
      ]);

      if (storedToken && storedUser) {
        // Valider le token auprès du serveur uniquement au démarrage à froid
        // Si l'app revient de l'arrière-plan, on utilise directement le cache
        let tokenValid = true;

        if (isColdStart.current) {
          // Retry logic pour les 503 Cloud Run cold start (3 tentatives max)
          const fetchAuthMe = async (retryCount = 0): Promise<Response | null> => {
            try {
              const resp = await fetch(`${API_URL}/api/trpc/auth.me`, {
                headers: { Authorization: `Bearer ${storedToken}` },
              });
              if (resp.status === 503 && retryCount < 3) {
                const delay = [1000, 2000, 4000][retryCount];
                console.log(`[AuthContext] auth.me 503, retry ${retryCount + 1}/3 dans ${delay}ms`);
                await new Promise(r => setTimeout(r, delay));
                return fetchAuthMe(retryCount + 1);
              }
              return resp;
            } catch (err) {
              if (retryCount < 3) {
                const delay = [1000, 2000, 4000][retryCount];
                console.log(`[AuthContext] auth.me erreur réseau, retry ${retryCount + 1}/3 dans ${delay}ms`);
                await new Promise(r => setTimeout(r, delay));
                return fetchAuthMe(retryCount + 1);
              }
              return null;
            }
          };
          try {
            const response = await fetchAuthMe();
            if (!response) {
              // Toutes les tentatives échouées → utiliser le cache local (fail-open)
              console.log('[AuthContext] auth.me inaccessible après 3 tentatives, utilisation du cache local');
            } else if (response.status === 401 || response.status === 403) {
              // Token vraiment invalide ou expiré → forcer la déconnexion
              console.log('[AuthContext] Token invalide (status ' + response.status + '), nettoyage de la session');
              tokenValid = false;
            } else if (!response.ok) {
              // Erreur serveur persistante → utiliser le cache local (fail-open)
              console.log('[AuthContext] Erreur serveur (status ' + response.status + '), utilisation du cache local');
            } else {
              // Succès → mettre à jour le user avec les données fraîches (incluant familyId)
              try {
                const data = await response.json();
                const freshUser = data?.result?.data?.json;
                if (freshUser && freshUser.id) {
                  console.log('[AuthContext] User mis à jour depuis auth.me:', JSON.stringify(freshUser, null, 2));
                  await AsyncStorage.setItem('user', JSON.stringify(freshUser));
                  storedUser = JSON.stringify(freshUser);
                }
              } catch (_) {}
            }
          } catch (networkError) {
            // Pas de réseau → utiliser le cache local (fail-open)
            console.log('[AuthContext] Pas de réseau, utilisation du cache local');
          }
        } else {
          console.log('[AuthContext] Retour arrière-plan — token utilisé depuis le cache sans revalidation');
        }

        if (!tokenValid) {
          // Ne pas supprimer hasSeenOnboarding — l'onboarding est lié à l'appareil, pas à la session
          await AsyncStorage.multiRemove(['authToken', 'user']);
          return;
        }

        const parsedUser = JSON.parse(storedUser);
        console.log('[AuthContext] Loaded user from storage:', JSON.stringify(parsedUser, null, 2));
        setToken(storedToken);
        setUser(parsedUser);
        setHasSeenOnboarding(storedOnboarding === 'true');
        // Restaurer activeFamilyId depuis le user si absent d'AsyncStorage
        if (parsedUser?.familyId) {
          const storedFamilyId = await AsyncStorage.getItem('active_family_id');
          if (!storedFamilyId) {
            await AsyncStorage.setItem('active_family_id', String(parsedUser.familyId));
            console.log('[AuthContext] active_family_id restauré depuis user.familyId:', parsedUser.familyId);
          }
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      isColdStart.current = false;
      setIsLoading(false);
    }
  };

  const login = async (userData: User, authToken: string) => {
    try {
      console.log('[AuthContext] Login called with user data:', JSON.stringify(userData, null, 2));
      // Ensure we never pass undefined values to AsyncStorage
      if (!authToken || !userData) {
        throw new Error('Invalid login data');
      }
      await Promise.all([
        AsyncStorage.setItem('authToken', authToken),
        AsyncStorage.setItem('user', JSON.stringify(userData)),
      ]);
      setToken(authToken);
      setUser(userData);
    } catch (error) {
      console.error('Error saving user data:', error);
      throw error;
    }
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      setHasSeenOnboarding(true);
    } catch (error) {
      console.error('Error saving onboarding status:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem('authToken'),
        AsyncStorage.removeItem('user'),
        // hasSeenOnboarding n'est PAS supprimé au logout
        // L'onboarding est lié à l'appareil, pas à la session
      ]);
      setToken(null);
      setUser(null);
      // hasSeenOnboarding reste à true après déconnexion
      // Réinitialiser pour que le prochain démarrage à froid revalide bien le token
      isColdStart.current = true;
    } catch (error) {
      console.error('Error clearing user data:', error);
      throw error;
    }
  };

  const updateUser = async (userData: User) => {
    try {
      // Ensure we never pass undefined values to AsyncStorage
      if (!userData) {
        throw new Error('Invalid user data');
      }
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error('Error updating user data:', error);
      throw error;
    }
  };

  const resetOnboarding = async () => {
    try {
      await AsyncStorage.removeItem('hasSeenOnboarding');
      setHasSeenOnboarding(false);
    } catch (error) {
      console.error('Error resetting onboarding:', error);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    hasSeenOnboarding,
    login,
    logout,
    updateUser,
    completeOnboarding,
    resetOnboarding,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
