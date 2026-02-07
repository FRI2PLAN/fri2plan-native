import { createDrawerNavigator } from '@react-navigation/drawer';
import { NavigationContainer } from '@react-navigation/native';
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

export default function AppNavigator({ onLogout }: AppNavigatorProps) {
  return (
    <NavigationContainer>
      <Drawer.Navigator
        initialRouteName="Dashboard"
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: '#7c3aed',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
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
            title: '🏠 Tableau de bord',
            drawerLabel: '🏠 Accueil',
          }}
        >
          {(props) => <DashboardScreen {...props} onLogout={onLogout} />}
        </Drawer.Screen>

        <Drawer.Screen
          name="Calendar"
          component={CalendarScreen}
          options={{
            title: '📅 Calendrier',
            drawerLabel: '📅 Calendrier',
          }}
        />

        <Drawer.Screen
          name="Tasks"
          component={TasksScreen}
          options={{
            title: '✅ Tâches',
            drawerLabel: '✅ Tâches',
          }}
        />

        <Drawer.Screen
          name="Shopping"
          component={ShoppingScreen}
          options={{
            title: '🛒 Courses',
            drawerLabel: '🛒 Courses',
          }}
        />

        <Drawer.Screen
          name="Messages"
          component={MessagesScreen}
          options={{
            title: '💬 Messages',
            drawerLabel: '💬 Messages',
          }}
        />

        <Drawer.Screen
          name="Requests"
          component={RequestsScreen}
          options={{
            title: '📋 Requêtes',
            drawerLabel: '📋 Requêtes',
          }}
        />

        <Drawer.Screen
          name="Notes"
          component={NotesScreen}
          options={{
            title: '📝 Notes',
            drawerLabel: '📝 Notes',
          }}
        />

        <Drawer.Screen
          name="Budget"
          component={BudgetScreen}
          options={{
            title: '💰 Budget',
            drawerLabel: '💰 Budget',
          }}
        />

        <Drawer.Screen
          name="Rewards"
          component={RewardsScreen}
          options={{
            title: '🎁 Récompenses',
            drawerLabel: '🎁 Récompenses',
          }}
        />

        <Drawer.Screen
          name="Members"
          component={MembersScreen}
          options={{
            title: '👥 Membres',
            drawerLabel: '👥 Membres',
          }}
        />

        <Drawer.Screen
          name="Referral"
          component={ReferralScreen}
          options={{
            title: '🤝 Parrainer',
            drawerLabel: '🤝 Parrainer',
          }}
        />

        <Drawer.Screen
          name="Settings"
          options={{
            title: '⚙️ Paramètres',
            drawerLabel: '⚙️ Paramètres',
          }}
        >
          {(props) => <SettingsScreen {...props} onLogout={onLogout} />}
        </Drawer.Screen>

        <Drawer.Screen
          name="Help"
          component={HelpScreen}
          options={{
            title: '❓ Aide',
            drawerLabel: '❓ Centre d\'aide',
          }}
        />
      </Drawer.Navigator>
    </NavigationContainer>
  );
}
