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

  // Écouter les changements d'état de l'app (active / background / inactive)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = nextAppState;

      // L'app revient au premier plan depuis l'arrière-plan
      if (
        (prev === 'background' || prev === 'inactive') &&
        nextAppState === 'active'
      ) {
        // Ne pas revalider le token — la session est déjà en mémoire
        // On marque qu'on n'est plus en démarrage à froid
        isColdStart.current = false;
        console.log('[AuthContext] App revenue au premier plan — pas de revalidation du token');
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
          try {
            const response = await fetch(`${API_URL}/api/trpc/user.me`, {
              headers: { Authorization: `Bearer ${storedToken}` },
            });
            if (!response.ok) {
              // Token invalide ou expiré → forcer la déconnexion
              console.log('[AuthContext] Token invalide (status ' + response.status + '), nettoyage de la session');
              tokenValid = false;
            }
          } catch (networkError) {
            // Pas de réseau → utiliser le cache local (fail-open)
            console.log('[AuthContext] Pas de réseau, utilisation du cache local');
          }
        } else {
          console.log('[AuthContext] Retour arrière-plan — token utilisé depuis le cache sans revalidation');
        }

        if (!tokenValid) {
          await AsyncStorage.multiRemove(['authToken', 'user', 'hasSeenOnboarding']);
          return;
        }

        const parsedUser = JSON.parse(storedUser);
        console.log('[AuthContext] Loaded user from storage:', JSON.stringify(parsedUser, null, 2));
        setToken(storedToken);
        setUser(parsedUser);
        setHasSeenOnboarding(storedOnboarding === 'true');
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
        AsyncStorage.removeItem('hasSeenOnboarding'),
      ]);
      setToken(null);
      setUser(null);
      setHasSeenOnboarding(false);
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
