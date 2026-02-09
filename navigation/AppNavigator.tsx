import { createDrawerNavigator } from '@react-navigation/drawer';
import { NavigationContainer } from '@react-navigation/native';
import SwipeNavigator from './SwipeNavigator';
import FixedHeaderLayout from '../components/FixedHeaderLayout';
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

// Define screen order for swipe navigation
const SCREEN_ORDER = [
  'Dashboard',
  'Calendar',
  'Tasks',
  'Shopping',
  'Messages',
  'Requests',
  'Notes',
  'Budget',
  'Rewards',
  'Members',
  'Referral',
  'Settings',
  'Help',
];

// Screen titles mapping
const SCREEN_TITLES: Record<string, string> = {
  Dashboard: '🏠 Tableau de bord',
  Calendar: '📅 Calendrier',
  Tasks: '✅ Tâches',
  Shopping: '🛒 Courses',
  Messages: '💬 Messages',
  Requests: '📋 Requêtes',
  Notes: '📝 Notes',
  Budget: '💰 Budget',
  Rewards: '🎁 Récompenses',
  Members: '👥 Membres',
  Referral: '🤝 Parrainer',
  Settings: '⚙️ Paramètres',
  Help: '❓ Aide',
};

// Wrapper component to add fixed header and swipe navigation
function ScreenWrapper({ 
  children, 
  screenName,
}: { 
  children: React.ReactNode; 
  screenName: string;
}) {
  return (
    <FixedHeaderLayout title={SCREEN_TITLES[screenName] || screenName}>
      <SwipeNavigator currentScreen={screenName} screens={SCREEN_ORDER}>
        {children}
      </SwipeNavigator>
    </FixedHeaderLayout>
  );
}

interface AppNavigatorProps {
  onLogout: () => void;
}

export default function AppNavigator({ onLogout }: AppNavigatorProps) {
  return (
    <NavigationContainer>
      <Drawer.Navigator
        initialRouteName="Dashboard"
        screenOptions={{
          headerShown: false, // Disable Drawer header - we use FixedHeaderLayout instead
          drawerActiveTintColor: '#7c3aed',
          drawerInactiveTintColor: '#6b7280',
          drawerLabelStyle: {
            fontSize: 16,
            fontWeight: '600',
          },
          drawerStyle: {
            backgroundColor: '#fff',
            width: 280,
          },
        }}
      >
        <Drawer.Screen
          name="Dashboard"
          options={{
            drawerLabel: '🏠 Accueil',
          }}
        >
          {(props) => (
            <ScreenWrapper screenName="Dashboard">
              <DashboardScreen {...props} onLogout={onLogout} />
            </ScreenWrapper>
          )}
        </Drawer.Screen>

        <Drawer.Screen
          name="Calendar"
          options={{
            drawerLabel: '📅 Calendrier',
          }}
        >
          {(props) => (
            <ScreenWrapper screenName="Calendar">
              <CalendarScreen {...props} />
            </ScreenWrapper>
          )}
        </Drawer.Screen>

        <Drawer.Screen
          name="Tasks"
          options={{
            drawerLabel: '✅ Tâches',
          }}
        >
          {(props) => (
            <ScreenWrapper screenName="Tasks">
              <TasksScreen {...props} />
            </ScreenWrapper>
          )}
        </Drawer.Screen>

        <Drawer.Screen
          name="Shopping"
          options={{
            drawerLabel: '🛒 Courses',
          }}
        >
          {(props) => (
            <ScreenWrapper screenName="Shopping">
              <ShoppingScreen {...props} />
            </ScreenWrapper>
          )}
        </Drawer.Screen>

        <Drawer.Screen
          name="Messages"
          options={{
            drawerLabel: '💬 Messages',
          }}
        >
          {(props) => (
            <ScreenWrapper screenName="Messages">
              <MessagesScreen {...props} />
            </ScreenWrapper>
          )}
        </Drawer.Screen>

        <Drawer.Screen
          name="Requests"
          options={{
            drawerLabel: '📋 Requêtes',
          }}
        >
          {(props) => (
            <ScreenWrapper screenName="Requests">
              <RequestsScreen {...props} />
            </ScreenWrapper>
          )}
        </Drawer.Screen>

        <Drawer.Screen
          name="Notes"
          options={{
            drawerLabel: '📝 Notes',
          }}
        >
          {(props) => (
            <ScreenWrapper screenName="Notes">
              <NotesScreen {...props} />
            </ScreenWrapper>
          )}
        </Drawer.Screen>

        <Drawer.Screen
          name="Budget"
          options={{
            drawerLabel: '💰 Budget',
          }}
        >
          {(props) => (
            <ScreenWrapper screenName="Budget">
              <BudgetScreen {...props} />
            </ScreenWrapper>
          )}
        </Drawer.Screen>

        <Drawer.Screen
          name="Rewards"
          options={{
            drawerLabel: '🎁 Récompenses',
          }}
        >
          {(props) => (
            <ScreenWrapper screenName="Rewards">
              <RewardsScreen {...props} />
            </ScreenWrapper>
          )}
        </Drawer.Screen>

        <Drawer.Screen
          name="Members"
          options={{
            drawerLabel: '👥 Membres',
          }}
        >
          {(props) => (
            <ScreenWrapper screenName="Members">
              <MembersScreen {...props} />
            </ScreenWrapper>
          )}
        </Drawer.Screen>

        <Drawer.Screen
          name="Referral"
          options={{
            drawerLabel: '🤝 Parrainer',
          }}
        >
          {(props) => (
            <ScreenWrapper screenName="Referral">
              <ReferralScreen {...props} />
            </ScreenWrapper>
          )}
        </Drawer.Screen>

        <Drawer.Screen
          name="Settings"
          options={{
            drawerLabel: '⚙️ Paramètres',
          }}
        >
          {(props) => (
            <ScreenWrapper screenName="Settings">
              <SettingsScreen {...props} onLogout={onLogout} />
            </ScreenWrapper>
          )}
        </Drawer.Screen>

        <Drawer.Screen
          name="Help"
          options={{
            drawerLabel: '❓ Centre d\'aide',
          }}
        >
          {(props) => (
            <ScreenWrapper screenName="Help">
              <HelpScreen {...props} />
            </ScreenWrapper>
          )}
        </Drawer.Screen>
      </Drawer.Navigator>
    </NavigationContainer>
  );
}
