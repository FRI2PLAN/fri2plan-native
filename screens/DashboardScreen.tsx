import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../contexts/AuthContext';
import { trpc } from '../lib/trpc';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DashboardScreenProps {
  onLogout: () => void;
}

export default function DashboardScreen({ onLogout }: DashboardScreenProps) {
  const { user, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch active family
  const { data: families } = trpc.family.list.useQuery();
  const activeFamily = families?.[0]; // Assuming first family is active

  // Fetch family members
  const { data: familyMembers = [] } = trpc.family.members.useQuery(
    { familyId: activeFamily?.id || 0 },
    { enabled: !!activeFamily }
  );

  // Fetch dashboard data
  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = trpc.tasks.list.useQuery();
  const { data: events = [], isLoading: eventsLoading, refetch: refetchEvents } = trpc.events.list.useQuery();
  const { data: messagesData, isLoading: messagesLoading, refetch: refetchMessages } = trpc.messages.list.useQuery(
    { familyId: activeFamily?.id || 0, limit: 50, offset: 0 },
    { enabled: !!activeFamily }
  );
  const messages = messagesData?.messages || [];

  // Fetch requests (for admin)
  const { data: requests = [], refetch: refetchRequests } = trpc.requests.list.useQuery(
    { familyId: activeFamily?.id || 0 },
    { enabled: !!activeFamily }
  );

  // Determine if user is family admin
  const currentMember = familyMembers.find(m => m.id === user?.id);
  const isFamilyAdmin = currentMember?.familyRole === 'admin';

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
      refetchRequests(),
    ]);
    setRefreshing(false);
  };

  // Calculate statistics
  const pendingTasks = useMemo(() => {
    return tasks.filter(t => 
      t.status !== 'completed' && 
      (!t.assignedTo || t.assignedTo === user?.id)
    ).length;
  }, [tasks, user?.id]);

  const todayEvents = useMemo(() => {
    const today = new Date().toDateString();
    return events.filter(e => {
      const eventDate = new Date(e.startDate).toDateString();
      return eventDate === today;
    }).length;
  }, [events]);

  const unreadMessages = useMemo(() => {
    return messages.filter(m => 'isRead' in m && m.isRead === 0).length;
  }, [messages]);

  const pendingRequests = useMemo(() => {
    return requests.filter(r => r.status === 'pending').length;
  }, [requests]);

  // Get upcoming birthdays (max 3)
  const upcomingBirthdays = useMemo(() => {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
    
    return familyMembers
      .filter(m => m.birthday)
      .map(m => {
        const birthday = new Date(m.birthday!);
        const thisYearBirthday = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());
        const nextYearBirthday = new Date(today.getFullYear() + 1, birthday.getMonth(), birthday.getDate());
        
        const upcomingBirthday = thisYearBirthday >= today ? thisYearBirthday : nextYearBirthday;
        const daysUntil = Math.ceil((upcomingBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          ...m,
          upcomingBirthday,
          daysUntil,
        };
      })
      .filter(m => m.upcomingBirthday <= nextMonth)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 3); // Max 3 birthdays
  }, [familyMembers]);

  // Get today's events
  const todayEventsList = useMemo(() => {
    const today = new Date().toDateString();
    return events.filter(e => {
      const eventDate = new Date(e.startDate).toDateString();
      return eventDate === today;
    });
  }, [events]);

  const isLoading = tasksLoading || eventsLoading || messagesLoading;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Content */}
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7c3aed']} />
        }
      >
        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Accueil</Text>
        </View>

        {!activeFamily ? (
          <View style={styles.noFamilyCard}>
            <Text style={styles.noFamilyTitle}>Bienvenue sur FRI2PLAN ! 🎉</Text>
            <Text style={styles.noFamilyText}>
              Pour commencer à utiliser l'application, vous devez créer une famille ou rejoindre une famille existante.
            </Text>
            <TouchableOpacity style={styles.createFamilyButton}>
              <Text style={styles.createFamilyButtonText}>Créer une famille</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#7c3aed" />
                <Text style={styles.loadingText}>Chargement...</Text>
              </View>
            ) : (
              <>
                {/* Pending Requests Widget (Admin only) */}
                {isFamilyAdmin && pendingRequests > 0 && (
                  <View style={styles.widget}>
                    <View style={styles.widgetHeader}>
                      <Text style={styles.widgetTitle}>📋 Demandes en attente</Text>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{pendingRequests}</Text>
                      </View>
                    </View>
                    <Text style={styles.widgetText}>
                      Vous avez {pendingRequests} demande{pendingRequests > 1 ? 's' : ''} en attente de validation
                    </Text>
                    <TouchableOpacity style={styles.widgetButton}>
                      <Text style={styles.widgetButtonText}>Voir les demandes →</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Daily Summary Widget with clickable links */}
                <View style={styles.widget}>
                  <Text style={styles.widgetTitle}>📊 Résumé du jour</Text>
                  <View style={styles.summaryGrid}>
                    <TouchableOpacity style={styles.summaryItem}>
                      <Text style={styles.summaryNumber}>{todayEvents}</Text>
                      <Text style={styles.summaryLabel}>Événements</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.summaryItem}>
                      <Text style={styles.summaryNumber}>{pendingTasks}</Text>
                      <Text style={styles.summaryLabel}>Tâches</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.summaryItem}>
                      <Text style={styles.summaryNumber}>{unreadMessages}</Text>
                      <Text style={styles.summaryLabel}>Messages</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Today's Events */}
                {todayEventsList.length > 0 && (
                  <View style={styles.widget}>
                    <Text style={styles.widgetTitle}>📅 Événements du jour</Text>
                    {todayEventsList.map((event) => (
                      <View key={event.id} style={styles.eventItem}>
                        <View style={styles.eventInfo}>
                          <Text style={styles.eventTitle}>{event.title}</Text>
                          <Text style={styles.eventTime}>
                            {format(new Date(event.startDate), 'HH:mm', { locale: fr })}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Upcoming Birthdays Widget (max 3) */}
                {upcomingBirthdays.length > 0 && (
                  <View style={styles.widget}>
                    <Text style={styles.widgetTitle}>🎂 Prochains anniversaires</Text>
                    {upcomingBirthdays.map((member) => (
                      <View key={member.id} style={styles.birthdayItem}>
                        <View style={styles.birthdayAvatar}>
                          <Text style={styles.birthdayAvatarText}>{member.name.charAt(0)}</Text>
                        </View>
                        <View style={styles.birthdayInfo}>
                          <Text style={styles.birthdayName}>{member.name}</Text>
                          <Text style={styles.birthdayDate}>
                            {member.daysUntil === 0 ? "Aujourd'hui ! 🎉" : 
                             member.daysUntil === 1 ? "Demain" :
                             `Dans ${member.daysUntil} jours`}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  content: {
    flex: 1,
  },
  titleContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
  },
  noFamilyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noFamilyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  noFamilyText: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  createFamilyButton: {
    backgroundColor: '#7c3aed',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  createFamilyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  widget: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  widgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  widgetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  widgetText: {
    fontSize: 15,
    color: '#6b7280',
    marginBottom: 12,
  },
  widgetButton: {
    backgroundColor: '#f3e8ff',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  widgetButtonText: {
    color: '#7c3aed',
    fontSize: 15,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    padding: 12,
  },
  summaryNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#7c3aed',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 14,
    color: '#6b7280',
  },
  birthdayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  birthdayAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  birthdayAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  birthdayInfo: {
    flex: 1,
  },
  birthdayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  birthdayDate: {
    fontSize: 14,
    color: '#6b7280',
  },
});
