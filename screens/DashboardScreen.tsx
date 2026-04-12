import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { DashboardSkeleton } from '../components/SkeletonLoader';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { trpc } from '../lib/trpc';
import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import FavoritesBar from '../components/FavoritesBar';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface DashboardScreenProps {
  onLogout: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onNavigate?: (pageIndex: number) => void;
}

export default function DashboardScreen({ onLogout, onPrevious, onNext, onNavigate }: DashboardScreenProps) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { isDark } = useTheme();
  const styles = getStyles(isDark);
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
        return { ...m, upcomingBirthday, daysUntil };
      })
      .filter(m => m.upcomingBirthday <= nextMonth)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 3);
  }, [familyMembers]);

  const isLoading = tasksLoading || eventsLoading || messagesLoading;

  // Favorites (5 buttons with icon only) - persisted in AsyncStorage
  const DEFAULT_FAVORITES = [
    { id: 'calendar', name: t('navigation.calendar'), icon: '📅', pageIndex: 1 },
    { id: 'notes', name: t('navigation.notes'), icon: '📝', pageIndex: 6 },
    { id: 'rewards', name: t('navigation.rewards'), icon: '🎁', pageIndex: 8 },
  ];
  const [favorites, setFavorites] = useState(DEFAULT_FAVORITES);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);

  // Load favorites from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem('dashboard_favorites').then((stored) => {
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setFavorites(parsed);
          }
        } catch {}
      }
      setFavoritesLoaded(true);
    });
  }, []);

  // Save favorites to AsyncStorage whenever they change (after initial load)
  useEffect(() => {
    if (favoritesLoaded) {
      AsyncStorage.setItem('dashboard_favorites', JSON.stringify(favorites));
    }
  }, [favorites, favoritesLoaded]);

  // All available pages for favorites selection
  const allPages = [
    { id: 'dashboard', name: t('navigation.home'), icon: '🏠', pageIndex: 0 },
    { id: 'calendar', name: t('navigation.calendar'), icon: '📅', pageIndex: 1 },
    { id: 'tasks', name: t('navigation.tasks'), icon: '✅', pageIndex: 2 },
    { id: 'shopping', name: t('navigation.shopping'), icon: '🛒', pageIndex: 3 },
    { id: 'messages', name: t('navigation.messages'), icon: '💬', pageIndex: 4 },
    { id: 'requests', name: t('navigation.requests'), icon: '🙏', pageIndex: 5 },
    { id: 'notes', name: t('navigation.notes'), icon: '📝', pageIndex: 6 },
    { id: 'budget', name: t('navigation.budget'), icon: '💰', pageIndex: 7 },
    { id: 'rewards', name: t('navigation.rewards'), icon: '🎁', pageIndex: 8 },
    { id: 'calendrier-intime', name: t('navigation.intimateCalendar'), icon: '🌸', pageIndex: 9 },
    { id: 'circles', name: t('navigation.circles'), icon: '👥', pageIndex: 10 },
    { id: 'referral', name: t('navigation.referral'), icon: '🎯', pageIndex: 11 },
    { id: 'settings', name: t('navigation.settings'), icon: '⚙️', pageIndex: 12 },
    { id: 'help', name: t('navigation.help'), icon: '❓', pageIndex: 13 },
  ];

  const handleFavoritePress = (pageIndex: number) => {
    if (onNavigate) onNavigate(pageIndex);
  };

  const handleFavoriteSelect = (favoriteId: string) => {
    const isAlreadyFavorite = favorites.some(f => f.id === favoriteId);
    if (isAlreadyFavorite) {
      setFavorites(favorites.filter(f => f.id !== favoriteId));
    } else {
      if (favorites.length < 5) {
        const page = allPages.find(p => p.id === favoriteId);
        if (page) setFavorites([...favorites, page]);
      }
    }
  };

  const handleEventPress = (event: any) => {
    if (onNavigate) onNavigate(1);
  };

  const handleBirthdayPress = (birthday: any) => {
    if (onNavigate) onNavigate(1);
  };

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      {/* Page Title */}
      <View style={styles.pageTitleContainer}>
        <Text style={styles.pageTitle}>{t('dashboard.title')}</Text>
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
            <Text style={styles.noFamilyTitle}>{t('dashboard.welcome')} 🎉</Text>
            <Text style={styles.noFamilyText}>
              {t('dashboard.noFamilyText')}
            </Text>
            <TouchableOpacity style={styles.createFamilyButton}>
              <Text style={styles.createFamilyButtonText}>{t('dashboard.createFamily')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {isLoading ? (
              <DashboardSkeleton />
            ) : (
              <>
                {/* Daily Summary Widget */}
                <View style={styles.summaryWidget}>
                  <View style={styles.summaryHeader}>
                    <Text style={styles.widgetTitle}>{t('dashboard.summary')}</Text>
                  </View>

                  {/* Day/Week Tabs */}
                  <View style={styles.tabsContainer}>
                    <TouchableOpacity
                      style={[styles.tab, viewMode === 'day' && styles.tabActive]}
                      onPress={() => setViewMode('day')}
                    >
                      <Text style={[styles.tabText, viewMode === 'day' && styles.tabTextActive]}>
                        {t('dashboard.day')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.tab, viewMode === 'week' && styles.tabActive]}
                      onPress={() => setViewMode('week')}
                    >
                      <Text style={[styles.tabText, viewMode === 'week' && styles.tabTextActive]}>
                        {t('dashboard.week')}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Widgets Tâches et Messages côte à côte */}
                  <View style={styles.widgetsRow}>
                    {/* Widget Tâches */}
                    <TouchableOpacity 
                      style={[styles.compactWidget, styles.taskWidget]}
                      onPress={() => onNavigate && onNavigate(2)}
                    >
                      <Text style={{ fontSize: 28 }}>✅</Text>
                      <Text style={styles.compactWidgetCount}>{pendingTasks}</Text>
                      <Text style={styles.compactWidgetTitle}>{t('dashboard.tasksTodo')}</Text>
                    </TouchableOpacity>

                    {/* Widget Messages */}
                    <TouchableOpacity 
                      style={[styles.compactWidget, styles.messageWidget]}
                      onPress={() => onNavigate && onNavigate(4)}
                    >
                      <Text style={{ fontSize: 28 }}>💬</Text>
                      <Text style={styles.compactWidgetCount}>{unreadMessages}</Text>
                      <Text style={styles.compactWidgetTitle}>{t('dashboard.unreadMessages')}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Events Section */}
                  <View style={styles.eventsSection}>
                    <View style={styles.eventsSectionHeader}>
                      <Text style={{ fontSize: 16 }}>📅</Text>
                      <Text style={styles.eventsSectionTitle}>
                        {viewMode === 'day' ? t('dashboard.eventsToday') : t('dashboard.eventsThisWeek')}
                      </Text>
                    </View>
                    {filteredEvents.length === 0 ? (
                      <Text style={styles.noEventsText}>{t('dashboard.noEvents')}</Text>
                    ) : (
                      filteredEvents.map(event => (
                        <TouchableOpacity key={event.id} style={styles.eventItem} onPress={() => handleEventPress(event)}>
                          <View style={styles.eventContent}>
                            <Text style={styles.eventTitle}>{event.title}</Text>
                            <Text style={styles.eventTime}>
                              {format(new Date(event.startDate), viewMode === 'week' ? 'EEE d MMM · HH:mm' : 'HH:mm', { locale: fr })}
                            </Text>
                          </View>
                          <View style={[styles.eventDot, { backgroundColor: event.color || '#7c3aed' }]} />
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                </View>

                {/* Anniversaires */}
                {upcomingBirthdays.length > 0 && (
                  <View style={styles.widget}>
                    <Text style={styles.widgetTitle}>{t('dashboard.upcomingBirthdays')}</Text>
                    {upcomingBirthdays.map(member => (
                      <TouchableOpacity key={member.id} style={styles.birthdayItem} onPress={() => handleBirthdayPress(member)}>
                        <View style={[styles.birthdayAvatar, { backgroundColor: member.userColor || '#7c3aed' }]}>
                          <Text style={styles.birthdayAvatarText}>
                            {(member.name || '?').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.birthdayInfo}>
                          <Text style={styles.birthdayName}>{member.name}</Text>
                          <Text style={styles.birthdayDate}>
                            {member.daysUntil === 0
                              ? t('dashboard.today')
                              : member.daysUntil === 1
                              ? t('dashboard.tomorrow')
                              : `${t('dashboard.inDays', { count: member.daysUntil })}`}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 20 }}>🎂</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {upcomingBirthdays.length === 0 && (
                  <View style={styles.widget}>
                    <Text style={styles.widgetTitle}>{t('dashboard.upcomingBirthdays')}</Text>
                    <Text style={styles.noEventsText}>{t('dashboard.noBirthdays')}</Text>
                  </View>
                )}
              </>
            )}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function getStyles(isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#111827' : '#f3f4f6',
    },
    pageTitleContainer: {
      backgroundColor: isDark ? '#1f2937' : '#fff',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#374151' : '#e5e7eb',
    },
    pageTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: isDark ? '#f9fafb' : '#1f2937',
      textAlign: 'center',
    },
    content: {
      flex: 1,
    },
    noFamilyCard: {
      backgroundColor: isDark ? '#1f2937' : '#fff',
      borderRadius: 12,
      padding: 24,
      margin: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    noFamilyTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: isDark ? '#f9fafb' : '#1f2937',
      marginBottom: 12,
      textAlign: 'center',
    },
    noFamilyText: {
      fontSize: 15,
      color: isDark ? '#9ca3af' : '#6b7280',
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
      color: isDark ? '#9ca3af' : '#6b7280',
    },
    summaryWidget: {
      backgroundColor: isDark ? '#1f2937' : '#fff',
      borderRadius: 12,
      padding: 16,
      marginHorizontal: 16,
      marginTop: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
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
      color: isDark ? '#f9fafb' : '#1f2937',
      marginBottom: 12,
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
      backgroundColor: isDark ? '#374151' : '#f9fafb',
      borderRadius: 8,
    },
    tabActive: {
      backgroundColor: '#7c3aed',
    },
    tabText: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#9ca3af' : '#6b7280',
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
      backgroundColor: isDark ? '#374151' : '#f9fafb',
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
      justifyContent: 'center',
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
      color: isDark ? '#9ca3af' : '#6b7280',
      marginTop: 6,
      textAlign: 'center',
    },
    compactWidgetCount: {
      fontSize: 28,
      fontWeight: 'bold',
      color: isDark ? '#f9fafb' : '#1f2937',
      marginTop: 2,
    },
    eventsSection: {
      marginBottom: 8,
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
      color: isDark ? '#f9fafb' : '#1f2937',
    },
    eventItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#374151' : '#f3f4f6',
    },
    eventContent: {
      flex: 1,
    },
    eventTitle: {
      fontSize: 14,
      fontWeight: '500',
      color: isDark ? '#f9fafb' : '#1f2937',
      marginBottom: 4,
    },
    eventTime: {
      fontSize: 13,
      color: '#7c3aed',
    },
    eventDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginLeft: 8,
    },
    noEventsText: {
      fontSize: 14,
      color: isDark ? '#6b7280' : '#9ca3af',
      fontStyle: 'italic',
      textAlign: 'center',
      paddingVertical: 12,
    },
    widget: {
      backgroundColor: isDark ? '#1f2937' : '#fff',
      borderRadius: 12,
      padding: 16,
      marginHorizontal: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    birthdayItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#374151' : '#f3f4f6',
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
      color: isDark ? '#f9fafb' : '#1f2937',
      marginBottom: 4,
    },
    birthdayDate: {
      fontSize: 14,
      color: isDark ? '#9ca3af' : '#6b7280',
    },
  });
}
