import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { NavigationContainer } from '@react-navigation/native';
import PagerNavigator from './PagerNavigator';
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

// Screen components wrapped in View for PagerView
const DashboardPage = (props: any) => (
  <View style={styles.page}>
    <DashboardScreen {...props} onLogout={props.onLogout} />
  </View>
);

const CalendarPage = (props: any) => (
  <View style={styles.page}>
    <CalendarScreen {...props} />
  </View>
);

const TasksPage = (props: any) => (
  <View style={styles.page}>
    <TasksScreen {...props} />
  </View>
);

const ShoppingPage = (props: any) => (
  <View style={styles.page}>
    <ShoppingScreen {...props} />
  </View>
);

const MessagesPage = (props: any) => (
  <View style={styles.page}>
    <MessagesScreen {...props} />
  </View>
);

const RequestsPage = (props: any) => (
  <View style={styles.page}>
    <RequestsScreen {...props} />
  </View>
);

const NotesPage = (props: any) => (
  <View style={styles.page}>
    <NotesScreen {...props} />
  </View>
);

const BudgetPage = (props: any) => (
  <View style={styles.page}>
    <BudgetScreen {...props} />
  </View>
);

const RewardsPage = (props: any) => (
  <View style={styles.page}>
    <RewardsScreen {...props} />
  </View>
);

const MembersPage = (props: any) => (
  <View style={styles.page}>
    <MembersScreen {...props} />
  </View>
);

const ReferralPage = (props: any) => (
  <View style={styles.page}>
    <ReferralScreen {...props} />
  </View>
);

const SettingsPage = (props: any) => (
  <View style={styles.page}>
    <SettingsScreen {...props} />
  </View>
);

const HelpPage = (props: any) => (
  <View style={styles.page}>
    <HelpScreen {...props} />
  </View>
);

interface AppNavigatorProps {
  onLogout: () => void;
}

