<<<<<<< HEAD
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, RefreshControl, Modal, TextInput, Alert } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import * as DocumentPicker from 'expo-document-picker';
=======
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, TextInput, RefreshControl, Modal, FlatList } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { StatusBar } from 'expo-status-bar';
>>>>>>> 51d9a142b87538a5b43c88c4b91c1d4348b14b78
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, addDays, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameHour } from 'date-fns';
import { fr, de, enUS } from 'date-fns/locale';
import { trpc } from '../lib/trpc';

const EVENT_CATEGORIES = [
  { value: 'meal', label: 'Repas', labelEn: 'Meal', labelDe: 'Mahlzeit', icon: '🍽️', color: '#f59e0b' },
  { value: 'birthday', label: 'Anniversaire', labelEn: 'Birthday', labelDe: 'Geburtstag', icon: '🎂', color: '#ec4899' },
  { value: 'work', label: 'Travail', labelEn: 'Work', labelDe: 'Arbeit', icon: '💼', color: '#3b82f6' },
  { value: 'personal', label: 'Personnel', labelEn: 'Personal', labelDe: 'Persönlich', icon: '❤️', color: '#ef4444' },
  { value: 'sport', label: 'Sport', labelEn: 'Sport', labelDe: 'Sport', icon: '⚽', color: '#10b981' },
  { value: 'other', label: 'Autre', labelEn: 'Other', labelDe: 'Andere', icon: '📅', color: '#6b7280' },
];

