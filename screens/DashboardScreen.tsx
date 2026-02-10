import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { trpc } from '../lib/trpc';
import PageHeaderWithArrows from '../components/PageHeaderWithArrows';
import { useState, useMemo } from 'react';
import { format, subDays, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LineChart } from 'react-native-chart-kit';

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
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);

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
    });
  }, [events]);

  const upcomingEvents = useMemo(() => {
    const today = new Date();
    return events
      .filter(e => new Date(e.startDate) >= today)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 5);
  }, [events]);

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

  // Calculate trend data (last 7 days)
  const trendData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      const dateStr = startOfDay(date).toDateString();
      
      const tasksCount = tasks.filter(t => {
        if (!t.dueDate) return false;
        return new Date(t.dueDate).toDateString() === dateStr;
      }).length;
      
      return tasksCount;
    });
    
    return last7Days;
  }, [tasks]);

  const isLoading = tasksLoading || eventsLoading || messagesLoading;

  // Favorites (5 buttons with icon + text)
  const defaultFavorites = [
    { id: '1', label: 'Calendrier', icon: 'calendar', pageIndex: 1 },
    { id: '2', label: 'Notes', icon: 'document-text', pageIndex: 6 },
    { id: '3', label: 'Récompenses', icon: 'gift', pageIndex: 8 },
    { id: '4', label: 'Messages', icon: 'chatbubbles', pageIndex: 4 },
    { id: '5', label: 'Tâches', icon: 'checkmark-circle', pageIndex: 2 },
  ];

  const handleFavoritePress = (pageIndex: number) => {
    if (onNavigate) {
      onNavigate(pageIndex);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header with Arrows */}
      <PageHeaderWithArrows 
        title="Accueil"
        onPrevious={onPrevious}
        onNext={onNext}
      />

      {/* Favorites Bar - Buttons with icon + text */}
      <View style={styles.favoritesContainer}>
        <View style={styles.favoritesHeader}>
          <Ionicons name="star" size={16} color="#eab308" />
        </View>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.favoritesRow}
        >
          {defaultFavorites.map((favorite) => (
            <TouchableOpacity
              key={favorite.id}
              style={styles.favoriteButton}
              onPress={() => handleFavoritePress(favorite.pageIndex)}
              activeOpacity={0.7}
            >
              <Text style={styles.favoriteIcon}>{favorite.icon === 'calendar' ? '📅' : 
                favorite.icon === 'document-text' ? '📝' :
                favorite.icon === 'gift' ? '🎁' :
                favorite.icon === 'chatbubbles' ? '💬' : '✅'}</Text>
              <Text style={styles.favoriteText}>{favorite.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.favoriteButtonAdd}
            onPress={() => setShowFavoritesModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={20} color="#7c3aed" />
          </TouchableOpacity>
        </ScrollView>
      </View>
      
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
                    <Text style={styles.widgetTitle}>📊 Résumé du jour</Text>
                    <TouchableOpacity style={styles.filtersButton}>
                      <Ionicons name="filter" size={16} color="#6b7280" />
                      <Text style={styles.filtersText}>Filtres</Text>
                    </TouchableOpacity>
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

                  {/* Trend Chart */}
                  <View style={styles.chartContainer}>
                    <Text style={styles.chartTitle}>Tendance (7 derniers jours)</Text>
                    <LineChart
                      data={{
                        labels: ['L', 'M', 'M', 'J', 'V', 'S', 'D'],
                        datasets: [{ data: trendData.length > 0 ? trendData : [0, 0, 0, 0, 0, 0, 0] }]
                      }}
                      width={Dimensions.get('window').width - 80}
                      height={120}
                      chartConfig={{
                        backgroundColor: '#ffffff',
                        backgroundGradientFrom: '#ffffff',
                        backgroundGradientTo: '#ffffff',
                        decimalPlaces: 0,
                        color: (opacity = 1) => `rgba(124, 58, 237, ${opacity})`,
                        labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                        style: { borderRadius: 8 },
                        propsForDots: {
                          r: '4',
                          strokeWidth: '2',
                          stroke: '#7c3aed'
                        }
                      }}
                      bezier
                      style={styles.chart}
                    />
                  </View>

                  {/* Green Card: Tasks to do today */}
                  <TouchableOpacity 
                    style={styles.taskCard}
                    onPress={() => onNavigate && onNavigate(2)}
                  >
                    <View style={styles.taskCardContent}>
                      <View style={styles.taskCardIcon}>
                        <Ionicons name="checkmark-circle" size={32} color="#ffffff" />
                      </View>
                      <View style={styles.taskCardInfo}>
                        <Text style={styles.taskCardTitle}>Tâches à faire aujourd'hui</Text>
                        <Text style={styles.taskCardCount}>{pendingTasks}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={24} color="#ffffff" />
                    </View>
                  </TouchableOpacity>

                  {/* Upcoming Events Section */}
                  <View style={styles.eventsSection}>
                    <View style={styles.eventsSectionHeader}>
                      <Ionicons name="calendar" size={20} color="#6b7280" />
                      <Text style={styles.eventsSectionTitle}>Événements à venir</Text>
                    </View>
                    {upcomingEvents.length > 0 ? (
                      upcomingEvents.map((event) => (
                        <View key={event.id} style={styles.eventItem}>
                          <Text style={styles.eventTitle}>{event.title}</Text>
                          <Text style={styles.eventTime}>
                            {format(new Date(event.startDate), 'dd MMM HH:mm', { locale: fr })}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.noEventsText}>Aucun événement pour cette date</Text>
                    )}
                  </View>

                  {/* Blue Card: Unread Messages */}
                  <TouchableOpacity 
                    style={styles.messageCard}
                    onPress={() => onNavigate && onNavigate(4)}
                  >
                    <View style={styles.messageCardContent}>
                      <View style={styles.messageCardIcon}>
                        <Ionicons name="chatbubbles" size={32} color="#ffffff" />
                      </View>
                      <View style={styles.messageCardInfo}>
                        <Text style={styles.messageCardTitle}>Messages non lus</Text>
                        <Text style={styles.messageCardCount}>{unreadMessages}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={24} color="#ffffff" />
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Upcoming Birthdays Widget */}
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
                        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
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
  favoritesContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  favoritesHeader: {
    marginBottom: 8,
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
  filtersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
  },
  filtersText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
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
  chartContainer: {
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
  },
  chart: {
    borderRadius: 8,
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
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
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
