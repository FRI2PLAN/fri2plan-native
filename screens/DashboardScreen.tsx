import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { trpc } from '../lib/trpc';
import PageHeaderWithArrows from '../components/PageHeaderWithArrows';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DashboardScreenProps {
  onLogout: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onNavigate?: (pageIndex: number) => void;
}

export default function DashboardScreen({ onLogout, onPrevious, onNext, onNavigate }: DashboardScreenProps) {
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

  // Get today's events (max 3 for display)
  const todayEventsList = useMemo(() => {
    const today = new Date().toDateString();
    return events
      .filter(e => {
        const eventDate = new Date(e.startDate).toDateString();
        return eventDate === today;
      })
      .slice(0, 3); // Max 3 events
  }, [events]);

  const isLoading = tasksLoading || eventsLoading || messagesLoading;

  // Default favorites (5 icons, no text)
  const defaultFavorites = [
    { id: '1', icon: 'calendar', pageIndex: 1 },
    { id: '2', icon: 'checkmark-circle', pageIndex: 2 },
    { id: '3', icon: 'cart', pageIndex: 3 },
    { id: '4', icon: 'chatbubbles', pageIndex: 4 },
    { id: '5', icon: 'document-text', pageIndex: 6 }, // Notes
  ];

  const handleFavoritePress = (pageIndex: number) => {
    if (onNavigate) {
      onNavigate(pageIndex);
    }
  };

  const handleFavoriteLongPress = (favoriteId: string) => {
    // TODO: Implement favorite management modal
    console.log('Long press on favorite:', favoriteId);
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

      {/* Favorites Bar - 5 icons without text */}
      <View style={styles.favoritesContainer}>
        <Text style={styles.favoritesTitle}>Favoris</Text>
        <View style={styles.favoritesRow}>
          {defaultFavorites.map((favorite) => (
            <TouchableOpacity
              key={favorite.id}
              style={styles.favoriteIcon}
              onPress={() => handleFavoritePress(favorite.pageIndex)}
              onLongPress={() => handleFavoriteLongPress(favorite.id)}
              activeOpacity={0.7}
            >
              <Ionicons name={favorite.icon as any} size={32} color="#7c3aed" />
            </TouchableOpacity>
          ))}
        </View>
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
                    <TouchableOpacity 
                      style={styles.widgetButton}
                      onPress={() => onNavigate && onNavigate(5)} // Page Demandes
                    >
                      <Text style={styles.widgetButtonText}>Voir les demandes →</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Daily Summary Widget with clickable links */}
                <View style={styles.summaryWidget}>
                  <Text style={styles.widgetTitle}>📊 Résumé du jour</Text>
                  <View style={styles.summaryGrid}>
                    <TouchableOpacity 
                      style={styles.summaryItem}
                      onPress={() => onNavigate && onNavigate(1)} // Page Calendrier
                    >
                      <Text style={styles.summaryNumber}>{todayEvents}</Text>
                      <Text style={styles.summaryLabel}>Événements</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.summaryItem}
                      onPress={() => onNavigate && onNavigate(2)} // Page Tâches
                    >
                      <Text style={styles.summaryNumber}>{pendingTasks}</Text>
                      <Text style={styles.summaryLabel}>Tâches</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.summaryItem}
                      onPress={() => onNavigate && onNavigate(4)} // Page Messages
                    >
                      <Text style={styles.summaryNumber}>{unreadMessages}</Text>
                      <Text style={styles.summaryLabel}>Messages</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Today's Events (max 3) */}
                <View style={styles.widget}>
                  <Text style={styles.widgetTitle}>📅 Événements du jour</Text>
                  {todayEventsList.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {todayEventsList.map((event) => (
                        <View key={event.id} style={styles.eventCard}>
                          <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
                          <Text style={styles.eventTime}>
                            {format(new Date(event.startDate), 'HH:mm', { locale: fr })}
                          </Text>
                        </View>
                      ))}
                    </ScrollView>
                  ) : (
                    <View style={styles.placeholderContainer}>
                      <Text style={styles.placeholderEmoji}>☀️</Text>
                      <Text style={styles.placeholderText}>
                        Profitez d'un jour de repos bien mérité ! 😌
                      </Text>
                    </View>
                  )}
                </View>

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
  favoritesContainer: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  favoritesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  favoritesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  favoriteIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
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
  summaryWidget: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    marginHorizontal: 16,
    marginTop: 8,
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
    paddingVertical: 8,
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
    fontSize: 13,
    color: '#6b7280',
  },
  eventCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    minWidth: 150,
    maxWidth: 200,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 6,
  },
  eventTime: {
    fontSize: 13,
    color: '#7c3aed',
    fontWeight: '500',
  },
  placeholderContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  placeholderEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  placeholderText: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
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
