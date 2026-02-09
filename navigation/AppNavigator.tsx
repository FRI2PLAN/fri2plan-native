import React, { useRef, useState } from 'react';
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

function HomeScreen({
  onLogout,
  pagerRef,
  currentPage,
  onPageChange,
}: HomeScreenProps) {
  const handlePageScroll = (e: any) => {
    const { position } = e.nativeEvent;
    onPageChange(position);
  };

  return (
    <FixedHeaderLayout>
      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        onPageSelected={handlePageScroll}
        overdrag={false}
        offscreenPageLimit={1}
      >
        <View key="0" style={styles.page}>
          <DashboardScreen onLogout={onLogout} />
        </View>
        <View key="1" style={styles.page}>
          <CalendarScreen />
        </View>
        <View key="2" style={styles.page}>
          <TasksScreen />
        </View>
        <View key="3" style={styles.page}>
          <ShoppingScreen />
        </View>
        <View key="4" style={styles.page}>
          <MessagesScreen />
        </View>
        <View key="5" style={styles.page}>
          <RequestsScreen />
        </View>
        <View key="6" style={styles.page}>
          <NotesScreen />
        </View>
        <View key="7" style={styles.page}>
          <BudgetScreen />
        </View>
        <View key="8" style={styles.page}>
          <RewardsScreen />
        </View>
        <View key="9" style={styles.page}>
          <MembersScreen />
        </View>
        <View key="10" style={styles.page}>
          <ReferralScreen />
        </View>
        <View key="11" style={styles.page}>
          <SettingsScreen />
        </View>
        <View key="12" style={styles.page}>
          <HelpScreen />
        </View>
      </PagerView>
    </FixedHeaderLayout>
  );
}

export default function AppNavigator({ onLogout }: AppNavigatorProps) {
  const pagerRef = useRef<PagerView>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const handlePageSelect = (pageIndex: number) => {
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
