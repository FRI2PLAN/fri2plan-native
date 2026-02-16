import 'react-native-gesture-handler';
import './i18n'; // Initialize i18n
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc, createTRPCClient } from './lib/trpc';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { FamilyProvider } from './contexts/FamilyContext';
import LoginScreen from './screens/LoginScreen';
import AppNavigator from './navigation/AppNavigator';
import OnboardingScreen from './screens/OnboardingScreen';
import { ActivityIndicator, View, StyleSheet, Platform } from 'react-native';
import { useEffect, useState } from 'react';
import * as NavigationBar from 'expo-navigation-bar';

// Create QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5000,
    },
  },
});

// Create tRPC client
const trpcClient = createTRPCClient();

function AppContent() {
  const { isAuthenticated, isLoading, hasSeenOnboarding, completeOnboarding, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState(0);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  if (isAuthenticated) {
    return (
      <>
        <AppNavigator onLogout={logout} />
        <OnboardingScreen
          visible={!hasSeenOnboarding}
          onComplete={completeOnboarding}
          onNavigate={(pageIndex) => {
            setCurrentPage(pageIndex);
            // TODO: Implement navigation to specific page
          }}
        />
      </>
    );
  }

  return <LoginScreen />;
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
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <FamilyProvider>
              <AppContent />
            </FamilyProvider>
          </AuthProvider>
        </QueryClientProvider>
      </trpc.Provider>
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
