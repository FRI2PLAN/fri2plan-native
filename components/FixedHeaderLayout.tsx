import React, { useState } from 'react';
import { View, StyleSheet, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RichHeader from './RichHeader';
import QuickActionsModal from './QuickActionsModal';
import NotificationsModal from './NotificationsModal';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface FixedHeaderLayoutProps {
  children: React.ReactNode;
  onNavigate?: (pageIndex: number) => void;
}

export default function FixedHeaderLayout({ children, onNavigate }: FixedHeaderLayoutProps) {
  const navigation = useNavigation();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [quickActionsVisible, setQuickActionsVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);

  const handleQuickActions = () => {
    setQuickActionsVisible(true);
  };

  const handleNotifications = () => {
    setNotificationsVisible(true);
  };

  const handleThemeToggle = () => {
    // TODO: Implémenter changement de thème
    setIsDarkMode(!isDarkMode);
    Alert.alert('Mode', isDarkMode ? 'Mode clair activé' : 'Mode sombre activé');
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            // Supprimer le token
            await AsyncStorage.removeItem('authToken');
            // Rediriger vers Login
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' as never }],
            });
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* StatusBar with light content (white icons) */}
      <StatusBar barStyle="light-content" backgroundColor="#7c3aed" />
      
      {/* Safe Area (status bar zone) with purple background */}
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Empty - just for purple background on status bar */}
      </SafeAreaView>

      {/* Fixed Rich Header - AFTER safe zone */}
      <RichHeader
        onQuickActionsPress={handleQuickActions}
        onNotificationsPress={handleNotifications}
        onThemeToggle={handleThemeToggle}
        onLogout={handleLogout}
        isDarkMode={isDarkMode}
      />

      {/* Swipable Content */}
      <View style={styles.content}>
        {children}
      </View>

      {/* Quick Actions Modal */}
      <QuickActionsModal
        visible={quickActionsVisible}
        onClose={() => setQuickActionsVisible(false)}
        onNavigate={onNavigate}
      />

      {/* Notifications Modal */}
      <NotificationsModal
        visible={notificationsVisible}
        onClose={() => setNotificationsVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  safeArea: {
    backgroundColor: '#7c3aed', // Purple background for status bar
  },
  content: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
});
