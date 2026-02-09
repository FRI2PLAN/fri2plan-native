import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { NavigationContainer } from '@react-navigation/native';
import PagerView from 'react-native-pager-view';
import FixedHeaderLayout from '../components/FixedHeaderLayout';
import CustomDrawerContent from '../components/CustomDrawerContent';
import DashboardScreen from '../screens/DashboardScreen';
import CalendarScreen from '../screens/CalendarScreen';
import TasksScreen from '../screens/TasksScreen';
import ShoppingScreen from '../screens/ShoppingScreen';
import MessagesScreen from '../screens/MessagesScreen';
import RequestsScreen from '../screens/RequestsScreen';
import NotesScreen from '../screens/NotesScreen';
import BudgetScreen from '../screens/BudgetScreen';
import RewardsScreen from '../screens/RewardsScreen';
import MembersScreen from '../screens/MembersScreen';
import ReferralScreen from '../screens/ReferralScreen';
import SettingsScreen from '../screens/SettingsScreen';
import HelpScreen from '../screens/HelpScreen';

const Drawer = createDrawerNavigator();

interface AppNavigatorProps {
  onLogout: () => void;
}

interface HomeScreenProps {
  onLogout: () => void;
  pagerRef: React.RefObject<PagerView>;
  currentPage: number;
  onPageChange: (page: number) => void;
}

// All pages in order
const PAGES = [
  { key: '0', component: DashboardScreen, name: 'Dashboard' },
  { key: '1', component: CalendarScreen, name: 'Calendar' },
  { key: '2', component: TasksScreen, name: 'Tasks' },
  { key: '3', component: ShoppingScreen, name: 'Shopping' },
  { key: '4', component: MessagesScreen, name: 'Messages' },
  { key: '5', component: RequestsScreen, name: 'Requests' },
  { key: '6', component: NotesScreen, name: 'Notes' },
  { key: '7', component: BudgetScreen, name: 'Budget' },
  { key: '8', component: RewardsScreen, name: 'Rewards' },
  { key: '9', component: MembersScreen, name: 'Members' },
  { key: '10', component: ReferralScreen, name: 'Referral' },
  { key: '11', component: SettingsScreen, name: 'Settings' },
  { key: '12', component: HelpScreen, name: 'Help' },
];

function HomeScreen({
  onLogout,
  pagerRef,
  currentPage,
  onPageChange,
}: HomeScreenProps) {
  const TOTAL_PAGES = PAGES.length;
  const [isScrolling, setIsScrolling] = useState(false);

  const handlePageScroll = (e: any) => {
    const { position } = e.nativeEvent;
    onPageChange(position);
  };

  // Handle circular navigation
  const handlePageScrollStateChanged = (e: any) => {
    const state = e.nativeEvent.pageScrollState;
    
    if (state === 'dragging') {
      setIsScrolling(true);
    } else if (state === 'idle' && isScrolling) {
      setIsScrolling(false);
      
      // Wrap around logic
      // Note: PagerView doesn't natively support circular scroll
      // This is a limitation we'll document for the user
    }
  };

  return (
    <FixedHeaderLayout>
      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        onPageSelected={handlePageScroll}
        onPageScrollStateChanged={handlePageScrollStateChanged}
        overdrag={false}
        offscreenPageLimit={1}
      >
        {PAGES.map((page, index) => {
          const PageComponent = page.component;
          return (
            <View key={page.key} style={styles.page}>
              {index === 0 ? (
                <PageComponent onLogout={onLogout} />
              ) : (
                <PageComponent />
              )}
            </View>
          );
        })}
      </PagerView>
    </FixedHeaderLayout>
  );
}

export default function AppNavigator({ onLogout }: AppNavigatorProps) {
  const pagerRef = useRef<PagerView>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const handlePageSelect = (pageIndex: number) => {
    console.log('handlePageSelect called with:', pageIndex);
    pagerRef.current?.setPage(pageIndex);
    setCurrentPage(pageIndex);
  };

  return (
    <NavigationContainer>
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
            backgroundColor: '#fff',
            width: 280,
          },
        }}
      >
        <Drawer.Screen name="Home">
          {() => (
            <HomeScreen
              onLogout={onLogout}
              pagerRef={pagerRef}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          )}
        </Drawer.Screen>
      </Drawer.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
});
