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
import { useTranslation } from 'react-i18next';

interface CustomDrawerContentProps extends DrawerContentComponentProps {
  onPageSelect: (pageIndex: number) => void;
  currentPage: number;
}

export default function CustomDrawerContent({
  onPageSelect,
  currentPage,
  navigation,
}: CustomDrawerContentProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const styles = getStyles(isDark);
  const { logout } = useAuth();

  // Récupérer le nom de la famille active
  const { data: families } = trpc.family.list.useQuery();
  const activeFamilyName: string | null = families?.[0]?.name || null;

  const PAGES = [
    { index: 0, icon: '🏠', label: t('navigation.home') },
    { index: 1, icon: '📅', label: t('navigation.calendar') },
    { index: 2, icon: '✅', label: t('navigation.tasks') },
    { index: 3, icon: '🛒', label: t('navigation.shopping') || 'Courses' },
    { index: 4, icon: '🍽️', label: t('navigation.meals') || 'Repas' },
    { index: 5, icon: '💬', label: t('navigation.messages') },
    { index: 6, icon: '🙏', label: t('navigation.requests') },
    { index: 7, icon: '📝', label: t('navigation.notes') },
    { index: 8, icon: '💰', label: t('navigation.budget') },
    { index: 9, icon: '🎁', label: t('navigation.rewards') },
    { index: 10, icon: '🌸', label: t('navigation.intimateCalendar') },
    { index: 11, icon: '👥', label: t('navigation.circles') },
    { index: 12, icon: '🔗', label: t('navigation.referral') },
    { index: 13, icon: '⚙️', label: t('navigation.settings') },
    { index: 14, icon: '❓', label: t('navigation.help') },
  ];

  const handlePagePress = (pageIndex: number) => {
    onPageSelect(pageIndex);
    navigation.closeDrawer();
  };

  const handleLogout = () => {
    Alert.alert(
      t('auth.logout'),
      t('auth.logoutConfirm') || 'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('auth.logout'),
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
          <Text style={styles.headerSubtitle}>{t('common.familyOrganizer') || 'Organiseur Familial'}</Text>
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
            <Text style={styles.pageIcon}>{page.icon}</Text>
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
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 13,
      paddingHorizontal: 20,
      borderLeftWidth: 4,
      borderLeftColor: 'transparent',
    },
    pageItemActive: {
      backgroundColor: isDark ? '#374151' : '#f3e8ff',
      borderLeftColor: '#7c3aed',
    },
    pageIcon: {
      fontSize: 18,
      marginRight: 12,
      width: 24,
      textAlign: 'center',
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
