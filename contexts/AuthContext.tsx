import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  // Load user data on mount
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
        const parsedUser = JSON.parse(storedUser);
        console.log('[AuthContext] Loaded user from storage:', JSON.stringify(parsedUser, null, 2));
        setToken(storedToken);
        setUser(parsedUser);
        setHasSeenOnboarding(storedOnboarding === 'true');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
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