export default function AppNavigator({ onLogout }: AppNavigatorProps) {
  return (
    <NavigationContainer>
      <Drawer.Navigator
        initialRouteName="Dashboard"
        screenOptions={{
          headerShown: false,
          lazy: false, // Keep all screens mounted
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
            <FixedHeaderLayout>
              <PagerNavigator screens={SCREEN_ORDER}>
                <DashboardPage {...props} onLogout={onLogout} />
                <CalendarPage {...props} />
                <TasksPage {...props} />
                <ShoppingPage {...props} />
                <MessagesPage {...props} />
                <RequestsPage {...props} />
                <NotesPage {...props} />
                <BudgetPage {...props} />
                <RewardsPage {...props} />
                <MembersPage {...props} />
                <ReferralPage {...props} />
                <SettingsPage {...props} />
                <HelpPage {...props} />
              </PagerNavigator>
            </FixedHeaderLayout>
          )}
        </Drawer.Screen>

        <Drawer.Screen
          name="Calendar"
          options={{
            drawerLabel: '📅 Calendrier',
          }}
        >
          {(props) => (
            <FixedHeaderLayout>
              <PagerNavigator screens={SCREEN_ORDER}>
                <DashboardPage {...props} onLogout={onLogout} />
                <CalendarPage {...props} />
                <TasksPage {...props} />
                <ShoppingPage {...props} />
                <MessagesPage {...props} />
                <RequestsPage {...props} />
                <NotesPage {...props} />
                <BudgetPage {...props} />
                <RewardsPage {...props} />
                <MembersPage {...props} />
                <ReferralPage {...props} />
                <SettingsPage {...props} />
                <HelpPage {...props} />
              </PagerNavigator>
            </FixedHeaderLayout>
          )}
        </Drawer.Screen>

        <Drawer.Screen
          name="Tasks"
          options={{
            drawerLabel: '✅ Tâches',
          }}
        >
          {(props) => (
            <FixedHeaderLayout>
              <PagerNavigator screens={SCREEN_ORDER}>
                <DashboardPage {...props} onLogout={onLogout} />
                <CalendarPage {...props} />
                <TasksPage {...props} />
                <ShoppingPage {...props} />
                <MessagesPage {...props} />
                <RequestsPage {...props} />
                <NotesPage {...props} />
                <BudgetPage {...props} />
                <RewardsPage {...props} />
                <MembersPage {...props} />
                <ReferralPage {...props} />
                <SettingsPage {...props} />
                <HelpPage {...props} />
              </PagerNavigator>
            </FixedHeaderLayout>
          )}
        </Drawer.Screen>

        <Drawer.Screen
          name="Shopping"
          options={{
            drawerLabel: '🛒 Courses',
          }}
        >
          {(props) => (
            <FixedHeaderLayout>
              <PagerNavigator screens={SCREEN_ORDER}>
                <DashboardPage {...props} onLogout={onLogout} />
                <CalendarPage {...props} />
                <TasksPage {...props} />
                <ShoppingPage {...props} />
                <MessagesPage {...props} />
                <RequestsPage {...props} />
                <NotesPage {...props} />
                <BudgetPage {...props} />
                <RewardsPage {...props} />
                <MembersPage {...props} />
                <ReferralPage {...props} />
                <SettingsPage {...props} />
                <HelpPage {...props} />
              </PagerNavigator>
            </FixedHeaderLayout>
          )}
        </Drawer.Screen>

        <Drawer.Screen
          name="Messages"
          options={{
            drawerLabel: '💬 Messages',
          }}
        >
          {(props) => (
            <FixedHeaderLayout>
              <PagerNavigator screens={SCREEN_ORDER}>
                <DashboardPage {...props} onLogout={onLogout} />
                <CalendarPage {...props} />
                <TasksPage {...props} />
                <ShoppingPage {...props} />
                <MessagesPage {...props} />
                <RequestsPage {...props} />
                <NotesPage {...props} />
                <BudgetPage {...props} />
                <RewardsPage {...props} />
                <MembersPage {...props} />
                <ReferralPage {...props} />
                <SettingsPage {...props} />
                <HelpPage {...props} />
              </PagerNavigator>
            </FixedHeaderLayout>
          )}
        </Drawer.Screen>

        <Drawer.Screen
          name="Requests"
          options={{
            drawerLabel: '🙏 Demandes',
          }}
        >
          {(props) => (
            <FixedHeaderLayout>
              <PagerNavigator screens={SCREEN_ORDER}>
                <DashboardPage {...props} onLogout={onLogout} />
                <CalendarPage {...props} />
                <TasksPage {...props} />
                <ShoppingPage {...props} />
                <MessagesPage {...props} />
                <RequestsPage {...props} />
                <NotesPage {...props} />
                <BudgetPage {...props} />
                <RewardsPage {...props} />
                <MembersPage {...props} />
                <ReferralPage {...props} />
                <SettingsPage {...props} />
                <HelpPage {...props} />
              </PagerNavigator>
            </FixedHeaderLayout>
          )}
        </Drawer.Screen>

        <Drawer.Screen
          name="Notes"
          options={{
            drawerLabel: '📝 Notes',
          }}
        >
          {(props) => (
            <FixedHeaderLayout>
              <PagerNavigator screens={SCREEN_ORDER}>
                <DashboardPage {...props} onLogout={onLogout} />
                <CalendarPage {...props} />
                <TasksPage {...props} />
                <ShoppingPage {...props} />
                <MessagesPage {...props} />
                <RequestsPage {...props} />
                <NotesPage {...props} />
                <BudgetPage {...props} />
                <RewardsPage {...props} />
                <MembersPage {...props} />
                <ReferralPage {...props} />
                <SettingsPage {...props} />
                <HelpPage {...props} />
              </PagerNavigator>
            </FixedHeaderLayout>
          )}
        </Drawer.Screen>

        <Drawer.Screen
          name="Budget"
          options={{
            drawerLabel: '💰 Budget',
          }}
        >
          {(props) => (
            <FixedHeaderLayout>
              <PagerNavigator screens={SCREEN_ORDER}>
                <DashboardPage {...props} onLogout={onLogout} />
                <CalendarPage {...props} />
                <TasksPage {...props} />
                <ShoppingPage {...props} />
                <MessagesPage {...props} />
                <RequestsPage {...props} />
                <NotesPage {...props} />
                <BudgetPage {...props} />
                <RewardsPage {...props} />
                <MembersPage {...props} />
                <ReferralPage {...props} />
                <SettingsPage {...props} />
                <HelpPage {...props} />
              </PagerNavigator>
            </FixedHeaderLayout>
          )}
        </Drawer.Screen>

        <Drawer.Screen
          name="Rewards"
          options={{
            drawerLabel: '🎁 Récompenses',
          }}
        >
          {(props) => (
            <FixedHeaderLayout>
              <PagerNavigator screens={SCREEN_ORDER}>
                <DashboardPage {...props} onLogout={onLogout} />
                <CalendarPage {...props} />
                <TasksPage {...props} />
                <ShoppingPage {...props} />
                <MessagesPage {...props} />
                <RequestsPage {...props} />
                <NotesPage {...props} />
                <BudgetPage {...props} />
                <RewardsPage {...props} />
                <MembersPage {...props} />
                <ReferralPage {...props} />
                <SettingsPage {...props} />
                <HelpPage {...props} />
              </PagerNavigator>
            </FixedHeaderLayout>
          )}
        </Drawer.Screen>

        <Drawer.Screen
          name="Members"
          options={{
            drawerLabel: '👥 Membres',
          }}
        >
          {(props) => (
            <FixedHeaderLayout>
              <PagerNavigator screens={SCREEN_ORDER}>
                <DashboardPage {...props} onLogout={onLogout} />
                <CalendarPage {...props} />
                <TasksPage {...props} />
                <ShoppingPage {...props} />
                <MessagesPage {...props} />
                <RequestsPage {...props} />
                <NotesPage {...props} />
                <BudgetPage {...props} />
                <RewardsPage {...props} />
                <MembersPage {...props} />
                <ReferralPage {...props} />
                <SettingsPage {...props} />
                <HelpPage {...props} />
              </PagerNavigator>
            </FixedHeaderLayout>
          )}
        </Drawer.Screen>

        <Drawer.Screen
          name="Referral"
          options={{
            drawerLabel: '🔗 Parrainage',
          }}
        >
          {(props) => (
            <FixedHeaderLayout>
              <PagerNavigator screens={SCREEN_ORDER}>
                <DashboardPage {...props} onLogout={onLogout} />
                <CalendarPage {...props} />
                <TasksPage {...props} />
                <ShoppingPage {...props} />
                <MessagesPage {...props} />
                <RequestsPage {...props} />
                <NotesPage {...props} />
                <BudgetPage {...props} />
                <RewardsPage {...props} />
                <MembersPage {...props} />
                <ReferralPage {...props} />
                <SettingsPage {...props} />
                <HelpPage {...props} />
              </PagerNavigator>
            </FixedHeaderLayout>
          )}
        </Drawer.Screen>

        <Drawer.Screen
          name="Settings"
          options={{
            drawerLabel: '⚙️ Paramètres',
          }}
        >
          {(props) => (
            <FixedHeaderLayout>
              <PagerNavigator screens={SCREEN_ORDER}>
                <DashboardPage {...props} onLogout={onLogout} />
                <CalendarPage {...props} />
                <TasksPage {...props} />
                <ShoppingPage {...props} />
                <MessagesPage {...props} />
                <RequestsPage {...props} />
                <NotesPage {...props} />
                <BudgetPage {...props} />
                <RewardsPage {...props} />
                <MembersPage {...props} />
                <ReferralPage {...props} />
                <SettingsPage {...props} />
                <HelpPage {...props} />
              </PagerNavigator>
            </FixedHeaderLayout>
          )}
        </Drawer.Screen>

        <Drawer.Screen
          name="Help"
          options={{
            drawerLabel: '❓ Aide',
          }}
        >
          {(props) => (
            <FixedHeaderLayout>
              <PagerNavigator screens={SCREEN_ORDER}>
                <DashboardPage {...props} onLogout={onLogout} />
                <CalendarPage {...props} />
                <TasksPage {...props} />
                <ShoppingPage {...props} />
                <MessagesPage {...props} />
                <RequestsPage {...props} />
                <NotesPage {...props} />
                <BudgetPage {...props} />
                <RewardsPage {...props} />
                <MembersPage {...props} />
                <ReferralPage {...props} />
                <SettingsPage {...props} />
                <HelpPage {...props} />
              </PagerNavigator>
            </FixedHeaderLayout>
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
