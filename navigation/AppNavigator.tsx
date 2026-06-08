import React, { useState, useCallback, memo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from './navigationRef';
import CircularPager from '../components/CircularPager';
import GlobalPrefetch from '../components/GlobalPrefetch';
import FixedHeaderLayout from '../components/FixedHeaderLayout';
import CustomDrawerContent from '../components/CustomDrawerContent';
import DashboardScreen from '../screens/DashboardScreen';
import CalendarScreen from '../screens/CalendarScreen';
import TasksScreen from '../screens/TasksScreen';
import CoursesScreen from '../screens/CoursesScreen';
import RepasScreen from '../screens/RepasScreen';
import MessagesScreen from '../screens/MessagesScreen';
import RequestsScreen from '../screens/RequestsScreen';
import NotesScreen from '../screens/NotesScreen';
import BudgetScreen from '../screens/BudgetScreen';
import RewardsScreen from '../screens/RewardsScreen';
import MembersScreen from '../screens/MembersScreen';
import ReferralScreen from '../screens/ReferralScreen';
import SettingsScreen from '../screens/SettingsScreen';
import HelpScreen from '../screens/HelpScreen';
import CalendrierIntimeScreen from '../screens/CalendrierIntimeScreen';
import { useTheme } from '../contexts/ThemeContext';

const Drawer = createDrawerNavigator();
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AppNavigatorProps {
  onLogout: () => void;
}

interface HomeScreenProps {
  onLogout: () => void;
  currentPage: number;
  onPageChange: (page: number) => void;
}

// All pages in order
// CalendrierIntime est à la position 10 (entre Récompenses=9 et Membres=11)
const PAGES = [
  { key: '0', component: DashboardScreen, name: 'Dashboard' },
  { key: '1', component: CalendarScreen, name: 'Calendar' },
  { key: '2', component: TasksScreen, name: 'Tasks' },
  { key: '3', component: CoursesScreen, name: 'Courses' },
  { key: '4', component: RepasScreen, name: 'Repas' },
  { key: '5', component: MessagesScreen, name: 'Messages' },
  { key: '6', component: RequestsScreen, name: 'Requests' },
  { key: '7', component: NotesScreen, name: 'Notes' },
  { key: '8', component: BudgetScreen, name: 'Budget' },
  { key: '9', component: RewardsScreen, name: 'Rewards' },
  { key: '10', component: CalendrierIntimeScreen, name: 'CalendrierIntime' },
  { key: '11', component: MembersScreen, name: 'Members' },
  // { key: '12', component: ReferralScreen, name: 'Referral' }, // Désactivé temporairement
  { key: '13', component: SettingsScreen, name: 'Settings' },
  { key: '14', component: HelpScreen, name: 'Help' },
];

// Mémoïsé pour éviter les re-renders inutiles qui réinitialisent CircularPager
const HomeScreen = memo(function HomeScreen({
  onLogout,
  currentPage,
  onPageChange,
}: HomeScreenProps) {
  const { isDark } = useTheme();
  const styles = getStyles(isDark);

  // useCallback pour stabiliser la référence et éviter de re-créer CircularPager
  const renderItem = useCallback((page: any, index: number) => {
    const PageComponent = page.component;
    return (
      <View key={page.key} style={styles.page}>
        <PageComponent onLogout={onLogout} onNavigate={onPageChange} />
      </View>
    );
  }, [onLogout, onPageChange, isDark]);

  return (
    <FixedHeaderLayout onNavigate={onPageChange}>
      <GlobalPrefetch />
      <CircularPager
        data={PAGES}
        renderItem={renderItem}
        initialIndex={currentPage}
        onPageChange={onPageChange}
      />
    </FixedHeaderLayout>
  );
});

export default function AppNavigator({
  onLogout,
}: AppNavigatorProps) {
  const { isDark } = useTheme();
  const [currentPage, setCurrentPage] = useState(0);

  const handlePageSelect = useCallback((pageIndex: number) => {
    setCurrentPage(pageIndex);
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <Drawer.Navigator
        initialRouteName="Home"
        drawerContent={(props) => (
          <CustomDrawerContent
            {...props}
            onPageSelect={handlePageSelect}
            currentPage={currentPage}
          />
        )}
        screenOptions={{
          headerShown: false,
          drawerActiveTintColor: '#7c3aed',
          drawerInactiveTintColor: '#6b7280',
          drawerStyle: {
            backgroundColor: isDark ? '#1f2937' : '#fff',
            width: 280,
          },
        }}
      >
        <Drawer.Screen name="Home">
          {() => (
            <HomeScreen
              onLogout={onLogout}
              currentPage={currentPage}
              onPageChange={handlePageSelect}
            />
          )}
        </Drawer.Screen>
      </Drawer.Navigator>
    </NavigationContainer>
  );
}

function getStyles(isDark: boolean) {
  return StyleSheet.create({
    page: {
      flex: 1,
      backgroundColor: isDark ? '#374151' : '#f3f4f6',
    },
  });
}
