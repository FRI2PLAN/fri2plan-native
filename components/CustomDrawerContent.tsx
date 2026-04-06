import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { trpc } from '../lib/trpc';

interface CustomDrawerContentProps extends DrawerContentComponentProps {
  onPageSelect: (pageIndex: number) => void;
  currentPage: number;
}

const PAGES = [
  { index: 0, name: 'Dashboard', label: '🏠 Accueil' },
  { index: 1, name: 'Calendar', label: '📅 Calendrier' },
  { index: 2, name: 'Tasks', label: '✅ Tâches' },
  { index: 3, name: 'Shopping', label: '🛒 Courses' },
  { index: 4, name: 'Messages', label: '💬 Messages' },
  { index: 5, name: 'Requests', label: '🙏 Demandes' },
  { index: 6, name: 'Notes', label: '📝 Notes' },
  { index: 7, name: 'Budget', label: '💰 Budget' },
  { index: 8, name: 'Rewards', label: '🎁 Récompenses' },
  { index: 9, name: 'CalendrierIntime', label: '🌸 Calendrier Intime' },
  { index: 10, name: 'Members', label: '👥 Membres' },
  { index: 11, name: 'Referral', label: '🔗 Parrainage' },
  { index: 12, name: 'Settings', label: '⚙️ Paramètres' },
  { index: 13, name: 'Help', label: '❓ Aide' },
];

export default function CustomDrawerContent({
  onPageSelect,
  currentPage,
  navigation,
}: CustomDrawerContentProps) {
  const { isDark } = useTheme();
  const styles = getStyles(isDark);
  const { logout } = useAuth();

  // Récupérer le nom de la famille active
  const { data: families } = trpc.family.list.useQuery();
  const activeFamilyName: string | null = families?.[0]?.name || null;

  const handlePagePress = (pageIndex: number) => {
    onPageSelect(pageIndex);
    navigation.closeDrawer();
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            navigation.closeDrawer();
            await logout();
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header : FRI2PLAN + icône déconnexion */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>FRI2PLAN</Text>
          <TouchableOpacity
            onPress={handleLogout}
            style={styles.logoutButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="log-out-outline" size={22} color="#e9d5ff" />
          </TouchableOpacity>
        </View>
        {activeFamilyName ? (
          <Text style={styles.familyName}>👨‍👩‍👧 {activeFamilyName}</Text>
        ) : (
          <Text style={styles.headerSubtitle}>Organiseur Familial</Text>
        )}
      </View>

      {/* Liste des pages */}
      <View style={styles.pagesContainer}>
        {PAGES.map((page) => (
          <TouchableOpacity
            key={page.index}
            style={[
              styles.pageItem,
              currentPage === page.index && styles.pageItemActive,
            ]}
            onPress={() => handlePagePress(page.index)}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text
              style={[
                styles.pageLabel,
                currentPage === page.index && styles.pageLabelActive,
              ]}
            >
              {page.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

function getStyles(isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#1f2937' : '#fff',
    },
    header: {
      padding: 20,
      paddingTop: 60,
      backgroundColor: '#7c3aed',
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#fff',
    },
    logoutButton: {
      padding: 4,
    },
    familyName: {
      fontSize: 14,
      color: '#e9d5ff',
      marginTop: 6,
      fontWeight: '500',
    },
    headerSubtitle: {
      fontSize: 14,
      color: '#e9d5ff',
      marginTop: 4,
    },
    pagesContainer: {
      paddingVertical: 10,
    },
    pageItem: {
      paddingVertical: 15,
      paddingHorizontal: 20,
      borderLeftWidth: 4,
      borderLeftColor: 'transparent',
    },
    pageItemActive: {
      backgroundColor: isDark ? '#374151' : '#f3e8ff',
      borderLeftColor: '#7c3aed',
    },
    pageLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#d1d5db' : '#6b7280',
    },
    pageLabelActive: {
      color: '#7c3aed',
    },
  });
}
