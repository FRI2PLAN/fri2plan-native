import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { DrawerContentComponentProps } from '@react-navigation/drawer';

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
  { index: 9, name: 'Members', label: '👥 Membres' },
  { index: 10, name: 'Referral', label: '🔗 Parrainage' },
  { index: 11, name: 'Settings', label: '⚙️ Paramètres' },
  { index: 12, name: 'Help', label: '❓ Aide' },
];

export default function CustomDrawerContent({
  onPageSelect,
  currentPage,
  navigation,
}: CustomDrawerContentProps) {
  const handlePagePress = (pageIndex: number) => {
    onPageSelect(pageIndex);
    navigation.closeDrawer();
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>FRI2PLAN</Text>
        <Text style={styles.headerSubtitle}>Organiseur Familial</Text>
      </View>

      <View style={styles.pagesContainer}>
        {PAGES.map((page) => (
          <TouchableOpacity
            key={page.index}
            style={[
              styles.pageItem,
              currentPage === page.index && styles.pageItemActive,
            ]}
            onPress={() => handlePagePress(page.index)}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#7c3aed',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
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
    backgroundColor: '#f3e8ff',
    borderLeftColor: '#7c3aed',
  },
  pageLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  pageLabelActive: {
    color: '#7c3aed',
  },
});
