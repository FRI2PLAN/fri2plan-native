import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Image } from 'react-native';
import { DashboardSkeleton } from '../components/SkeletonLoader';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useFamily } from '../contexts/FamilyContext';
import { trpc } from '../lib/trpc';
import { useQueryClient } from '@tanstack/react-query';
import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import FavoritesBar from '../components/FavoritesBar';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Modal } from 'react-native';
import FamilySetupScreen from './FamilySetupScreen';

/** Parser une date locale (heure Europe/Zurich) sans ambigüité sur Android/Hermes */
function parseLocalDate(dateStr: string | undefined | null): Date {
  if (!dateStr) return new Date();
  const s = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
  const [datePart, timePart = '00:00:00'] = s.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes, seconds = 0] = timePart.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, seconds);
}

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
  const [circlePickerOpen, setCirclePickerOpen] = useState(false);
  const [showFamilySetup, setShowFamilySetup] = useState(false);
  const { activeFamilyId, setActiveFamilyId } = useFamily();
  const queryClient = useQueryClient();

  // Fetch active family
  const { data: families } = trpc.family.list.useQuery();
  // Trouver la famille active par ID (ou la première par défaut)
  const activeFamily = useMemo(() => {
    if (!families || families.length === 0) return undefined;
    if (activeFamilyId) {
      const found = families.find((f: any) => f.id === activeFamilyId);
      if (found) return found;
    }
    return families[0];
  }, [families, activeFamilyId]);

  // Sauvegarder automatiquement l'ID de la famille active dans AsyncStorage
  // pour que le header x-active-family-id soit envoyé correctement à chaque requête
  useEffect(() => {
    if (activeFamily?.id && !activeFamilyId) {
      setActiveFamilyId(activeFamily.id);
    }
  }, [activeFamily?.id, activeFamilyId]);

  // Fetch family members
  const { data: familyMembers = [] } = trpc.family.members.useQuery(
    { familyId: activeFamily?.id || 0 },
    { enabled: !!activeFamily }
  );

  // Fetch dashboard data
  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = trpc.tasks.list.useQuery();
  const { data: rawEvents = [], isLoading: eventsLoading, refetch: refetchEvents } = trpc.events.list.useQuery(
    undefined,
    { enabled: !!activeFamily }
  );
  // Normaliser les dates : le serveur stocke les dates en heure locale (Europe/Zurich)
  // NE PAS ajouter 'Z' (qui forcerait une interprétation UTC et décalerait de +2h)
  const normalizeDate = (d: any): string => {
    if (!d) return '';
    if (typeof d === 'string') {
      // String SQL "2026-04-16 08:00:00" → remplacer espace par T, sans ajouter Z
      if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.includes('T') ? d : d.replace(' ', 'T');
      return d;
    }
    // Objet Date JS ou timestamp (déjà en heure locale)
    return new Date(d).toISOString().replace('Z', '');
  };
  const events = (rawEvents as any[]).map((e: any) => ({
    ...e,
    startDate: normalizeDate(e.startDate),
    endDate: normalizeDate(e.endDate),
  }));
  const { data: messagesData, isLoading: messagesLoading, refetch: refetchMessages } = trpc.messages.list.useQuery(
    { familyId: activeFamily?.id || 0, limit: 50, offset: 0 },
    { enabled: !!activeFamily }
  );
  const messages = messagesData?.messages || [];

  // Repas du jour
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const { data: todayMeals = [], refetch: refetchMeals } = trpc.meals.list.useQuery(
    { familyId: activeFamily?.id || 0, startDate: todayStr + 'T00:00:00', endDate: todayStr + 'T23:59:59' },
    { enabled: !!activeFamily }
  );

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
      refetchMeals(),
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
      const dueDate = parseLocalDate(t.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate.getTime() === today.getTime();
    }).length;
  }, [tasks]);

  const todayEvents = useMemo(() => {
    // Inclure TOUS les événements du jour (passés et à venir)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    return events.filter(e => {
      const eventDate = parseLocalDate(e.startDate);
      return eventDate >= todayStart && eventDate <= todayEnd;
    });
  }, [events]);

  // Events filtered by view mode (day or week)
  const filteredEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (viewMode === 'day') {
      // Vue Jour : événements d'aujourd'hui uniquement (pas les passés)
      const now = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return events
        .filter(e => {
          const eventDate = parseLocalDate(e.startDate);
          return eventDate >= now && eventDate < tomorrow;
        })
        .sort((a, b) => parseLocalDate(a.startDate).getTime() - parseLocalDate(b.startDate).getTime())
        .slice(0, 3);
    } else {
      // Vue Semaine : aujourd'hui + 7 jours (semaine coulante), sans passés, max 3
      const now = new Date();
      const in7days = new Date(today);
      in7days.setDate(today.getDate() + 7);
      in7days.setHours(23, 59, 59, 999);
      return events
        .filter(e => {
          const eventDate = parseLocalDate(e.startDate);
          return eventDate >= now && eventDate <= in7days;
        })
        .sort((a, b) => parseLocalDate(a.startDate).getTime() - parseLocalDate(b.startDate).getTime())
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
    { id: 'notes', name: t('navigation.notes'), icon: '📝', pageIndex: 7 },
    { id: 'rewards', name: t('navigation.rewards'), icon: '🎁', pageIndex: 9 },
  ];
  const [favorites, setFavorites] = useState(DEFAULT_FAVORITES);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);
  // Clé isolée par famille pour éviter le partage des raccourcis entre cercles
  const favoritesKey = activeFamilyId ? `dashboard_favorites_${activeFamilyId}` : 'dashboard_favorites';

  // Load favorites from AsyncStorage (réinitialise quand la famille change)
  useEffect(() => {
    setFavoritesLoaded(false);
    AsyncStorage.getItem(favoritesKey).then((stored) => {
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setFavorites(parsed);
          } else {
            setFavorites(DEFAULT_FAVORITES);
          }
        } catch {
          setFavorites(DEFAULT_FAVORITES);
        }
      } else {
        setFavorites(DEFAULT_FAVORITES);
      }
      setFavoritesLoaded(true);
    });
  }, [favoritesKey]);

  // Save favorites to AsyncStorage whenever they change (after initial load)
  useEffect(() => {
    if (favoritesLoaded) {
      AsyncStorage.setItem(favoritesKey, JSON.stringify(favorites));
    }
  }, [favorites, favoritesLoaded, favoritesKey]);

  // All available pages for favorites selection
  const allPages = [
    { id: 'dashboard', name: t('navigation.home'), icon: '🏠', pageIndex: 0 },
    { id: 'calendar', name: t('navigation.calendar'), icon: '📅', pageIndex: 1 },
    { id: 'tasks', name: t('navigation.tasks'), icon: '✅', pageIndex: 2 },
    { id: 'shopping', name: t('navigation.shopping') || 'Courses', icon: '🛒', pageIndex: 3 },
    { id: 'meals', name: t('navigation.meals') || 'Repas', icon: '🍽️', pageIndex: 4 },
    { id: 'messages', name: t('navigation.messages'), icon: '💬', pageIndex: 5 },
    { id: 'requests', name: t('navigation.requests'), icon: '🙏', pageIndex: 6 },
    { id: 'notes', name: t('navigation.notes'), icon: '📝', pageIndex: 7 },
    { id: 'budget', name: t('navigation.budget'), icon: '💰', pageIndex: 8 },
    { id: 'rewards', name: t('navigation.rewards'), icon: '🎁', pageIndex: 9 },
    { id: 'calendrier-intime', name: t('navigation.intimateCalendar'), icon: '🌸', pageIndex: 10 },
    { id: 'circles', name: t('navigation.circles'), icon: '👥', pageIndex: 11 },
    { id: 'referral', name: t('navigation.referral'), icon: '🎯', pageIndex: 12 },
    { id: 'settings', name: t('navigation.settings'), icon: '⚙️', pageIndex: 13 },
    { id: 'help', name: t('navigation.help'), icon: '❓', pageIndex: 14 },
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
      
      {/* Page Title + sélecteur de cercle */}
      <View style={styles.pageTitleContainer}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <Text style={styles.pageTitle}>{t('dashboard.title')}</Text>
          {families && families.length > 1 && (
            <TouchableOpacity
              onPress={() => setCirclePickerOpen(true)}
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#7c3aed22', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, borderWidth: 1, borderColor: '#7c3aed55' }}
            >
              <Text style={{ fontSize: 13, color: '#7c3aed', fontWeight: '600' }}>{activeFamily?.name || '...'}</Text>
              <Text style={{ fontSize: 12, color: '#7c3aed', marginLeft: 4 }}>▼</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Modal sélecteur de cercle */}
      {circlePickerOpen && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: isDark ? '#1a1a1a' : '#fff', borderRadius: 16, padding: 20, width: '80%', maxHeight: '60%' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: isDark ? '#fff' : '#1f2937', textAlign: 'center', marginBottom: 16 }}>👥 {t('dashboard.selectCircle') || 'Choisir un cercle'}</Text>
            <ScrollView>
              {(families || []).map((fam: any) => (
                <TouchableOpacity
                  key={fam.id}
                  onPress={async () => {
                    await setActiveFamilyId(fam.id);
                    // Invalider tout le cache React Query pour forcer un rechargement avec le nouveau cercle
                    queryClient.invalidateQueries();
                    setCirclePickerOpen(false);
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, marginBottom: 8, backgroundColor: (activeFamilyId === fam.id || (!activeFamilyId && fam === families?.[0])) ? '#7c3aed22' : (isDark ? '#2a2a2a' : '#f9fafb'), borderWidth: 1, borderColor: (activeFamilyId === fam.id || (!activeFamilyId && fam === families?.[0])) ? '#7c3aed' : (isDark ? '#374151' : '#e5e7eb') }}
                >
                  <Text style={{ fontSize: 20, marginRight: 10 }}>👨‍👩‍👧</Text>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: isDark ? '#fff' : '#1f2937', flex: 1 }}>{fam.name}</Text>
                  {(activeFamilyId === fam.id || (!activeFamilyId && fam === families?.[0])) && <Text style={{ fontSize: 16, color: '#7c3aed' }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              onPress={() => setCirclePickerOpen(false)}
              style={{ marginTop: 12, alignItems: 'center', paddingVertical: 10, backgroundColor: isDark ? '#374151' : '#e5e7eb', borderRadius: 10 }}
            >
              <Text style={{ color: isDark ? '#fff' : '#374151', fontWeight: '600' }}>{t('common.close') || 'Fermer'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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
            <TouchableOpacity style={styles.createFamilyButton} onPress={() => setShowFamilySetup(true)}>
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

                  {/* Widgets Tâches et Messages ultra-compacts */}
                  <View style={[styles.widgetsRow, { marginBottom: 10 }]}>
                    {/* Widget Tâches */}
                    <TouchableOpacity
                      style={[styles.compactWidget, styles.taskWidget, { minHeight: 48, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14 }]}
                      onPress={() => onNavigate && onNavigate(2)}
                    >
                      <Text style={{ fontSize: 22 }}>✅</Text>
                      <Text style={[styles.compactWidgetCount, { fontSize: 22, marginTop: 0 }]}>{pendingTasks}</Text>
                    </TouchableOpacity>

                    {/* Widget Messages */}
                    <TouchableOpacity
                      style={[styles.compactWidget, styles.messageWidget, { minHeight: 48, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14 }]}
                      onPress={() => onNavigate && onNavigate(5)}
                    >
                      <Text style={{ fontSize: 22 }}>💬</Text>
                      <Text style={[styles.compactWidgetCount, { fontSize: 22, marginTop: 0 }]}>{unreadMessages}</Text>
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
                              {format(parseLocalDate(event.startDate), viewMode === 'week' ? 'EEE d MMM · HH:mm' : 'HH:mm', { locale: fr })}
                            </Text>
                          </View>
                          <View style={[styles.eventDot, { backgroundColor: event.color || '#7c3aed' }]} />
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                </View>

                {/* Widget Repas du jour */}
                <TouchableOpacity
                  style={styles.widget}
                  onPress={() => onNavigate && onNavigate(4)}
                  activeOpacity={0.85}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                    <Text style={{ fontSize: 18, marginRight: 8 }}>🍽️</Text>
                    <Text style={styles.widgetTitle}>{t('dashboard.todayMeals') || 'Repas du jour'}</Text>
                  </View>
                  {todayMeals.length === 0 ? (
                    <Text style={styles.noEventsText}>{t('dashboard.noMeals') || 'Aucun repas prévu aujourd\'hui'}</Text>
                  ) : (
                    todayMeals.map((meal: any) => (
                      <View key={meal.id} style={{ marginBottom: 8 }}>
                        {meal.imageUrl ? (
                          <Image
                            source={{ uri: meal.imageUrl }}
                            style={{ width: '100%', height: 100, borderRadius: 8, marginBottom: 6 }}
                            resizeMode="cover"
                          />
                        ) : null}
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={{ fontSize: 16, marginRight: 8 }}>
                            {meal.mealType === 'breakfast' ? '☀️' : meal.mealType === 'lunch' ? '🥗' : meal.mealType === 'snack' ? '🍎' : '🍽️'}
                          </Text>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? '#f9fafb' : '#1f2937' }} numberOfLines={1}>{meal.name}</Text>
                            <Text style={{ fontSize: 12, color: isDark ? '#9ca3af' : '#6b7280' }}>
                              {meal.mealType === 'breakfast' ? (t('meals.breakfast') || 'Petit-déjeuner') : meal.mealType === 'lunch' ? (t('meals.lunch') || 'Déjeuner') : meal.mealType === 'snack' ? (t('meals.snack') || 'Collation') : (t('meals.dinner') || 'Dîner')}
                              {meal.servings ? ` · ${meal.servings} pers.` : ''}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))
                  )}
                </TouchableOpacity>

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

      {/* Modal FamilySetup */}
      <Modal
        visible={showFamilySetup}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowFamilySetup(false)}
      >
        <FamilySetupScreen
          onComplete={() => {
            setShowFamilySetup(false);
            queryClient.invalidateQueries();
          }}
          onSkip={() => setShowFamilySetup(false)}
        />
      </Modal>
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
