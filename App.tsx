import 'react-native-gesture-handler';
import './i18n'; // Initialize i18n
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc, createTRPCClient } from './lib/trpc';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import LoginScreen from './screens/LoginScreen';
import AppNavigator from './navigation/AppNavigator';
import OnboardingScreen from './screens/OnboardingScreen';
import { ActivityIndicator, View, StyleSheet, Platform } from 'react-native';
import { useEffect, useState, useMemo, useRef } from 'react';
import * as NavigationBar from 'expo-navigation-bar';

// Create QueryClient (stable, never recreated)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5000,
    },
  },
});

function AppContent() {
  const { isAuthenticated, isLoading, hasSeenOnboarding, completeOnboarding, logout, token } = useAuth();
  const [currentPage, setCurrentPage] = useState(0);

  // Recreate tRPC client whenever the auth token changes so requests include the correct Bearer token
  const trpcClient = useMemo(() => createTRPCClient(), [token]);

  // Invalidate all queries when the token changes (login / logout)
  const prevTokenRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevTokenRef.current !== token) {
      prevTokenRef.current = token;
      queryClient.clear();
    }
  }, [token]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
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
          <AppContent />
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