const REMINDER_OPTIONS = [
  { value: '5', label: '5 minutes' },
  { value: '15', label: '15 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '60', label: '1 heure', labelEn: '1 hour', labelDe: '1 Stunde' },
  { value: '120', label: '2 heures', labelEn: '2 hours', labelDe: '2 Stunden' },
  { value: '1440', label: '1 jour', labelEn: '1 day', labelDe: '1 Tag' },
];

interface CalendarScreenProps {
  onNavigate?: (screen: string) => void;
  onPrevious?: () => void;
  onNext?: () => void;
}

export default function CalendarScreen({ onNavigate, onPrevious, onNext }: CalendarScreenProps) {
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();
  const styles = getStyles(isDark);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
<<<<<<< HEAD
  const [dropdownModalOpen, setDropdownModalOpen] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'agenda'>('month');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);

  // Load saved view mode and filters
  useEffect(() => {
    loadViewMode();
    loadFilters();
=======
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'agenda'>('month');

  // Load saved view mode
  useEffect(() => {
    loadViewMode();
>>>>>>> 51d9a142b87538a5b43c88c4b91c1d4348b14b78
  }, []);

  const loadViewMode = async () => {
    try {
      const saved = await AsyncStorage.getItem('calendar_view_mode');
      if (saved) setViewMode(saved as any);
    } catch (error) {
      console.error('Error loading view mode:', error);
    }
  };

  const saveViewMode = async (mode: 'month' | 'week' | 'day' | 'agenda') => {
    try {
      await AsyncStorage.setItem('calendar_view_mode', mode);
      setViewMode(mode);
    } catch (error) {
      console.error('Error saving view mode:', error);
    }
  };

<<<<<<< HEAD
  const loadFilters = async () => {
    try {
      const categories = await AsyncStorage.getItem('calendar_filter_categories');
      const members = await AsyncStorage.getItem('calendar_filter_members');
      if (categories) setSelectedCategories(JSON.parse(categories));
      if (members) setSelectedMembers(JSON.parse(members));
    } catch (error) {
      console.error('Error loading filters:', error);
    }
  };

  const saveFilters = async () => {
    try {
      await AsyncStorage.setItem('calendar_filter_categories', JSON.stringify(selectedCategories));
      await AsyncStorage.setItem('calendar_filter_members', JSON.stringify(selectedMembers));
    } catch (error) {
      console.error('Error saving filters:', error);
    }
  };

  const applyFilters = () => {
    saveFilters();
    setFilterModalOpen(false);
  };

  const resetFilters = () => {
    setSelectedCategories([]);
    setSelectedMembers([]);
  };

  const handleImportICS = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/calendar',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      setIsImporting(true);
      const file = result.assets[0];
      
      // Lire le contenu du fichier
      const response = await fetch(file.uri);
      const icsContent = await response.text();
      
      // Parser basique ICS (sans librairie externe)
      const events = parseICS(icsContent);
      
      // Créer les événements en base de données
      let successCount = 0;
      for (const event of events) {
        try {
          await createEvent.mutateAsync(event);
          successCount++;
        } catch (error) {
          console.error('Error creating event:', error);
        }
      }
      
      setIsImporting(false);
      setImportModalOpen(false);
      refetch();
      
      Alert.alert(
        'Import réussi',
        `${successCount} événement(s) importé(s) avec succès.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      setIsImporting(false);
      console.error('Error importing ICS:', error);
      Alert.alert(
        'Erreur',
        'Impossible d\'importer le fichier. Vérifiez qu\'il s\'agit d\'un fichier .ics valide.',
        [{ text: 'OK' }]
      );
    }
  };

  const parseICS = (icsContent: string) => {
    const events: any[] = [];
    const lines = icsContent.split('\n');
    let currentEvent: any = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line === 'BEGIN:VEVENT') {
        currentEvent = {
          title: '',
          description: '',
          startDate: new Date(),
          durationMinutes: 60,
          category: 'other',
          reminderMinutes: 15,
          isPrivate: 0,
        };
      } else if (line === 'END:VEVENT' && currentEvent) {
        events.push(currentEvent);
        currentEvent = null;
      } else if (currentEvent) {
        if (line.startsWith('SUMMARY:')) {
          currentEvent.title = line.substring(8);
        } else if (line.startsWith('DESCRIPTION:')) {
          currentEvent.description = line.substring(12);
        } else if (line.startsWith('DTSTART')) {
          const dateStr = line.split(':')[1];
          currentEvent.startDate = parseICSDate(dateStr);
        } else if (line.startsWith('DTEND')) {
          const dateStr = line.split(':')[1];
          const endDate = parseICSDate(dateStr);
          currentEvent.durationMinutes = Math.round(
            (endDate.getTime() - currentEvent.startDate.getTime()) / (1000 * 60)
          );
        }
      }
    }
    
    return events;
  };

  const parseICSDate = (dateStr: string): Date => {
    // Format: 20240212T090000Z ou 20240212T090000
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1;
    const day = parseInt(dateStr.substring(6, 8));
    const hour = parseInt(dateStr.substring(9, 11));
    const minute = parseInt(dateStr.substring(11, 13));
    
    return new Date(year, month, day, hour, minute);
  };

=======
>>>>>>> 51d9a142b87538a5b43c88c4b91c1d4348b14b78
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '09:00',
    endTime: '10:00',
    category: 'other',
    reminder: '15',
    isPrivate: false,
  });

  // Get locale
  const getLocale = () => {
    if (i18n.language === 'fr') return fr;
    if (i18n.language === 'de') return de;
    return enUS;
  };

  // Get category label
  const getCategoryLabel = (cat: any) => {
    if (i18n.language === 'de') return cat.labelDe;
    if (i18n.language === 'en') return cat.labelEn;
    return cat.label;
  };

<<<<<<< HEAD
  // Fetch events and family members
  const { data: events, isLoading, refetch } = trpc.events.list.useQuery();
  const { data: familyMembers } = trpc.family.members.useQuery();
=======
  // Fetch events
  const { data: events, isLoading, refetch } = trpc.events.list.useQuery();
>>>>>>> 51d9a142b87538a5b43c88c4b91c1d4348b14b78
  const createEvent = trpc.events.create.useMutation();
  const updateEvent = trpc.events.update.useMutation();
  const deleteEvent = trpc.events.delete.useMutation();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getEventsForDate = (date: Date) => {
    if (!events) return [];
<<<<<<< HEAD
    
    let filteredEvents = events;
    
    // Filtrer selon le mode de vue
    if (viewMode === 'agenda') {
      // Agenda : tous les événements à venir
      filteredEvents = filteredEvents.filter(event => new Date(event.startTime) >= new Date());
    } else if (viewMode === 'week') {
      // Semaine : événements de la semaine actuelle
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      filteredEvents = filteredEvents.filter(event => {
        const eventDate = new Date(event.startTime);
        return eventDate >= weekStart && eventDate <= weekEnd;
      });
    } else {
      // Mois et Jour : événements du jour sélectionné
      filteredEvents = filteredEvents.filter(event => {
        const eventDate = new Date(event.startTime);
        return isSameDay(eventDate, date);
      });
    }
    
    // Appliquer les filtres par catégorie
    if (selectedCategories.length > 0) {
      filteredEvents = filteredEvents.filter(event => 
        selectedCategories.includes(event.category)
      );
    }
    
    // Appliquer les filtres par membre
    if (selectedMembers.length > 0) {
      filteredEvents = filteredEvents.filter(event => 
        selectedMembers.includes(event.userId)
      );
    }
    
    return filteredEvents;
=======
    return events.filter(event => {
      const eventDate = new Date(event.startTime);
      return isSameDay(eventDate, date);
    });
>>>>>>> 51d9a142b87538a5b43c88c4b91c1d4348b14b78
  };

  const getCategoryInfo = (categoryValue: string) => {
    return EVENT_CATEGORIES.find(cat => cat.value === categoryValue) || EVENT_CATEGORIES[EVENT_CATEGORIES.length - 1];
  };

  const handleCreateEvent = async () => {
    try {
      const startDateTime = new Date(`${format(selectedDate, 'yyyy-MM-dd')}T${formData.startTime}:00`);
      const endDateTime = new Date(`${format(selectedDate, 'yyyy-MM-dd')}T${formData.endTime}:00`);
      const durationMinutes = Math.round((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60));

      await createEvent.mutateAsync({
        title: formData.title,
        description: formData.description,
        startDate: startDateTime,
        durationMinutes,
        category: formData.category,
        reminderMinutes: parseInt(formData.reminder),
        isPrivate: formData.isPrivate ? 1 : 0,
      });

      setCreateModalOpen(false);
      resetForm();
      refetch();
    } catch (error) {
      console.error('Error creating event:', error);
    }
  };

  const handleUpdateEvent = async () => {
    if (!selectedEvent) return;

    try {
      const startDateTime = new Date(`${format(selectedDate, 'yyyy-MM-dd')}T${formData.startTime}:00`);
      const endDateTime = new Date(`${format(selectedDate, 'yyyy-MM-dd')}T${formData.endTime}:00`);
      const durationMinutes = Math.round((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60));

      await updateEvent.mutateAsync({
        id: selectedEvent.id,
        title: formData.title,
        description: formData.description,
        startDate: startDateTime,
        durationMinutes,
        category: formData.category,
        reminderMinutes: parseInt(formData.reminder),
        isPrivate: formData.isPrivate ? 1 : 0,
      });

      setEditModalOpen(false);
      setSelectedEvent(null);
      resetForm();
      refetch();
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;

    try {
      await deleteEvent.mutateAsync({ id: selectedEvent.id });
      setEditModalOpen(false);
      setSelectedEvent(null);
      refetch();
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      startTime: '09:00',
      endTime: '10:00',
      category: 'other',
      reminder: '15',
      isPrivate: false,
    });
  };

  const openEditModal = (event: any) => {
    setSelectedEvent(event);
    const startTime = new Date(event.startTime);
    const endTime = new Date(event.endTime);
    
    setFormData({
      title: event.title,
      description: event.description || '',
      startTime: format(startTime, 'HH:mm'),
      endTime: format(endTime, 'HH:mm'),
      category: event.category || 'other',
      reminder: event.reminder?.toString() || '15',
      isPrivate: event.isPrivate || false,
    });
    setEditModalOpen(true);
  };

  const selectedDateEvents = getEventsForDate(selectedDate);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      {/* Page Title */}
      <View style={styles.pageTitleContainer}>
        <Text style={styles.pageTitle}>Calendrier</Text>
<<<<<<< HEAD
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.importButton}
            onPress={() => setImportModalOpen(true)}
          >
            <Text style={styles.importButtonText}>📅 Import</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setFilterModalOpen(true)}
          >
            <Text style={styles.filterButtonText}>📊 Filtres</Text>
            {(selectedCategories.length > 0 || selectedMembers.length > 0) && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>
                  {selectedCategories.length + selectedMembers.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
=======
>>>>>>> 51d9a142b87538a5b43c88c4b91c1d4348b14b78
      </View>

      {/* View Mode Toggle */}
      <View style={styles.viewToggleContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity 
            style={[styles.viewToggleButton, viewMode === 'month' && styles.viewToggleButtonActive]}
            onPress={() => saveViewMode('month')}
          >
<<<<<<< HEAD
            <Text style={[styles.viewToggleIcon, viewMode === 'month' && styles.viewToggleIconActive]}>📅</Text>
            <Text style={[styles.viewToggleNumber, viewMode === 'month' && styles.viewToggleNumberActive]}>30</Text>
=======
            <Text style={[styles.viewToggleText, viewMode === 'month' && styles.viewToggleTextActive]}>📅 Mois</Text>
>>>>>>> 51d9a142b87538a5b43c88c4b91c1d4348b14b78
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.viewToggleButton, viewMode === 'week' && styles.viewToggleButtonActive]}
            onPress={() => saveViewMode('week')}
          >
<<<<<<< HEAD
            <Text style={[styles.viewToggleIcon, viewMode === 'week' && styles.viewToggleIconActive]}>📆</Text>
            <Text style={[styles.viewToggleNumber, viewMode === 'week' && styles.viewToggleNumberActive]}>7</Text>
=======
            <Text style={[styles.viewToggleText, viewMode === 'week' && styles.viewToggleTextActive]}>📆 Semaine</Text>
>>>>>>> 51d9a142b87538a5b43c88c4b91c1d4348b14b78
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.viewToggleButton, viewMode === 'day' && styles.viewToggleButtonActive]}
            onPress={() => saveViewMode('day')}
          >
<<<<<<< HEAD
            <Text style={[styles.viewToggleIcon, viewMode === 'day' && styles.viewToggleIconActive]}>🗓️</Text>
            <Text style={[styles.viewToggleNumber, viewMode === 'day' && styles.viewToggleNumberActive]}>1</Text>
=======
            <Text style={[styles.viewToggleText, viewMode === 'day' && styles.viewToggleTextActive]}>🗓️ Jour</Text>
>>>>>>> 51d9a142b87538a5b43c88c4b91c1d4348b14b78
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.viewToggleButton, viewMode === 'agenda' && styles.viewToggleButtonActive]}
            onPress={() => saveViewMode('agenda')}
          >
<<<<<<< HEAD
            <Text style={[styles.viewToggleIcon, viewMode === 'agenda' && styles.viewToggleIconActive]}>📝</Text>
=======
            <Text style={[styles.viewToggleText, viewMode === 'agenda' && styles.viewToggleTextActive]}>📝 Agenda</Text>
>>>>>>> 51d9a142b87538a5b43c88c4b91c1d4348b14b78
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7c3aed']} />}
      >
        {/* Month View */}
        {viewMode === 'month' && (
          <>
            {/* Month Navigation */}
            <View style={styles.monthNav}>
          <TouchableOpacity onPress={() => setCurrentDate(subMonths(currentDate, 1))} style={styles.navButton}>
            <Text style={styles.navButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.monthTitle}>
            {format(currentDate, 'MMMM yyyy', { locale: getLocale() })}
          </Text>
          <TouchableOpacity onPress={() => setCurrentDate(addMonths(currentDate, 1))} style={styles.navButton}>
            <Text style={styles.navButtonText}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendar}>
          <View style={styles.weekRow}>
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, index) => (
              <View key={index} style={styles.dayHeader}>
                <Text style={styles.dayHeaderText}>{day}</Text>
              </View>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {daysInMonth.map((day, index) => {
              const hasEvents = getEventsForDate(day).length > 0;
              const isSelected = isSameDay(day, selectedDate);
              const isTodayDate = isToday(day);

              return (
                <TouchableOpacity
<<<<<<< HEAD
                  key={day.toString()}
=======
                  key={index}
>>>>>>> 51d9a142b87538a5b43c88c4b91c1d4348b14b78
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                    isTodayDate && styles.dayCellToday,
                  ]}
<<<<<<< HEAD
                  onPress={() => {
                    setSelectedDate(day);
                    // Vérifier si le jour a des événements
                    const dayEvents = (events || []).filter(e => isSameDay(new Date(e.startTime), day));
                    if (dayEvents.length === 0) {
                      // Jour vide : Ouvrir modal création avec date pré-remplie
                      setFormData(prev => ({
                        ...prev,
                        startTime: '09:00',
                        endTime: '10:00',
                      }));
                      setCreateModalOpen(true);
                    } else {
                      // Jour avec événements : Ouvrir dropdown
                      setDropdownModalOpen(true);
                    }
                  }}
=======
                  onPress={() => setSelectedDate(day)}
>>>>>>> 51d9a142b87538a5b43c88c4b91c1d4348b14b78
                >
                  <Text style={[
                    styles.dayText,
                    isTodayDate && !isSelected && styles.dayTextToday,
                    isSelected && styles.dayTextSelected,
                  ]}>
                    {format(day, 'd')}
                  </Text>
                  {hasEvents && <View style={styles.eventDot} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Events for selected date */}
        <View style={styles.eventsSection}>
          <Text style={styles.eventsTitle}>
<<<<<<< HEAD
            {viewMode === 'agenda' 
              ? t('calendar.upcomingEvents') || 'Événements à venir'
              : viewMode === 'week'
              ? `Semaine du ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'd MMM', { locale: getLocale() })}`
              : format(selectedDate, 'EEEE d MMMM', { locale: getLocale() })}
=======
            {format(selectedDate, 'EEEE d MMMM', { locale: getLocale() })}
>>>>>>> 51d9a142b87538a5b43c88c4b91c1d4348b14b78
          </Text>
          
          {selectedDateEvents.length > 0 ? (
            selectedDateEvents.map(event => {
              const category = getCategoryInfo(event.category);
              return (
                <TouchableOpacity key={event.id} style={styles.eventCard} onPress={() => openEditModal(event)}>
                  <View style={[styles.eventColorBar, { backgroundColor: category.color }]} />
                  <View style={styles.eventCardContent}>
                    <View style={styles.eventHeader}>
                      <Text style={styles.eventIcon}>{category.icon}</Text>
                      <Text style={styles.eventTime}>
                        {format(new Date(event.startTime), 'HH:mm')}
                      </Text>
                      {event.isPrivate && <Text style={styles.privateIcon}>🔒</Text>}
                    </View>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    {event.description && (
                      <Text style={styles.eventDescription}>{event.description}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.noEvents}>
              <Text style={styles.noEventsText}>{t('calendar.noEvents')}</Text>
            </View>
          )}
        </View>
          </>
        )}

        {/* Agenda View */}
        {viewMode === 'agenda' && (
          <View style={styles.agendaContainer}>
            {events && events.length > 0 ? (
              events
                .filter(event => new Date(event.startTime) >= new Date())
                .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                .map((event, index, arr) => {
                  const eventDate = new Date(event.startTime);
                  const prevEventDate = index > 0 ? new Date(arr[index - 1].startTime) : null;
                  const showDateHeader = !prevEventDate || !isSameDay(eventDate, prevEventDate);
                  const category = getCategoryInfo(event.category);

                  return (
                    <View key={event.id}>
                      {showDateHeader && (
                        <View style={styles.agendaDateHeader}>
                          <Text style={styles.agendaDateText}>
                            {isToday(eventDate) ? 'Aujourd\'hui' : format(eventDate, 'EEEE d MMMM yyyy', { locale: getLocale() })}
                          </Text>
                        </View>
                      )}
                      <TouchableOpacity 
                        style={styles.agendaEventCard}
                        onPress={() => openEditModal(event)}
                      >
                        <View style={[styles.agendaEventColorBar, { backgroundColor: category.color }]} />
                        <View style={styles.agendaEventContent}>
                          <View style={styles.agendaEventHeader}>
                            <Text style={styles.agendaEventIcon}>{category.icon}</Text>
                            <Text style={styles.agendaEventTime}>
                              {format(eventDate, 'HH:mm')}
                            </Text>
                            {event.isPrivate && <Text style={styles.agendaPrivateIcon}>🔒</Text>}
                          </View>
                          <Text style={styles.agendaEventTitle}>{event.title}</Text>
                          {event.description && (
                            <Text style={styles.agendaEventDescription}>{event.description}</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    </View>
                  );
                })
            ) : (
              <View style={styles.agendaEmpty}>
                <Text style={styles.agendaEmptyText}>Aucun événement à venir</Text>
              </View>
            )}
          </View>
        )}

        {/* Week View */}
        {viewMode === 'week' && (
          <View style={styles.weekViewContainer}>
            {/* Week Navigation */}
            <View style={styles.weekNav}>
              <TouchableOpacity onPress={() => setCurrentDate(subWeeks(currentDate, 1))} style={styles.navButton}>
                <Text style={styles.navButtonText}>←</Text>
              </TouchableOpacity>
              <Text style={styles.weekNavTitle}>
                Semaine du {format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'd MMM', { locale: getLocale() })}
              </Text>
              <TouchableOpacity onPress={() => setCurrentDate(addWeeks(currentDate, 1))} style={styles.navButton}>
                <Text style={styles.navButtonText}>→</Text>
              </TouchableOpacity>
            </View>

            {/* Week Header (Days) */}
            <View style={styles.weekHeader}>
              <View style={styles.weekTimeColumn} />
              {eachDayOfInterval({
                start: startOfWeek(currentDate, { weekStartsOn: 1 }),
                end: endOfWeek(currentDate, { weekStartsOn: 1 })
              }).map(day => (
                <View key={day.toString()} style={styles.weekDayHeader}>
                  <Text style={[styles.weekDayName, isToday(day) && styles.weekDayNameToday]}>
                    {format(day, 'EEE', { locale: getLocale() })}
                  </Text>
                  <Text style={[styles.weekDayNumber, isToday(day) && styles.weekDayNumberToday]}>
                    {format(day, 'd')}
                  </Text>
                </View>
              ))}
            </View>

            {/* Week Timeline */}
            <ScrollView style={styles.weekTimeline}>
              {Array.from({ length: 24 }, (_, hour) => (
                <View key={hour} style={styles.weekTimeRow}>
                  <View style={styles.weekTimeLabel}>
                    <Text style={styles.weekTimeLabelText}>{hour.toString().padStart(2, '0')}:00</Text>
                  </View>
                  {eachDayOfInterval({
                    start: startOfWeek(currentDate, { weekStartsOn: 1 }),
                    end: endOfWeek(currentDate, { weekStartsOn: 1 })
                  }).map(day => {
                    const dayEvents = (events || []).filter(event => {
                      const eventDate = new Date(event.startTime);
                      return isSameDay(eventDate, day) && eventDate.getHours() === hour;
                    });

                    return (
                      <View key={day.toString()} style={styles.weekDayColumn}>
                        {dayEvents.map(event => {
                          const category = getCategoryInfo(event.category);
                          const startTime = new Date(event.startTime);
                          const endTime = new Date(event.endTime);
                          const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
                          const heightPerMinute = 1.5;
                          const eventHeight = Math.max(durationMinutes * heightPerMinute, 30);
                          const topOffset = startTime.getMinutes() * heightPerMinute;

                          return (
                            <TouchableOpacity
                              key={event.id}
                              style={[
                                styles.weekEventCard,
                                {
                                  backgroundColor: category.color + '20',
                                  borderLeftColor: category.color,
                                  height: eventHeight,
                                  top: topOffset,
                                }
                              ]}
                              onPress={() => openEditModal(event)}
                            >
                              <Text style={styles.weekEventIcon}>{category.icon}</Text>
                              <Text style={styles.weekEventTitle} numberOfLines={1}>
                                {event.title}
                              </Text>
                              <Text style={styles.weekEventTime}>
                                {format(startTime, 'HH:mm')}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Day View */}
        {viewMode === 'day' && (
          <View style={styles.dayViewContainer}>
            {/* Day Navigation */}
            <View style={styles.dayNav}>
              <TouchableOpacity onPress={() => setSelectedDate(subDays(selectedDate, 1))} style={styles.navButton}>
                <Text style={styles.navButtonText}>←</Text>
              </TouchableOpacity>
              <Text style={styles.dayNavTitle}>
                {isToday(selectedDate) ? "Aujourd'hui" : format(selectedDate, 'EEEE d MMMM yyyy', { locale: getLocale() })}
              </Text>
              <TouchableOpacity onPress={() => setSelectedDate(addDays(selectedDate, 1))} style={styles.navButton}>
                <Text style={styles.navButtonText}>→</Text>
              </TouchableOpacity>
            </View>

            {/* Timeline */}
            <ScrollView style={styles.dayTimeline}>
              {Array.from({ length: 24 }, (_, hour) => {
                const hourEvents = (events || []).filter(event => {
                  const eventDate = new Date(event.startTime);
                  return isSameDay(eventDate, selectedDate) && eventDate.getHours() === hour;
                });

                return (
                  <View key={hour} style={styles.dayTimeSlot}>
                    <View style={styles.dayTimeLabel}>
                      <Text style={styles.dayTimeLabelText}>{hour.toString().padStart(2, '0')}:00</Text>
                    </View>
                    <View style={styles.dayTimeContent}>
                      <View style={styles.dayTimeHalfHourLine} />
                      {hourEvents.map(event => {
                        const category = getCategoryInfo(event.category);
                        const startTime = new Date(event.startTime);
                        const endTime = new Date(event.endTime);
                        const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
                        const heightPerMinute = 2;
                        const eventHeight = Math.max(durationMinutes * heightPerMinute, 40);
                        const topOffset = startTime.getMinutes() * heightPerMinute;

                        return (
                          <TouchableOpacity
                            key={event.id}
                            style={[
                              styles.dayEventCard,
                              { 
                                backgroundColor: category.color + '20',
                                borderLeftColor: category.color,
                                height: eventHeight,
                                top: topOffset,
                              }
                            ]}
                            onPress={() => openEditModal(event)}
                          >
                            <Text style={styles.dayEventTime}>
                              {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
                            </Text>
                            <View style={styles.dayEventHeader}>
                              <Text style={styles.dayEventIcon}>{category.icon}</Text>
                              <Text style={styles.dayEventTitle} numberOfLines={1}>{event.title}</Text>
                              {event.isPrivate && <Text style={styles.dayEventPrivate}>🔒</Text>}
                            </View>
                            {event.description && durationMinutes > 30 && (
                              <Text style={styles.dayEventDescription} numberOfLines={2}>
                                {event.description}
                              </Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Create Event Modal */}
      <Modal visible={createModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('calendar.addEvent')}</Text>
            
            <ScrollView style={styles.modalForm}>
              <Text style={styles.label}>{t('common.title')}</Text>
              <TextInput
                style={styles.input}
                value={formData.title}
                onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
                placeholder={t('calendar.addEvent')}
              />

              <Text style={styles.label}>{t('calendar.description')}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                placeholder={t('calendar.description')}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.label}>{t('calendar.category')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {EVENT_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.categoryButton,
                      formData.category === cat.value && { backgroundColor: cat.color },
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, category: cat.value }))}
                  >
                    <Text style={styles.categoryIcon}>{cat.icon}</Text>
                    <Text style={[
                      styles.categoryLabel,
                      formData.category === cat.value && styles.categoryLabelSelected,
                    ]}>
                      {getCategoryLabel(cat)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>{t('calendar.startTime')}</Text>
              <TextInput
                style={styles.input}
                value={formData.startTime}
                onChangeText={(text) => setFormData(prev => ({ ...prev, startTime: text }))}
                placeholder="09:00"
              />

              <Text style={styles.label}>{t('calendar.endTime')}</Text>
              <TextInput
                style={styles.input}
                value={formData.endTime}
                onChangeText={(text) => setFormData(prev => ({ ...prev, endTime: text }))}
                placeholder="10:00"
              />

              <Text style={styles.label}>{t('calendar.reminder')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reminderScroll}>
                {REMINDER_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.reminderButton,
                      formData.reminder === option.value && styles.reminderButtonSelected,
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, reminder: option.value }))}
                  >
                    <Text style={[
                      styles.reminderButtonText,
                      formData.reminder === option.value && styles.reminderButtonTextSelected,
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setFormData(prev => ({ ...prev, isPrivate: !prev.isPrivate }))}
              >
                <View style={[styles.checkbox, formData.isPrivate && styles.checkboxChecked]}>
                  {formData.isPrivate && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>🔒 {t('common.private')}</Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setCreateModalOpen(false);
                  resetForm();
                }}
              >
                <Text style={styles.modalButtonTextCancel}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleCreateEvent}
              >
                <Text style={styles.modalButtonTextSave}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Event Modal */}
      <Modal visible={editModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('common.edit')}</Text>
            
            <ScrollView style={styles.modalForm}>
              <Text style={styles.label}>{t('common.title')}</Text>
              <TextInput
                style={styles.input}
                value={formData.title}
                onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
              />

              <Text style={styles.label}>{t('calendar.description')}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.label}>{t('calendar.category')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {EVENT_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.categoryButton,
                      formData.category === cat.value && { backgroundColor: cat.color },
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, category: cat.value }))}
                  >
                    <Text style={styles.categoryIcon}>{cat.icon}</Text>
                    <Text style={[
                      styles.categoryLabel,
                      formData.category === cat.value && styles.categoryLabelSelected,
                    ]}>
                      {getCategoryLabel(cat)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>{t('calendar.startTime')}</Text>
              <TextInput
                style={styles.input}
                value={formData.startTime}
                onChangeText={(text) => setFormData(prev => ({ ...prev, startTime: text }))}
              />

              <Text style={styles.label}>{t('calendar.endTime')}</Text>
              <TextInput
                style={styles.input}
                value={formData.endTime}
                onChangeText={(text) => setFormData(prev => ({ ...prev, endTime: text }))}
              />

              <Text style={styles.label}>{t('calendar.reminder')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reminderScroll}>
                {REMINDER_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.reminderButton,
                      formData.reminder === option.value && styles.reminderButtonSelected,
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, reminder: option.value }))}
                  >
                    <Text style={[
                      styles.reminderButtonText,
                      formData.reminder === option.value && styles.reminderButtonTextSelected,
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setFormData(prev => ({ ...prev, isPrivate: !prev.isPrivate }))}
              >
                <View style={[styles.checkbox, formData.isPrivate && styles.checkboxChecked]}>
                  {formData.isPrivate && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>🔒 {t('common.private')}</Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonDelete]}
                onPress={handleDeleteEvent}
              >
                <Text style={styles.modalButtonTextDelete}>{t('common.delete')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setEditModalOpen(false);
                  setSelectedEvent(null);
                  resetForm();
                }}
              >
                <Text style={styles.modalButtonTextCancel}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleUpdateEvent}
              >
                <Text style={styles.modalButtonTextSave}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
<<<<<<< HEAD

      {/* Dropdown Modal - Day Events */}
      <Modal visible={dropdownModalOpen} animationType="fade" transparent>
        <TouchableOpacity 
          style={styles.dropdownOverlay} 
          activeOpacity={1}
          onPress={() => setDropdownModalOpen(false)}
        >
          <View style={styles.dropdownContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.dropdownTitle}>
              {format(selectedDate, 'EEEE d MMMM', { locale: getLocale() })}
            </Text>
            
            {/* Add Event Button */}
            <TouchableOpacity
              style={styles.dropdownAddButton}
              onPress={() => {
                setDropdownModalOpen(false);
                setFormData(prev => ({
                  ...prev,
                  startTime: '09:00',
                  endTime: '10:00',
                }));
                setCreateModalOpen(true);
              }}
            >
              <Text style={styles.dropdownAddButtonText}>+ {t('calendar.addEvent')}</Text>
            </TouchableOpacity>

            {/* Events List */}
            <ScrollView style={styles.dropdownEventsList}>
              {(events || []).filter(e => isSameDay(new Date(e.startTime), selectedDate)).map(event => {
                const category = getCategoryInfo(event.category);
                return (
                  <TouchableOpacity
                    key={event.id}
                    style={styles.dropdownEventCard}
                    onPress={() => {
                      setDropdownModalOpen(false);
                      openEditModal(event);
                    }}
                  >
                    <View style={[styles.dropdownEventColorBar, { backgroundColor: category.color }]} />
                    <View style={styles.dropdownEventContent}>
                      <View style={styles.dropdownEventHeader}>
                        <Text style={styles.dropdownEventIcon}>{category.icon}</Text>
                        <Text style={styles.dropdownEventTime}>
                          {format(new Date(event.startTime), 'HH:mm')}
                        </Text>
                        {event.isPrivate && <Text style={styles.dropdownPrivateIcon}>🔒</Text>}
                      </View>
                      <Text style={styles.dropdownEventTitle}>{event.title}</Text>
                      {event.description && (
                        <Text style={styles.dropdownEventDescription} numberOfLines={1}>
                          {event.description}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Close Button */}
            <TouchableOpacity
              style={styles.dropdownCloseButton}
              onPress={() => setDropdownModalOpen(false)}
            >
              <Text style={styles.dropdownCloseButtonText}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Filter Modal */}
      <Modal visible={filterModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filtres</Text>
            
            <ScrollView style={styles.modalForm}>
              {/* Category Filters */}
              <Text style={styles.filterSectionTitle}>Par catégorie</Text>
              <View style={styles.filterCheckboxContainer}>
                {EVENT_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    style={styles.filterCheckboxRow}
                    onPress={() => {
                      if (selectedCategories.includes(cat.value)) {
                        setSelectedCategories(selectedCategories.filter(c => c !== cat.value));
                      } else {
                        setSelectedCategories([...selectedCategories, cat.value]);
                      }
                    }}
                  >
                    <View style={[
                      styles.checkbox,
                      selectedCategories.includes(cat.value) && styles.checkboxChecked
                    ]}>
                      {selectedCategories.includes(cat.value) && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.filterCheckboxIcon}>{cat.icon}</Text>
                    <Text style={styles.filterCheckboxLabel}>{getCategoryLabel(cat)}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Member Filters */}
              {familyMembers && familyMembers.length > 0 && (
                <>
                  <Text style={styles.filterSectionTitle}>Par membre</Text>
                  <View style={styles.filterCheckboxContainer}>
                    {familyMembers.map((member: any) => (
                      <TouchableOpacity
                        key={member.id}
                        style={styles.filterCheckboxRow}
                        onPress={() => {
                          if (selectedMembers.includes(member.id)) {
                            setSelectedMembers(selectedMembers.filter(m => m !== member.id));
                          } else {
                            setSelectedMembers([...selectedMembers, member.id]);
                          }
                        }}
                      >
                        <View style={[
                          styles.checkbox,
                          selectedMembers.includes(member.id) && styles.checkboxChecked
                        ]}>
                          {selectedMembers.includes(member.id) && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                        <Text style={styles.filterCheckboxLabel}>{member.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={resetFilters}
              >
                <Text style={styles.modalButtonTextCancel}>Réinitialiser</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setFilterModalOpen(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={applyFilters}
              >
                <Text style={styles.modalButtonTextSave}>Appliquer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Import ICS Modal */}
      <Modal visible={importModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Importer un calendrier</Text>
            
            <View style={styles.importInfo}>
              <Text style={styles.importInfoText}>
                Sélectionnez un fichier .ics (iCalendar) pour importer vos événements.
              </Text>
              <Text style={styles.importInfoNote}>
                ⚠️ Les événements récurrents ne sont pas supportés.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.importSelectButton}
              onPress={handleImportICS}
              disabled={isImporting}
            >
              <Text style={styles.importSelectButtonText}>
                {isImporting ? '🔄 Import en cours...' : '📂 Sélectionner un fichier .ics'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonCancel, { marginTop: 20 }]}
              onPress={() => setImportModalOpen(false)}
              disabled={isImporting}
            >
              <Text style={styles.modalButtonTextCancel}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
=======
>>>>>>> 51d9a142b87538a5b43c88c4b91c1d4348b14b78
    </SafeAreaView>
  );
}

const getStyles = (isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDark ? '#000000' : '#f9fafb' },
<<<<<<< HEAD
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: isDark ? '#1a1a1a' : '#fff', borderBottomWidth: 1, borderBottomColor: isDark ? '#ffffff' : '#e5e7eb' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: isDark ? '#ffffff' : '#1f2937' },
  addButton: { backgroundColor: '#7c3aed', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  addButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  pageTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: isDark ? '#1a1a1a' : '#fff',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: isDark ? '#ffffff' : '#1f2937',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  filterButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  filterBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  importButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  importInfo: {
    backgroundColor: isDark ? '#2a2a2a' : '#f3f4f6',
    padding: 16,
    borderRadius: 8,
    marginVertical: 16,
  },
  importInfoText: {
    fontSize: 14,
    color: isDark ? '#d1d5db' : '#6b7280',
    marginBottom: 8,
  },
  importInfoNote: {
    fontSize: 13,
    color: '#f59e0b',
    fontStyle: 'italic',
  },
  importSelectButton: {
    backgroundColor: '#7c3aed',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  importSelectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: { flex: 1 },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: isDark ? '#1a1a1a' : '#fff', marginTop: 10, marginHorizontal: 10, borderRadius: 12 },
  navButton: { padding: 10 },
  navButtonText: { fontSize: 24, color: '#7c3aed', fontWeight: 'bold' },
  monthTitle: { fontSize: 18, fontWeight: 'bold', color: isDark ? '#ffffff' : '#1f2937', textTransform: 'capitalize' },
  calendar: { backgroundColor: isDark ? '#1a1a1a' : '#fff', margin: 10, borderRadius: 12, padding: 10 },
=======
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: isDark ? '#2a2a2a' : '#fff', borderBottomWidth: 1, borderBottomColor: isDark ? '#ffffff' : '#e5e7eb' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: isDark ? '#ffffff' : '#1f2937' },
  addButton: { backgroundColor: '#7c3aed', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  addButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  content: { flex: 1 },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: isDark ? '#2a2a2a' : '#fff', marginTop: 10, marginHorizontal: 10, borderRadius: 12 },
  navButton: { padding: 10 },
  navButtonText: { fontSize: 24, color: '#7c3aed', fontWeight: 'bold' },
  monthTitle: { fontSize: 18, fontWeight: 'bold', color: isDark ? '#ffffff' : '#1f2937', textTransform: 'capitalize' },
  calendar: { backgroundColor: isDark ? '#2a2a2a' : '#fff', margin: 10, borderRadius: 12, padding: 10 },
>>>>>>> 51d9a142b87538a5b43c88c4b91c1d4348b14b78
  weekRow: { flexDirection: 'row', marginBottom: 10 },
  dayHeader: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  dayHeaderText: { fontSize: 14, fontWeight: '600', color: isDark ? '#f5f5dc' : '#6b7280' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 8, marginBottom: 5 },
  dayCellSelected: { backgroundColor: '#7c3aed' },
  dayCellToday: { borderWidth: 2, borderColor: '#7c3aed' },
  dayText: { fontSize: 16, color: isDark ? '#ffffff' : '#1f2937' },
  dayTextSelected: { color: '#fff', fontWeight: 'bold' },
  dayTextToday: { color: '#7c3aed', fontWeight: 'bold' },
  eventDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#7c3aed', position: 'absolute', bottom: 2 },
<<<<<<< HEAD
  eventsSection: { margin: 10, backgroundColor: isDark ? '#1a1a1a' : '#fff', borderRadius: 12, padding: 20 },
=======
  eventsSection: { margin: 10, backgroundColor: isDark ? '#2a2a2a' : '#fff', borderRadius: 12, padding: 20 },
>>>>>>> 51d9a142b87538a5b43c88c4b91c1d4348b14b78
  eventsTitle: { fontSize: 18, fontWeight: 'bold', color: isDark ? '#ffffff' : '#1f2937', marginBottom: 16, textTransform: 'capitalize' },
  eventCard: { flexDirection: 'row', backgroundColor: isDark ? '#2a2a2a' : '#f9fafb', borderRadius: 8, marginBottom: 12, overflow: 'hidden' },
  eventColorBar: { width: 4 },
  eventCardContent: { flex: 1, padding: 16 },
  eventHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  eventIcon: { fontSize: 18, marginRight: 8 },
  eventTime: { fontSize: 16, fontWeight: 'bold', color: '#7c3aed', flex: 1 },
  privateIcon: { fontSize: 14 },
  eventTitle: { fontSize: 16, fontWeight: '600', color: isDark ? '#ffffff' : '#1f2937', marginBottom: 4 },
  eventDescription: { fontSize: 14, color: isDark ? '#f5f5dc' : '#6b7280' },
  noEvents: { padding: 40, alignItems: 'center' },
  noEventsText: { fontSize: 16, color: isDark ? '#f5f5dc' : '#9ca3af' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
<<<<<<< HEAD
  modalContent: { backgroundColor: isDark ? '#1a1a1a' : '#fff', borderRadius: 12, padding: 24, width: '90%', maxHeight: '80%' },
=======
  modalContent: { backgroundColor: isDark ? '#2a2a2a' : '#fff', borderRadius: 12, padding: 24, width: '90%', maxHeight: '80%' },
>>>>>>> 51d9a142b87538a5b43c88c4b91c1d4348b14b78
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: isDark ? '#ffffff' : '#1f2937', marginBottom: 16 },
  modalForm: { maxHeight: 400 },
  label: { fontSize: 14, fontWeight: '600', color: isDark ? '#ffffff' : '#374151', marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: isDark ? '#000000' : '#f9fafb', borderWidth: 1, borderColor: isDark ? '#ffffff' : '#e5e7eb', borderRadius: 8, padding: 12, fontSize: 16, color: isDark ? '#ffffff' : '#1f2937' },
  textArea: { height: 80, textAlignVertical: 'top' },
  categoryScroll: { marginVertical: 8 },
  categoryButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: isDark ? '#ffffff' : '#e5e7eb', marginRight: 8, backgroundColor: isDark ? '#2a2a2a' : '#fff' },
  categoryIcon: { fontSize: 18, marginRight: 6 },
  categoryLabel: { fontSize: 14, color: isDark ? '#f5f5dc' : '#6b7280' },
  categoryLabelSelected: { color: '#fff', fontWeight: '600' },
  reminderScroll: { marginVertical: 8 },
  reminderButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: isDark ? '#ffffff' : '#e5e7eb', marginRight: 8, backgroundColor: isDark ? '#2a2a2a' : '#fff' },
  reminderButtonSelected: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  reminderButtonText: { fontSize: 14, color: isDark ? '#f5f5dc' : '#6b7280' },
  reminderButtonTextSelected: { color: '#fff', fontWeight: '600' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  checkbox: { width: 24, height: 24, borderRadius: 4, borderWidth: 2, borderColor: isDark ? '#ffffff' : '#d1d5db', marginRight: 8, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  checkmark: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  checkboxLabel: { fontSize: 16, color: isDark ? '#ffffff' : '#374151' },
  modalButtons: { flexDirection: 'row', marginTop: 20, gap: 8 },
  modalButton: { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center' },
  modalButtonCancel: { backgroundColor: isDark ? '#2a2a2a' : '#f3f4f6' },
  modalButtonSave: { backgroundColor: '#7c3aed' },
  modalButtonDelete: { backgroundColor: '#ef4444' },
  modalButtonTextCancel: { color: isDark ? '#ffffff' : '#6b7280', fontSize: 16, fontWeight: '600' },
  modalButtonTextSave: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalButtonTextDelete: { color: '#fff', fontSize: 16, fontWeight: '600' },

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
    color: isDark ? '#ffffff' : '#1f2937',
    textAlign: 'center',
  },

  // View Toggle Styles
  viewToggleContainer: {
    backgroundColor: isDark ? '#1f2937' : '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#374151' : '#e5e7eb',
  },
  viewToggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: isDark ? '#374151' : '#f3f4f6',
<<<<<<< HEAD
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
=======
>>>>>>> 51d9a142b87538a5b43c88c4b91c1d4348b14b78
  },
  viewToggleButtonActive: {
    backgroundColor: '#7c3aed',
  },
<<<<<<< HEAD
  viewToggleIcon: {
    fontSize: 20,
    color: isDark ? '#f5f5dc' : '#6b7280',
  },
  viewToggleIconActive: {
    color: '#ffffff',
  },
  viewToggleNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    color: isDark ? '#f5f5dc' : '#6b7280',
    marginTop: -4,
  },
  viewToggleNumberActive: {
=======
  viewToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: isDark ? '#f5f5dc' : '#6b7280',
  },
  viewToggleTextActive: {
>>>>>>> 51d9a142b87538a5b43c88c4b91c1d4348b14b78
    color: '#ffffff',
  },

  // Agenda View Styles
  agendaContainer: {
    padding: 16,
  },
  agendaDateHeader: {
    paddingVertical: 12,
    marginTop: 16,
    marginBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#7c3aed',
  },
  agendaDateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: isDark ? '#ffffff' : '#1f2937',
  },
  agendaEventCard: {
    flexDirection: 'row',
    backgroundColor: isDark ? '#1f2937' : '#fff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: isDark ? '#374151' : '#e5e7eb',
    overflow: 'hidden',
  },
  agendaEventColorBar: {
    width: 4,
  },
  agendaEventContent: {
    flex: 1,
    padding: 12,
  },
  agendaEventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  agendaEventIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  agendaEventTime: {
    fontSize: 14,
    fontWeight: '600',
    color: isDark ? '#fbbf24' : '#7c3aed',
    marginRight: 8,
  },
  agendaPrivateIcon: {
    fontSize: 14,
  },
  agendaEventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: isDark ? '#ffffff' : '#1f2937',
    marginBottom: 4,
  },
  agendaEventDescription: {
    fontSize: 14,
    color: isDark ? '#d1d5db' : '#6b7280',
  },
  agendaEmpty: {
    padding: 40,
    alignItems: 'center',
  },
  agendaEmptyText: {
    fontSize: 16,
    color: isDark ? '#9ca3af' : '#9ca3af',
  },

  // Week View Styles
  weekViewContainer: {
    flex: 1,
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: isDark ? '#1f2937' : '#fff',
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#374151' : '#e5e7eb',
  },
  weekNavTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDark ? '#ffffff' : '#1f2937',
  },
  weekHeader: {
    flexDirection: 'row',
    backgroundColor: isDark ? '#1f2937' : '#fff',
    borderBottomWidth: 2,
    borderBottomColor: isDark ? '#374151' : '#e5e7eb',
  },
  weekTimeColumn: {
    width: 60,
  },
  weekDayHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekDayName: {
    fontSize: 12,
    fontWeight: '600',
    color: isDark ? '#9ca3af' : '#6b7280',
    textTransform: 'uppercase',
  },
  weekDayNameToday: {
    color: '#7c3aed',
  },
  weekDayNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: isDark ? '#ffffff' : '#1f2937',
    marginTop: 4,
  },
  weekDayNumberToday: {
    color: '#7c3aed',
  },
  weekTimeline: {
    flex: 1,
  },
  weekTimeRow: {
    flexDirection: 'row',
    minHeight: 90,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#374151' : '#e5e7eb',
  },
  weekTimeLabel: {
    width: 60,
    paddingTop: 8,
    paddingRight: 8,
    alignItems: 'flex-end',
  },
  weekTimeLabelText: {
    fontSize: 11,
    color: isDark ? '#9ca3af' : '#6b7280',
    fontWeight: '600',
  },
  weekDayColumn: {
    flex: 1,
    position: 'relative',
    borderRightWidth: 1,
    borderRightColor: isDark ? '#2a2a2a' : '#f3f4f6',
  },
  weekEventCard: {
    position: 'absolute',
    left: 2,
    right: 2,
    borderLeftWidth: 3,
    borderRadius: 4,
    padding: 4,
    overflow: 'hidden',
  },
  weekEventIcon: {
    fontSize: 12,
  },
  weekEventTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: isDark ? '#ffffff' : '#1f2937',
  },
  weekEventTime: {
    fontSize: 9,
    color: isDark ? '#fbbf24' : '#7c3aed',
    marginTop: 2,
  },

  // Day View Styles
  dayViewContainer: {
    flex: 1,
  },
  dayNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: isDark ? '#1f2937' : '#fff',
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#374151' : '#e5e7eb',
  },
  dayNavTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDark ? '#ffffff' : '#1f2937',
  },
  dayTimeline: {
    flex: 1,
  },
  dayTimeSlot: {
    flexDirection: 'row',
    minHeight: 120,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#374151' : '#e5e7eb',
  },
  dayTimeLabel: {
    width: 60,
    paddingTop: 8,
    paddingRight: 8,
    alignItems: 'flex-end',
  },
  dayTimeLabelText: {
    fontSize: 12,
    color: isDark ? '#9ca3af' : '#6b7280',
    fontWeight: '600',
  },
  dayTimeContent: {
    flex: 1,
    position: 'relative',
    paddingLeft: 8,
  },
  dayTimeHalfHourLine: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: isDark ? '#2a2a2a' : '#f3f4f6',
  },
  dayEventCard: {
    position: 'absolute',
    left: 8,
    right: 8,
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 8,
    overflow: 'hidden',
  },
  dayEventTime: {
    fontSize: 11,
    fontWeight: '600',
    color: isDark ? '#fbbf24' : '#7c3aed',
    marginBottom: 4,
  },
  dayEventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  dayEventIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  dayEventTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: isDark ? '#ffffff' : '#1f2937',
  },
  dayEventPrivate: {
    fontSize: 12,
  },
  dayEventDescription: {
    fontSize: 12,
    color: isDark ? '#d1d5db' : '#6b7280',
    marginTop: 2,
  },

  // Coming Soon Styles
  comingSoonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  comingSoonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: isDark ? '#ffffff' : '#1f2937',
    marginBottom: 8,
  },
  comingSoonSubtext: {
    fontSize: 16,
    color: isDark ? '#9ca3af' : '#6b7280',
  },
<<<<<<< HEAD

  // Dropdown Modal Styles
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContent: {
    backgroundColor: isDark ? '#1a1a1a' : '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '70%',
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDark ? '#ffffff' : '#1f2937',
    marginBottom: 16,
    textTransform: 'capitalize',
  },
  dropdownAddButton: {
    backgroundColor: '#7c3aed',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  dropdownAddButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dropdownEventsList: {
    maxHeight: 300,
  },
  dropdownEventCard: {
    flexDirection: 'row',
    backgroundColor: isDark ? '#2a2a2a' : '#f9fafb',
    borderRadius: 8,
    marginBottom: 10,
    overflow: 'hidden',
  },
  dropdownEventColorBar: {
    width: 4,
  },
  dropdownEventContent: {
    flex: 1,
    padding: 12,
  },
  dropdownEventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dropdownEventIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  dropdownEventTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7c3aed',
    flex: 1,
  },
  dropdownPrivateIcon: {
    fontSize: 14,
  },
  dropdownEventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: isDark ? '#ffffff' : '#1f2937',
    marginBottom: 2,
  },
  dropdownEventDescription: {
    fontSize: 14,
    color: isDark ? '#f5f5dc' : '#6b7280',
  },
  dropdownCloseButton: {
    backgroundColor: isDark ? '#2a2a2a' : '#f3f4f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  dropdownCloseButtonText: {
    color: isDark ? '#ffffff' : '#374151',
    fontSize: 16,
    fontWeight: '600',
  },

  // Filter Modal Styles
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: isDark ? '#ffffff' : '#1f2937',
    marginTop: 16,
    marginBottom: 12,
  },
  filterCheckboxContainer: {
    gap: 8,
  },
  filterCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  filterCheckboxIcon: {
    fontSize: 18,
    marginLeft: 8,
    marginRight: 8,
  },
  filterCheckboxLabel: {
    fontSize: 16,
    color: isDark ? '#ffffff' : '#374151',
  },
=======
>>>>>>> 51d9a142b87538a5b43c88c4b91c1d4348b14b78
});

