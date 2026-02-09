import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, Alert } from 'react-native';
import RichHeader from './RichHeader';
import QuickActionsModal from './QuickActionsModal';
import NotificationsModal from './NotificationsModal';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface FixedHeaderLayoutProps {
  children: React.ReactNode;
}

export default function FixedHeaderLayout({ children }: FixedHeaderLayoutProps) {
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
    <SafeAreaView style={styles.container}>
      {/* Fixed Rich Header */}
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
      />

      {/* Notifications Modal */}
      <NotificationsModal
        visible={notificationsVisible}
        onClose={() => setNotificationsVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  content: {
    flex: 1,
  },
});
