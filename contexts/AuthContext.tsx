import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useQueryClient } from '@tanstack/react-query';
import { useOffline } from './OfflineContext';
import { User } from '../lib/types';
import { API_URL } from '../lib/apiConfig';
import { clearSessionCookie, validateSession, SessionValidationError, SESSION_STORAGE_KEYS } from '../lib/sessionAuth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasSeenOnboarding: boolean;
  sessionError: 'invalid' | 'unavailable' | null;
  retrySession: () => Promise<void>;
  login: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [sessionError, setSessionError] = useState<'invalid' | 'unavailable' | null>(null);
  const queryClient = useQueryClient();
  const { clearQueue } = useOffline();
  // A validation started before logout must never restore that old session later.
  const sessionGeneration = useRef(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const backgroundedAtRef = useRef<number | null>(null);

  const clearLocalSession = useCallback(async (clearBiometric = false) => {
    setToken(null);
    setUser(null);
    await queryClient.cancelQueries();
    queryClient.clear();
    // No AsyncStorage.clear(): language, theme, onboarding and per-user circle
    // preferences survive. Only credentials and private session caches are removed.
    await Promise.all([
      clearQueue(),
      AsyncStorage.multiRemove(SESSION_STORAGE_KEYS),
      ...(clearBiometric ? ['biometric_auth_token', 'biometric_auth_user', 'biometric_enabled'].map(
        key => SecureStore.deleteItemAsync(key).catch(() => {}),
      ) : []),
    ]);
  }, [queryClient, clearQueue]);

  const storeVerifiedSession = useCallback(async (userData: User, authToken: string) => {
    const userStorageEntries: Array<[string, string]> = [
      ['authToken', authToken],
      ['user', JSON.stringify(userData)],
    ];
    // Preserve this account's circle preference; never reuse another account's
    // global header. Dashboard reconciles the choice with the server's list.
    const selectedCircle = await AsyncStorage.getItem(`active_family_id_${userData.id}`);
    if (selectedCircle && Number(selectedCircle) > 0) {
      userStorageEntries.push(['active_family_id', String(Number(selectedCircle))]);
    } else if (userData.familyId) {
      userStorageEntries.push(
        [`active_family_id_${userData.id}`, String(userData.familyId)],
        ['active_family_id', String(userData.familyId)],
      );
    } else {
      await AsyncStorage.removeItem('active_family_id');
    }
    await AsyncStorage.multiSet(userStorageEntries);
  }, []);

  const loadUserData = useCallback(async () => {
    const generation = ++sessionGeneration.current;
    setIsLoading(true);
    setToken(null);
    setUser(null);
    setSessionError(null);
    try {
      const [storedToken, storedUser, storedOnboarding] = await Promise.all([
        AsyncStorage.getItem('authToken'),
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('hasSeenOnboarding'),
      ]);
      if (generation !== sessionGeneration.current) return;
      setHasSeenOnboarding(storedOnboarding === 'true');
      if (!storedToken) return;
      let expectedId: number | undefined;
      try { expectedId = storedUser ? JSON.parse(storedUser)?.id : undefined; } catch { /* server profile is authoritative */ }
      const freshUser = await validateSession(storedToken, expectedId);
      if (generation !== sessionGeneration.current) return;
      await AsyncStorage.setItem('user', JSON.stringify(freshUser));
      if (generation !== sessionGeneration.current) return;
      setToken(storedToken);
      setUser(freshUser);
    } catch (error) {
      if (generation !== sessionGeneration.current) return;
      const reason = error instanceof SessionValidationError ? error.reason : 'unavailable';
      if (reason === 'invalid') {
        await clearLocalSession(true);
        void clearSessionCookie();
      }
      // On network failure keep credentials for Retry, never expose a cached user.
      if (generation === sessionGeneration.current) setSessionError(reason);
    } finally {
      if (generation === sessionGeneration.current) setIsLoading(false);
    }
  }, [clearLocalSession]);

  useEffect(() => { void loadUserData(); }, [loadUserData]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = nextAppState;
      if (nextAppState === 'background' && !backgroundedAtRef.current) backgroundedAtRef.current = Date.now();
      if ((prev === 'background' || prev === 'inactive') && nextAppState === 'active') {
        const elapsed = backgroundedAtRef.current ? Date.now() - backgroundedAtRef.current : 0;
        backgroundedAtRef.current = null;
        if (elapsed > 30 * 60 * 1000) void loadUserData();
      }
    });
    return () => subscription.remove();
  }, [loadUserData]);

  const login = async (userData: User, authToken: string) => {
    const generation = ++sessionGeneration.current;
    setSessionError(null);
    try {
      if (!authToken || !userData?.id) throw new SessionValidationError('invalid');
      // Remove the old Bearer/cache before validating the candidate. The candidate
      // is passed directly to auth.me, not read from storage or a cookie.
      await clearLocalSession();
      await clearSessionCookie();
      const freshUser = await validateSession(authToken, userData.id);
      if (generation !== sessionGeneration.current) throw new SessionValidationError('invalid');
      await storeVerifiedSession(freshUser, authToken);
      if (generation !== sessionGeneration.current) return;
      setToken(authToken);
      setUser(freshUser);

      try {
        const { getCurrentLanguage, syncLanguagePreference } = await import('../i18n');
        await syncLanguagePreference(getCurrentLanguage());
      } catch (error) {
        console.warn('[AuthContext] Language sync unavailable:', error);
      }
      try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (timezone && generation === sessionGeneration.current) {
          await fetch(`${API_URL}/settings.update`, {
            method: 'POST',
            credentials: 'omit',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
            body: JSON.stringify({ json: { timezone } }),
          });
        }
      } catch { /* Non-blocking timezone preference. */ }
    } catch (error) {
      if (generation === sessionGeneration.current) {
        setToken(null);
        setUser(null);
        setSessionError(error instanceof SessionValidationError ? error.reason : 'unavailable');
      }
      throw error;
    } finally {
      if (generation === sessionGeneration.current) setIsLoading(false);
    }
  };

  const logout = async () => {
    ++sessionGeneration.current;
    setIsLoading(false);
    setSessionError(null);
    // In-memory auth is cleared even if storage or the network is unavailable.
    try {
      await clearLocalSession(true);
    } finally {
      await clearSessionCookie();
    }
  };

  const updateUser = async (userData: User) => {
    if (!userData || !token || userData.id !== user?.id) return;
    await AsyncStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const completeOnboarding = async () => {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    setHasSeenOnboarding(true);
  };

  const resetOnboarding = async () => {
    await AsyncStorage.removeItem('hasSeenOnboarding');
    setHasSeenOnboarding(false);
  };

  return <AuthContext.Provider value={{
    user, token, isLoading, isAuthenticated: !!token && !!user, hasSeenOnboarding,
    sessionError, retrySession: loadUserData, login, logout, updateUser,
    completeOnboarding, resetOnboarding,
  }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
