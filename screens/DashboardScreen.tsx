import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../lib/api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DashboardScreenProps {
  onLogout: () => void;
  onNavigate: (screen: string) => void;
}

interface DashboardData {
  todayTasks: any[];
  upcomingEvents: any[];
  unreadMessages: number;
  pendingRequests: number;
}

export default function DashboardScreen({ onLogout, onNavigate }: DashboardScreenProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    todayTasks: [],
    upcomingEvents: [],
    unreadMessages: 0,
    pendingRequests: 0,
  });

  useEffect(() => {
    loadUserData();
    loadDashboardData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      // TODO: Appeler les vraies API tRPC
      // Pour l'instant, données de test
      setDashboardData({
        todayTasks: [
          { id: 1, title: 'Faire les courses', completed: false, priority: 'high' },
          { id: 2, title: 'Appeler le médecin', completed: false, priority: 'urgent' },
          { id: 3, title: 'Préparer le dîner', completed: true, priority: 'medium' },
        ],
        upcomingEvents: [
          { id: 1, title: 'Réunion famille', startTime: new Date(), category: 'important' },
          { id: 2, title: 'Anniversaire Marie', startTime: new Date(), category: 'birthday' },
        ],
        unreadMessages: 3,
        pendingRequests: 2,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
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
            await AsyncStorage.removeItem('authToken');
            await AsyncStorage.removeItem('user');
            onLogout();
          },
        },
      ]
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#eab308';
      case 'low': return '#22c55e';
      default: return '#6b7280';
    }
  };

  const getPriorityEmoji = (priority: string) => {
    switch (priority) {
      case 'urgent': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bonjour,</Text>
          <Text style={styles.userName}>{user?.name || 'Utilisateur'} 👋</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Date du jour */}
        <View style={styles.dateContainer}>
          <Text style={styles.dateText}>
            {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
          </Text>
        </View>

        {/* Résumé rapide */}
        <View style={styles.summaryContainer}>
          <TouchableOpacity style={styles.summaryCard} onPress={() => onNavigate('tasks')}>
            <Text style={styles.summaryNumber}>{dashboardData.todayTasks.filter(t => !t.completed).length}</Text>
            <Text style={styles.summaryLabel}>Tâches</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.summaryCard} onPress={() => onNavigate('calendar')}>
            <Text style={styles.summaryNumber}>{dashboardData.upcomingEvents.length}</Text>
            <Text style={styles.summaryLabel}>Événements</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.summaryCard} onPress={() => onNavigate('messages')}>
            <Text style={styles.summaryNumber}>{dashboardData.unreadMessages}</Text>
            <Text style={styles.summaryLabel}>Messages</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.summaryCard} onPress={() => onNavigate('requests')}>
            <Text style={styles.summaryNumber}>{dashboardData.pendingRequests}</Text>
            <Text style={styles.summaryLabel}>Demandes</Text>
          </TouchableOpacity>
        </View>

        {/* Tâches du jour */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>✅ Tâches du jour</Text>
            <TouchableOpacity onPress={() => onNavigate('tasks')}>
              <Text style={styles.seeAllText}>Voir tout →</Text>
            </TouchableOpacity>
          </View>
          
          {dashboardData.todayTasks.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Aucune tâche pour aujourd'hui 🎉</Text>
            </View>
          ) : (
            dashboardData.todayTasks.slice(0, 3).map((task) => (
              <View key={task.id} style={styles.taskCard}>
                <View style={styles.taskLeft}>
                  <View style={[styles.checkbox, task.completed && styles.checkboxCompleted]}>
                    {task.completed && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={[styles.taskTitle, task.completed && styles.taskCompleted]}>
                    {task.title}
                  </Text>
                </View>
                <Text style={styles.priorityEmoji}>{getPriorityEmoji(task.priority)}</Text>
              </View>
            ))
          )}
        </View>

        {/* Événements à venir */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📅 Événements à venir</Text>
            <TouchableOpacity onPress={() => onNavigate('calendar')}>
              <Text style={styles.seeAllText}>Voir tout →</Text>
            </TouchableOpacity>
          </View>
          
          {dashboardData.upcomingEvents.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Aucun événement prévu</Text>
            </View>
          ) : (
            dashboardData.upcomingEvents.slice(0, 3).map((event) => (
              <View key={event.id} style={styles.eventCard}>
                <View style={styles.eventTime}>
                  <Text style={styles.eventTimeText}>
                    {format(event.startTime, 'HH:mm')}
                  </Text>
                </View>
                <View style={styles.eventContent}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventCategory}>{event.category}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Actions rapides */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Actions rapides</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionIcon}>📅</Text>
              <Text style={styles.actionText}>Événement</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionIcon}>✅</Text>
              <Text style={styles.actionText}>Tâche</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionIcon}>🛒</Text>
              <Text style={styles.actionText}>Course</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionIcon}>💬</Text>
              <Text style={styles.actionText}>Message</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  header: {
    backgroundColor: '#7c3aed',
    padding: 20,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 16,
    color: '#e9d5ff',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  dateContainer: {
    backgroundColor: '#fff',
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    textTransform: 'capitalize',
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#7c3aed',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  seeAllText: {
    fontSize: 14,
    color: '#7c3aed',
    fontWeight: '500',
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  taskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxCompleted: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  taskTitle: {
    fontSize: 16,
    color: '#1f2937',
    flex: 1,
  },
  taskCompleted: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
  },
  priorityEmoji: {
    fontSize: 20,
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  eventTime: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 2,
    borderRightColor: '#7c3aed',
    marginRight: 16,
  },
  eventTimeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7c3aed',
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
  eventCategory: {
    fontSize: 14,
    color: '#6b7280',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
});
