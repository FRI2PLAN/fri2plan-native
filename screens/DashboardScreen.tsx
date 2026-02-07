import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, RefreshControl, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../contexts/AuthContext';
import { trpc } from '../lib/trpc';
import { useState } from 'react';

interface DashboardScreenProps {
  onLogout: () => void;
}

export default function DashboardScreen({ onLogout }: DashboardScreenProps) {
  const { user, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch dashboard data
  const { data: tasks, isLoading: tasksLoading, refetch: refetchTasks } = trpc.tasks.list.useQuery();
  const { data: events, isLoading: eventsLoading, refetch: refetchEvents } = trpc.events.list.useQuery();
  const { data: messages, isLoading: messagesLoading, refetch: refetchMessages } = trpc.messages.list.useQuery();

  const handleLogout = async () => {
    await logout();
    onLogout();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchTasks(),
      refetchEvents(),
      refetchMessages(),
    ]);
    setRefreshing(false);
  };

  // Calculate statistics
  const pendingTasks = tasks?.filter(t => t.status !== 'completed').length || 0;
  const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0;
  const todayEvents = events?.filter(e => {
    const eventDate = new Date(e.startTime).toDateString();
    const today = new Date().toDateString();
    return eventDate === today;
  }).length || 0;
  const unreadMessages = messages?.length || 0;

  const isLoading = tasksLoading || eventsLoading || messagesLoading;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>FRI2PLAN</Text>
          <Text style={styles.headerSubtitle}>Bonjour, {user?.name || 'Utilisateur'} 👋</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Déconnexion</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7c3aed']} />
        }
      >
        <Text style={styles.title}>Tableau de bord</Text>
        
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#7c3aed" />
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        ) : (
          <>
            {/* Statistics Cards */}
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, styles.purpleCard]}>
                <Text style={styles.statNumber}>{pendingTasks}</Text>
                <Text style={styles.statLabel}>Tâches en cours</Text>
              </View>

              <View style={[styles.statCard, styles.greenCard]}>
                <Text style={styles.statNumber}>{completedTasks}</Text>
                <Text style={styles.statLabel}>Tâches terminées</Text>
              </View>

              <View style={[styles.statCard, styles.blueCard]}>
                <Text style={styles.statNumber}>{todayEvents}</Text>
                <Text style={styles.statLabel}>Événements aujourd'hui</Text>
              </View>

              <View style={[styles.statCard, styles.orangeCard]}>
                <Text style={styles.statNumber}>{unreadMessages}</Text>
                <Text style={styles.statLabel}>Messages</Text>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>⚡ Actions rapides</Text>
              <View style={styles.quickActions}>
                <TouchableOpacity style={styles.actionButton}>
                  <Text style={styles.actionButtonText}>➕ Nouvelle tâche</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <Text style={styles.actionButtonText}>📅 Nouvel événement</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <Text style={styles.actionButtonText}>🛒 Liste de courses</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Recent Tasks */}
            {tasks && tasks.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>📋 Tâches récentes</Text>
                {tasks.slice(0, 3).map((task) => (
                  <View key={task.id} style={styles.taskItem}>
                    <View style={styles.taskInfo}>
                      <Text style={styles.taskTitle}>{task.title}</Text>
                      <Text style={styles.taskMeta}>
                        {task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢'} 
                        {' '}{task.status === 'completed' ? '✅ Terminée' : '⏳ En cours'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Today's Events */}
            {todayEvents > 0 && events && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>📅 Événements du jour</Text>
                {events
                  .filter(e => {
                    const eventDate = new Date(e.startTime).toDateString();
                    const today = new Date().toDateString();
                    return eventDate === today;
                  })
                  .map((event) => (
                    <View key={event.id} style={styles.eventItem}>
                      <Text style={styles.eventTitle}>{event.title}</Text>
                      <Text style={styles.eventTime}>
                        {new Date(event.startTime).toLocaleTimeString('fr-FR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </Text>
                    </View>
                  ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#7c3aed',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  purpleCard: {
    backgroundColor: '#7c3aed',
  },
  greenCard: {
    backgroundColor: '#10b981',
  },
  blueCard: {
    backgroundColor: '#3b82f6',
  },
  orangeCard: {
    backgroundColor: '#f59e0b',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  quickActions: {
    gap: 12,
  },
  actionButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  taskItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  taskMeta: {
    fontSize: 14,
    color: '#6b7280',
  },
  eventItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  eventTime: {
    fontSize: 14,
    color: '#7c3aed',
    fontWeight: '600',
  },
});
