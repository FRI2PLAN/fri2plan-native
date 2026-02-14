import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { trpc } from '../lib/trpc';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import FavoritesBar from '../components/FavoritesBar';

interface DashboardScreenProps {
  onLogout: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onNavigate?: (pageIndex: number) => void;
}

export default function DashboardScreen({ onLogout, onPrevious, onNext, onNavigate }: DashboardScreenProps) {
  const { user, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');

  // Fetch active family
  const { data: families } = trpc.family.list.useQuery();
  const activeFamily = families?.[0];

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
  const pendingTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return tasks.filter(t => {
      if (t.status === 'completed') return false;
      if (!t.dueDate) return false;
      const dueDate = new Date(t.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate.getTime() === today.getTime();
    }).length;
  }, [tasks]);

  // Calculate tasks by priority (all non-completed tasks)
  const tasksByPriority = useMemo(() => {
    const nonCompletedTasks = tasks.filter(t => t.status !== 'completed');
    return {
      total: nonCompletedTasks.length,
      urgent: nonCompletedTasks.filter(t => t.priority === 'urgent').length,
      high: nonCompletedTasks.filter(t => t.priority === 'high').length,
      medium: nonCompletedTasks.filter(t => t.priority === 'medium').length,
      low: nonCompletedTasks.filter(t => t.priority === 'low').length,
    };
  }, [tasks]);

  const todayEvents = useMemo(() => {
    const today = new Date().toDateString();
    return events.filter(e => {
      const eventDate = new Date(e.startDate).toDateString();
      return eventDate === today;
    });
  }, [events]);

  // Events filtered by view mode (day or week)
  const filteredEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (viewMode === 'day') {
      // Show today's events only
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return events
        .filter(e => {
          const eventDate = new Date(e.startDate);
          return eventDate >= today && eventDate < tomorrow;
        })
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
        .slice(0, 3);
    } else {
      // Show this week's events (Monday to Sunday)
      const dayOfWeek = today.getDay();
      const monday = new Date(today);
      monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      monday.setHours(0, 0, 0, 0);
      
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 7);
      
      return events
        .filter(e => {
          const eventDate = new Date(e.startDate);
          return eventDate >= monday && eventDate < sunday;
        })
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
        .slice(0, 3);
    }
  }, [events, viewMode]);

  const unreadMessages = useMemo(() => {
    return messages.filter(m => 'isRead' in m && m.isRead === 0).length;
  }, [messages]);

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
      .slice(0, 3);
  }, [familyMembers]);

  const isLoading = tasksLoading || eventsLoading || messagesLoading;

  // Favorites (5 buttons with icon only)
  const [favorites, setFavorites] = useState([
    { id: 'calendar', name: 'Calendrier', icon: '📅', pageIndex: 1 },
    { id: 'notes', name: 'Notes', icon: '📝', pageIndex: 6 },
    { id: 'rewards', name: 'Récompenses', icon: '🎁', pageIndex: 8 },
  ]);

  // All available pages for favorites selection
  const allPages = [
    { id: 'dashboard', name: 'Accueil', icon: '🏠', pageIndex: 0 },
    { id: 'calendar', name: 'Calendrier', icon: '📅', pageIndex: 1 },
    { id: 'tasks', name: 'Tâches', icon: '✅', pageIndex: 2 },
    { id: 'shopping', name: 'Courses', icon: '🛒', pageIndex: 3 },
    { id: 'messages', name: 'Messages', icon: '💬', pageIndex: 4 },
    { id: 'requests', name: 'Demandes', icon: '🙏', pageIndex: 5 },
    { id: 'notes', name: 'Notes', icon: '📝', pageIndex: 6 },
    { id: 'budget', name: 'Budget', icon: '💰', pageIndex: 7 },
    { id: 'rewards', name: 'Récompenses', icon: '🎁', pageIndex: 8 },
    { id: 'circles', name: 'Cercles', icon: '👥', pageIndex: 9 },
    { id: 'referral', name: 'Parrainer', icon: '🎯', pageIndex: 10 },
    { id: 'settings', name: 'Paramètres', icon: '⚙️', pageIndex: 11 },
    { id: 'help', name: 'Aide', icon: '❓', pageIndex: 12 },
  ];

  const handleFavoritePress = (pageIndex: number) => {
    if (onNavigate) {
      onNavigate(pageIndex);
    }
  };

  const handleFavoriteSelect = (favoriteId: string) => {
    // Toggle favorite
    const isAlreadyFavorite = favorites.some(f => f.id === favoriteId);
    if (isAlreadyFavorite) {
      // Remove from favorites
      setFavorites(favorites.filter(f => f.id !== favoriteId));
    } else {
      // Add to favorites (max 5)
      if (favorites.length < 5) {
        const page = allPages.find(p => p.id === favoriteId);
        if (page) {
          setFavorites([...favorites, page]);
        }
      }
    }
  };

  const handleEventPress = (event: any) => {
    // Navigate to Calendar with the event's date
    if (onNavigate) {
      onNavigate(1); // Calendar is at index 1
    }
  };

  const handleBirthdayPress = (birthday: any) => {
    // Navigate to Calendar with the birthday's date
    if (onNavigate) {
      onNavigate(1); // Calendar is at index 1
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Page Title */}
      <View style={styles.pageTitleContainer}>
        <Text style={styles.pageTitle}>Accueil</Text>
      </View>

      {/* Favorites Bar */}
      <FavoritesBar
        favorites={favorites}
        onFavoritePress={handleFavoritePress}
        onFavoriteSelect={handleFavoriteSelect}
        allPages={allPages}
      />
      
      {/* Content */}
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7c3aed']} />
        }
      >

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
                {/* Daily Summary Widget */}
                <View style={styles.summaryWidget}>
                  <View style={styles.summaryHeader}>
                    <Text style={styles.widgetTitle}>📊 Résumé</Text>
                  </View>

                  {/* Day/Week Tabs */}
                  <View style={styles.tabsContainer}>
                    <TouchableOpacity
                      style={[styles.tab, viewMode === 'day' && styles.tabActive]}
                      onPress={() => setViewMode('day')}
                    >
                      <Text style={[styles.tabText, viewMode === 'day' && styles.tabTextActive]}>
                        Jour
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.tab, viewMode === 'week' && styles.tabActive]}
                      onPress={() => setViewMode('week')}
                    >
                      <Text style={[styles.tabText, viewMode === 'week' && styles.tabTextActive]}>
                        Semaine
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Widgets Tâches et Messages côte à côte */}
                  <View style={styles.widgetsRow}>
                    {/* Widget Tâches */}
                    <TouchableOpacity 
                      style={[styles.compactWidget, styles.taskWidget]}
                      onPress={() => onNavigate && onNavigate(2)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                      <Text style={styles.compactWidgetTitle}>Tâches ({tasksByPriority.total})</Text>
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                        <Text style={{ fontSize: 12, color: '#6b7280' }}>
                          🔴 {tasksByPriority.urgent}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#6b7280' }}>
                          🟠 {tasksByPriority.high}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#6b7280' }}>
                          🟡 {tasksByPriority.medium}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#6b7280' }}>
                          🟢 {tasksByPriority.low}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* Widget Messages */}
                    <TouchableOpacity 
                      style={[styles.compactWidget, styles.messageWidget]}
                      onPress={() => onNavigate && onNavigate(4)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="chatbubbles" size={24} color="#3b82f6" />
                      <Text style={styles.compactWidgetTitle}>Messages non lus</Text>
                      <Text style={styles.compactWidgetCount}>{unreadMessages}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Upcoming Events Section */}
                  <View style={styles.eventsSection}>
                    <View style={styles.eventsSectionHeader}>
                      <Ionicons name="calendar" size={20} color="#6b7280" />
                      <Text style={styles.eventsSectionTitle}>Événements</Text>
                    </View>
                    {filteredEvents.length > 0 ? (
                      filteredEvents.map((event) => (
                        <TouchableOpacity 
                          key={event.id} 
                          style={styles.eventItem}
                          onPress={() => handleEventPress(event)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.eventContent}>
                            <Text style={styles.eventTitle}>{event.title}</Text>
                            <Text style={styles.eventTime}>
                              {format(new Date(event.startDate), 'dd MMM HH:mm', { locale: fr })}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                        </TouchableOpacity>
                      ))
                    ) : (
                      <Text style={styles.noEventsText}>Aucun événement pour cette date</Text>
                    )}
                  </View>


                </View>

                {/* Upcoming Birthdays Widget */}
                <View style={styles.widget}>
                  <Text style={styles.widgetTitle}>🎂 Prochains anniversaires</Text>
                  {upcomingBirthdays.length > 0 ? (
                    upcomingBirthdays.map((member) => (
                      <TouchableOpacity 
                        key={member.id} 
                        style={styles.birthdayItem}
                        onPress={() => handleBirthdayPress(member)}
                        activeOpacity={0.7}
                      >
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
                        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={styles.noEventsText}>Aucun anniversaire à venir ce mois-ci</Text>
                  )}
                </View>
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
  pageTitleContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
  },
  favoritesContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  favoritesHeader: {
    marginBottom: 6,
  },
  favoritesRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  favoriteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  favoriteIcon: {
    fontSize: 18,
  },
  favoriteText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1f2937',
  },
  favoriteButtonAdd: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
  },
  content: {
    flex: 1,
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
  summaryWidget: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  widgetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#7c3aed',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  widgetsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  compactWidget: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 100,
  },
  taskWidget: {
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  messageWidget: {
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  compactWidgetTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 6,
    textAlign: 'center',
  },
  compactWidgetCount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 2,
  },
  taskCard: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  taskCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskCardIcon: {
    marginRight: 12,
  },
  taskCardInfo: {
    flex: 1,
  },
  taskCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  taskCardCount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  eventsSection: {
    marginBottom: 16,
  },
  eventsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  eventsSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 13,
    color: '#7c3aed',
  },
  noEventsText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  messageCard: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
  },
  messageCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageCardIcon: {
    marginRight: 12,
  },
  messageCardInfo: {
    flex: 1,
  },
  messageCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  messageCardCount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
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
  birthdayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  birthdayAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#7c3aed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  birthdayAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
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
