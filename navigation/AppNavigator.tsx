import React, { useRef, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { NavigationContainer } from '@react-navigation/native';
import Carousel from 'react-native-reanimated-carousel';
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
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AppNavigatorProps {
  onLogout: () => void;
}

interface HomeScreenProps {
  onLogout: () => void;
  carouselRef: React.RefObject<any>;
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
  carouselRef,
  currentPage,
  onPageChange,
}: HomeScreenProps) {
  const renderItem = ({ index }: { index: number }) => {
    const page = PAGES[index];
    const PageComponent = page.component;
    
    return (
      <View style={styles.page}>
        {index === 0 ? (
          <PageComponent onLogout={onLogout} />
        ) : (
          <PageComponent />
        )}
      </View>
    );
  };

  return (
    <FixedHeaderLayout>
      <Carousel
        ref={carouselRef}
        loop
        width={SCREEN_WIDTH}
        height={SCREEN_HEIGHT}
        data={PAGES}
        renderItem={renderItem}
        onSnapToItem={(index) => onPageChange(index)}
        panGestureHandlerProps={{
          activeOffsetX: [-10, 10],
        }}
        windowSize={3}
      />
    </FixedHeaderLayout>
  );
}

export default function AppNavigator({ onLogout }: AppNavigatorProps) {
  const carouselRef = useRef<any>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const handlePageSelect = (pageIndex: number) => {
    console.log('handlePageSelect called with:', pageIndex);
    carouselRef.current?.scrollTo({ index: pageIndex, animated: false });
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
              carouselRef={carouselRef}
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
  page: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
});
