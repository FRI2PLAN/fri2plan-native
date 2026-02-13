import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, TextInput, RefreshControl, Modal, FlatList } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, addDays, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameHour } from 'date-fns';
import { fr, de, enUS } from 'date-fns/locale';
import { trpc } from '../lib/trpc';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';

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
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [dropdownModalOpen, setDropdownModalOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'agenda'>('month');
  const [selectedParticipants, setSelectedParticipants] = useState<number[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchStartDate, setSearchStartDate] = useState<Date | null>(null);
  const [searchEndDate, setSearchEndDate] = useState<Date | null>(null);
  const [showSearchStartDatePicker, setShowSearchStartDatePicker] = useState(false);
  const [showSearchEndDatePicker, setShowSearchEndDatePicker] = useState(false);
  const [tutorialModalOpen, setTutorialModalOpen] = useState(false);
  const [importIcsModalOpen, setImportIcsModalOpen] = useState(false);
  const [subscribeUrlModalOpen, setSubscribeUrlModalOpen] = useState(false);
  const [calendarUrl, setCalendarUrl] = useState('');

  // Load saved view mode
  useEffect(() => {
    loadViewMode();
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

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '09:00',
    endTime: '10:00',
    endDate: null as Date | null,
    category: 'other',
    reminder: '15',
    reminderUnit: 'minutes',
    isPrivate: false,
    recurrence: 'none',
    allDay: false,
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

  // Fetch events
  const { data: events, isLoading, refetch } = trpc.events.list.useQuery();
  const createEvent = trpc.events.create.useMutation();
  const updateEvent = trpc.events.update.useMutation();
  const deleteEvent = trpc.events.delete.useMutation();
  const importIcal = trpc.events.importIcal.useMutation();
  
  // Fetch family data
  const { data: families } = trpc.family.list.useQuery();
  const familyId = families && families.length > 0 ? families[0].id : null;
  const { data: familyMembers } = trpc.family.members.useQuery(
    { familyId: familyId! },
    { enabled: !!familyId }
  );

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Get the day of week for the first day (0=Sunday, 1=Monday, ...)
  const firstDayOfWeek = monthStart.getDay();
  // Convert to Monday-based (0=Monday, 6=Sunday)
  const startDayIndex = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  // Create empty cells for days before the 1st
  const emptyDays = Array(startDayIndex).fill(null);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getEventsForDate = (date: Date) => {
    if (!events) return [];
    return events.filter(event => {
      const eventStartDate = new Date(event.startDate);
      const eventEndDate = event.endDate ? new Date(event.endDate) : eventStartDate;
      
      // Check if the date is within the event's date range (for multi-day events)
      const isWithinRange = date >= new Date(eventStartDate.setHours(0, 0, 0, 0)) && 
                            date <= new Date(eventEndDate.setHours(23, 59, 59, 999));
      
      const matchesCategory = !categoryFilter || event.category === categoryFilter;
      
      // Search filter
      const matchesSearch = !searchQuery || 
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (event.description && event.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStartDate = !searchStartDate || eventStartDate >= searchStartDate;
      const matchesEndDate = !searchEndDate || eventStartDate <= searchEndDate;
      
      return isWithinRange && matchesCategory && matchesSearch && matchesStartDate && matchesEndDate;
    });
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
        recurrence: formData.recurrence,
        participantUserIds: selectedParticipants.length > 0 ? selectedParticipants : undefined,
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
        eventId: selectedEvent.id,
        title: formData.title,
        description: formData.description,
        startDate: startDateTime,
        durationMinutes,
        category: formData.category,
        reminderMinutes: parseInt(formData.reminder),
        isPrivate: formData.isPrivate ? 1 : 0,
        recurrence: formData.recurrence,
        participantUserIds: selectedParticipants.length > 0 ? selectedParticipants : undefined,
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
      await deleteEvent.mutateAsync({ eventId: selectedEvent.id });
      setEditModalOpen(false);
      setSelectedEvent(null);
      refetch();
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const handleImportIcs = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/calendar',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      if (!familyId) {
        Alert.alert('Erreur', 'Aucune famille active');
        return;
      }

      // Lire le fichier ICS
      const response = await fetch(result.assets[0].uri);
      const icsContent = await response.text();

      if (!icsContent || icsContent.trim().length === 0) {
        Alert.alert('Erreur', 'Le fichier ICS est vide');
        return;
      }

      console.log('ICS Content length:', icsContent.length);
      console.log('Family ID:', familyId);

      // Parser et importer via tRPC
      await importIcal.mutateAsync({ familyId, icsContent: icsContent.trim() });
      
      Alert.alert('Succès', 'Calendrier importé avec succès');
      setImportIcsModalOpen(false);
      refetch();
    } catch (error) {
      console.error('Error importing ICS:', error);
      Alert.alert('Erreur', 'Impossible d\'importer le fichier ICS');
    }
  };

  const handleSubscribeUrl = async () => {
    if (!calendarUrl.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer une URL valide');
      return;
    }

    if (!familyId) {
      Alert.alert('Erreur', 'Aucune famille active');
      return;
    }

    try {
      // Télécharger le calendrier depuis l'URL
      const response = await fetch(calendarUrl);
      const icsContent = await response.text();

      if (!icsContent || icsContent.trim().length === 0) {
        Alert.alert('Erreur', 'Le calendrier est vide ou l\'URL est invalide');
        return;
      }

      console.log('ICS Content length:', icsContent.length);
      console.log('Family ID:', familyId);

      // Importer via tRPC
      await importIcal.mutateAsync({ familyId, icsContent: icsContent.trim() });
      
      Alert.alert('Succès', 'Calendrier importé avec succès');
      setSubscribeUrlModalOpen(false);
      setCalendarUrl('');
      refetch();
    } catch (error) {
      console.error('Error subscribing to calendar:', error);
      Alert.alert('Erreur', 'Impossible de s\'abonner au calendrier');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      startTime: '09:00',
      endTime: '10:00',
      endDate: null,
      category: 'other',
      reminder: '15',
      reminderUnit: 'minutes',
      isPrivate: false,
      recurrence: 'none',
      allDay: false,
    });
    setSelectedParticipants([]);
  };

  const openEditModal = (event: any) => {
    setSelectedEvent(event);
    const startTime = new Date(event.startDate);
    const endTime = new Date(startTime.getTime() + (event.durationMinutes || 60) * 60000);
    
    setFormData({
      title: event.title,
      description: event.description || '',
      startTime: format(startTime, 'HH:mm'),
      endTime: format(endTime, 'HH:mm'),
      endDate: event.endDate ? new Date(event.endDate) : null,
      category: event.category || 'other',
      reminder: event.reminder?.toString() || '15',
      reminderUnit: 'minutes',
      isPrivate: event.isPrivate || false,
      recurrence: event.recurrence || 'none',
      allDay: event.allDay || false,
    });
    
    if (event.participantUserIds) {
      setSelectedParticipants(event.participantUserIds);
    } else {
      setSelectedParticipants([]);
    }
    
    setEditModalOpen(true);
  };

  const selectedDateEvents = getEventsForDate(selectedDate);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      {/* Page Title */}
      <View style={styles.pageTitleContainer}>
        <View style={styles.pageTitleRow}>
          <Text style={styles.pageTitle}>Calendrier</Text>
          <TouchableOpacity
            style={styles.helpButton}
            onPress={() => setTutorialModalOpen(true)}
          >
            <Ionicons name="help-circle-outline" size={24} color="#7c3aed" />
          </TouchableOpacity>
        </View>
      </View>

      {/* View Mode Toggle */}
      <View style={styles.viewToggleContainer}>
        <View style={styles.viewToggleRow}>
          <TouchableOpacity 
            style={[styles.viewToggleButton, viewMode === 'month' && styles.viewToggleButtonActive]}
            onPress={() => saveViewMode('month')}
          >
            <Ionicons name="calendar" size={20} color={viewMode === 'month' ? '#ffffff' : '#6b7280'} />
            <Text style={[styles.viewToggleNumber, viewMode === 'month' && styles.viewToggleNumberActive]}>Mois</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.viewToggleButton, viewMode === 'week' && styles.viewToggleButtonActive]}
            onPress={() => saveViewMode('week')}
          >
            <Ionicons name="calendar-number" size={20} color={viewMode === 'week' ? '#ffffff' : '#6b7280'} />
            <Text style={[styles.viewToggleNumber, viewMode === 'week' && styles.viewToggleNumberActive]}>Semaine</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.viewToggleButton, viewMode === 'day' && styles.viewToggleButtonActive]}
            onPress={() => saveViewMode('day')}
          >
            <Ionicons name="today" size={20} color={viewMode === 'day' ? '#ffffff' : '#6b7280'} />
            <Text style={[styles.viewToggleNumber, viewMode === 'day' && styles.viewToggleNumberActive]}>Jour</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.viewToggleButton, viewMode === 'agenda' && styles.viewToggleButtonActive]}
            onPress={() => saveViewMode('agenda')}
          >
            <Ionicons name="list" size={20} color={viewMode === 'agenda' ? '#ffffff' : '#6b7280'} />
            <Text style={[styles.viewToggleNumber, viewMode === 'agenda' && styles.viewToggleNumberActive]}>Agenda</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Action Buttons Row */}
      <View style={styles.actionButtonsContainer}>
        {/* Filtres */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setFilterModalOpen(true)}
        >
          <Ionicons name="filter" size={24} color="#7c3aed" />
          {categoryFilter && <View style={styles.actionButtonBadge} />}
        </TouchableOpacity>

        {/* Recherche */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setSearchModalOpen(true)}
        >
          <Ionicons name="search" size={24} color="#7c3aed" />
          {(searchQuery || searchStartDate || searchEndDate) && <View style={styles.actionButtonBadge} />}
        </TouchableOpacity>

        {/* Import ICS */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleImportIcs}
        >
          <Ionicons name="cloud-download-outline" size={24} color="#7c3aed" />
        </TouchableOpacity>

        {/* Abonnement URL */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setSubscribeUrlModalOpen(true)}
        >
          <Ionicons name="link-outline" size={24} color="#7c3aed" />
        </TouchableOpacity>
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
            {emptyDays.map((_, index) => (
              <View key={`empty-${index}`} style={styles.dayCell} />
            ))}
            {daysInMonth.map((day, index) => {
              const hasEvents = getEventsForDate(day).length > 0;
              const isSelected = isSameDay(day, selectedDate);
              const isTodayDate = isToday(day);

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                    isTodayDate && styles.dayCellToday,
                  ]}
                  onPress={() => {
                    setSelectedDate(day);
                    const dayEvents = (events || []).filter(e => isSameDay(new Date(e.startDate), day));
                    if (dayEvents.length === 0) {
                      // Jour vide : Ouvrir modal création
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
                >
                  <Text style={[
                    styles.dayText,
                    isTodayDate && !isSelected && styles.dayTextToday,
                    isSelected && styles.dayTextSelected,
                  ]}>
                    {format(day, 'd')}
                  </Text>
                  {hasEvents && <View style={styles.eventUnderline} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Events for selected date */}
        <View style={styles.eventsSection}>
          <Text style={styles.eventsTitle}>
            {format(selectedDate, 'EEEE d MMMM', { locale: getLocale() })}
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
                        {format(new Date(event.startDate), 'HH:mm')}
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
                .filter(event => new Date(event.startDate) >= new Date())
                .filter(event => !categoryFilter || event.category === categoryFilter)
                .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                .map((event, index, arr) => {
                  const eventDate = new Date(event.startDate);
                  const prevEventDate = index > 0 ? new Date(arr[index - 1].startDate) : null;
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
                      const eventDate = new Date(event.startDate);
                      return isSameDay(eventDate, day) && eventDate.getHours() === hour;
                    });

                    return (
                      <View key={day.toString()} style={styles.weekDayColumn}>
                        {dayEvents.map(event => {
                          const category = getCategoryInfo(event.category);
                          const startTime = new Date(event.startDate);
                          const endTime = new Date(startTime.getTime() + (event.durationMinutes || 60) * 60000);
                          const durationMinutes = event.durationMinutes || 60;
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
                  const eventDate = new Date(event.startDate);
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
                        const startTime = new Date(event.startDate);
                        const endTime = new Date(startTime.getTime() + (event.durationMinutes || 60) * 60000);
                        const durationMinutes = event.durationMinutes || 60;
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
              <Text style={styles.label}>Titre</Text>
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

              <Text style={styles.label}>Catégorie</Text>
              <View style={styles.categoryGrid}>
                {EVENT_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.categoryGridButton,
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
              </View>

              {familyMembers && familyMembers.length > 0 && (
                <>
                  <Text style={styles.label}>Participants</Text>
                  <View style={styles.participantsContainer}>
                    {familyMembers.map((member: any) => (
                      <TouchableOpacity
                        key={member.userId}
                        style={styles.participantCheckbox}
                        onPress={() => {
                          setSelectedParticipants(prev => 
                            prev.includes(member.userId)
                              ? prev.filter(id => id !== member.userId)
                              : [...prev, member.userId]
                          );
                        }}
                      >
                        <View style={[
                          styles.checkbox,
                          selectedParticipants.includes(member.userId) && styles.checkboxChecked
                        ]}>
                          {selectedParticipants.includes(member.userId) && (
                            <Text style={styles.checkboxMark}>✓</Text>
                          )}
                        </View>
                        <Text style={styles.participantName}>{member.userName || 'Membre'}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <Text style={styles.label}>Date de début</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.datePickerText}>
                  {format(selectedDate, 'EEEE d MMMM yyyy', { locale: getLocale() })}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#7c3aed" />
              </TouchableOpacity>

              <Text style={styles.label}>Date de fin (optionnel)</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Text style={styles.datePickerText}>
                  {formData.endDate ? format(formData.endDate, 'EEEE d MMMM yyyy', { locale: getLocale() }) : 'Aucune (événement d\'un jour)'}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#7c3aed" />
              </TouchableOpacity>
              {formData.endDate && (
                <TouchableOpacity
                  style={styles.clearEndDateButton}
                  onPress={() => setFormData(prev => ({ ...prev, endDate: null }))}
                >
                  <Text style={styles.clearEndDateText}>Effacer la date de fin</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setFormData(prev => ({ ...prev, allDay: !prev.allDay }))}
              >
                <View style={[styles.checkbox, formData.allDay && styles.checkboxChecked]}>
                  {formData.allDay && <Text style={styles.checkboxIcon}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>Toute la journée</Text>
              </TouchableOpacity>

              {!formData.allDay && (
                <>
                  <Text style={styles.label}>{t('calendar.startTime')}</Text>
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => setShowStartTimePicker(true)}
                  >
                    <Text style={styles.datePickerText}>{formData.startTime || '09:00'}</Text>
                    <Ionicons name="time-outline" size={20} color="#7c3aed" />
                  </TouchableOpacity>

                  <Text style={styles.label}>{t('calendar.endTime')}</Text>
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => setShowEndTimePicker(true)}
                  >
                    <Text style={styles.datePickerText}>{formData.endTime || '10:00'}</Text>
                    <Ionicons name="time-outline" size={20} color="#7c3aed" />
                  </TouchableOpacity>
                </>
              )}

              <Text style={styles.label}>Rappel</Text>
              <View style={styles.reminderRow}>
                <TextInput
                  style={[styles.input, styles.reminderInput]}
                  value={formData.reminder}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, reminder: text }))}
                  keyboardType="numeric"
                  placeholder="15"
                />
                <View style={styles.reminderUnitContainer}>
                  {['minutes', 'heures', 'jours'].map((unit) => (
                    <TouchableOpacity
                      key={unit}
                      style={[
                        styles.reminderUnitButton,
                        formData.reminderUnit === unit && styles.reminderUnitButtonActive,
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, reminderUnit: unit }))}
                    >
                      <Text style={[
                        styles.reminderUnitText,
                        formData.reminderUnit === unit && styles.reminderUnitTextActive,
                      ]}>
                        {unit}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Text style={styles.label}>Récurrence</Text>
              <View style={styles.recurrenceContainer}>
                {[
                  { value: 'none', label: 'Aucune' },
                  { value: 'daily', label: 'Journalier' },
                  { value: 'weekly', label: 'Hebdo' },
                  { value: 'monthly', label: 'Mensuel' },
                  { value: 'yearly', label: 'Annuel' },
                ].map((rec) => (
                  <TouchableOpacity
                    key={rec.value}
                    style={[
                      styles.recurrenceButton,
                      formData.recurrence === rec.value && styles.recurrenceButtonActive,
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, recurrence: rec.value }))}
                  >
                    <Text style={[
                      styles.recurrenceText,
                      formData.recurrence === rec.value && styles.recurrenceTextActive,
                    ]}>
                      {rec.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setFormData(prev => ({ ...prev, isPrivate: !prev.isPrivate }))}
              >
                <View style={[styles.checkbox, formData.isPrivate && styles.checkboxChecked]}>
                  {formData.isPrivate && <Text style={styles.checkboxMark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>🔒 Événement privé</Text>
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
                <Ionicons name="close-circle-outline" size={28} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleCreateEvent}
              >
                <Ionicons name="save-outline" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* DateTimePicker */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) {
              setSelectedDate(date);
            }
          }}
        />
      )}

      {/* Start Time Picker */}
      {showStartTimePicker && (
        <DateTimePicker
          value={new Date(`2000-01-01T${formData.startTime}:00`)}
          mode="time"
          display="default"
          onChange={(event, time) => {
            setShowStartTimePicker(false);
            if (time) {
              const hours = time.getHours().toString().padStart(2, '0');
              const minutes = time.getMinutes().toString().padStart(2, '0');
              setFormData(prev => ({ ...prev, startTime: `${hours}:${minutes}` }));
            }
          }}
        />
      )}

      {/* End Time Picker */}
      {showEndTimePicker && (
        <DateTimePicker
          value={new Date(`2000-01-01T${formData.endTime}:00`)}
          mode="time"
          display="default"
          onChange={(event, time) => {
            setShowEndTimePicker(false);
            if (time) {
              const hours = time.getHours().toString().padStart(2, '0');
              const minutes = time.getMinutes().toString().padStart(2, '0');
              setFormData(prev => ({ ...prev, endTime: `${hours}:${minutes}` }));
            }
          }}
        />
      )}

      {/* Edit Event Modal */}
      <Modal visible={editModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('common.edit')}</Text>
            
            <ScrollView style={styles.modalForm}>
              <Text style={styles.label}>Titre</Text>
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

              <Text style={styles.label}>Catégorie</Text>
              <View style={styles.categoryGrid}>
                {EVENT_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.categoryGridButton,
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
              </View>

              {familyMembers && familyMembers.length > 0 && (
                <>
                  <Text style={styles.label}>Participants</Text>
                  <View style={styles.participantsContainer}>
                    {familyMembers.map((member: any) => (
                      <TouchableOpacity
                        key={member.userId}
                        style={styles.participantCheckbox}
                        onPress={() => {
                          setSelectedParticipants(prev => 
                            prev.includes(member.userId)
                              ? prev.filter(id => id !== member.userId)
                              : [...prev, member.userId]
                          );
                        }}
                      >
                        <View style={[
                          styles.checkbox,
                          selectedParticipants.includes(member.userId) && styles.checkboxChecked
                        ]}>
                          {selectedParticipants.includes(member.userId) && (
                            <Text style={styles.checkboxMark}>✓</Text>
                          )}
                        </View>
                        <Text style={styles.participantName}>{member.userName || 'Membre'}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <Text style={styles.label}>Date de début</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.datePickerText}>
                  {format(selectedDate, 'EEEE d MMMM yyyy', { locale: getLocale() })}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#7c3aed" />
              </TouchableOpacity>

              <Text style={styles.label}>Date de fin (optionnel)</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Text style={styles.datePickerText}>
                  {formData.endDate ? format(formData.endDate, 'EEEE d MMMM yyyy', { locale: getLocale() }) : 'Aucune (événement d\'un jour)'}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#7c3aed" />
              </TouchableOpacity>
              {formData.endDate && (
                <TouchableOpacity
                  style={styles.clearEndDateButton}
                  onPress={() => setFormData(prev => ({ ...prev, endDate: null }))}
                >
                  <Text style={styles.clearEndDateText}>Effacer la date de fin</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setFormData(prev => ({ ...prev, allDay: !prev.allDay }))}
              >
                <View style={[styles.checkbox, formData.allDay && styles.checkboxChecked]}>
                  {formData.allDay && <Text style={styles.checkboxMark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>Toute la journée</Text>
              </TouchableOpacity>

              {!formData.allDay && (
                <>
                  <Text style={styles.label}>{t('calendar.startTime')}</Text>
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => setShowStartTimePicker(true)}
                  >
                    <Text style={styles.datePickerText}>{formData.startTime || '09:00'}</Text>
                    <Ionicons name="time-outline" size={20} color="#7c3aed" />
                  </TouchableOpacity>

                  <Text style={styles.label}>{t('calendar.endTime')}</Text>
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => setShowEndTimePicker(true)}
                  >
                    <Text style={styles.datePickerText}>{formData.endTime || '10:00'}</Text>
                    <Ionicons name="time-outline" size={20} color="#7c3aed" />
                  </TouchableOpacity>
                </>
              )}

              <Text style={styles.label}>Rappel</Text>
              <View style={styles.reminderRow}>
                <TextInput
                  style={[styles.input, styles.reminderInput]}
                  value={formData.reminder}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, reminder: text }))}
                  keyboardType="numeric"
                  placeholder="15"
                />
                <View style={styles.reminderUnitContainer}>
                  {['minutes', 'heures', 'jours'].map((unit) => (
                    <TouchableOpacity
                      key={unit}
                      style={[
                        styles.reminderUnitButton,
                        formData.reminderUnit === unit && styles.reminderUnitButtonActive,
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, reminderUnit: unit }))}
                    >
                      <Text style={[
                        styles.reminderUnitText,
                        formData.reminderUnit === unit && styles.reminderUnitTextActive,
                      ]}>
                        {unit}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Text style={styles.label}>Récurrence</Text>
              <View style={styles.recurrenceContainer}>
                {[
                  { value: 'none', label: 'Aucune' },
                  { value: 'daily', label: 'Journalier' },
                  { value: 'weekly', label: 'Hebdo' },
                  { value: 'monthly', label: 'Mensuel' },
                  { value: 'yearly', label: 'Annuel' },
                ].map((rec) => (
                  <TouchableOpacity
                    key={rec.value}
                    style={[
                      styles.recurrenceButton,
                      formData.recurrence === rec.value && styles.recurrenceButtonActive,
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, recurrence: rec.value }))}
                  >
                    <Text style={[
                      styles.recurrenceText,
                      formData.recurrence === rec.value && styles.recurrenceTextActive,
                    ]}>
                      {rec.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setFormData(prev => ({ ...prev, isPrivate: !prev.isPrivate }))}
              >
                <View style={[styles.checkbox, formData.isPrivate && styles.checkboxChecked]}>
                  {formData.isPrivate && <Text style={styles.checkboxMark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>🔒 Événement privé</Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonDelete]}
                onPress={handleDeleteEvent}
              >
                <Ionicons name="trash-outline" size={28} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setEditModalOpen(false);
                  setSelectedEvent(null);
                  resetForm();
                }}
              >
                <Ionicons name="close-circle-outline" size={28} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleUpdateEvent}
              >
                <Ionicons name="save-outline" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Dropdown Modal */}
      <Modal visible={dropdownModalOpen} animationType="slide" transparent>
        <View style={styles.dropdownOverlay}>
          <View style={styles.dropdownContent}>
            <Text style={styles.dropdownTitle}>
              {format(selectedDate, 'EEEE d MMMM', { locale: getLocale() })}
            </Text>
            
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
              <Text style={styles.dropdownAddButtonText}>+ Ajouter un événement</Text>
            </TouchableOpacity>

            <ScrollView style={styles.dropdownEventsList}>
              {selectedDateEvents.map(event => {
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
                          {format(new Date(event.startDate), 'HH:mm')} - {format(new Date(new Date(event.startDate).getTime() + (event.durationMinutes || 60) * 60000), 'HH:mm')}
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

            <TouchableOpacity
              style={styles.dropdownCloseButton}
              onPress={() => setDropdownModalOpen(false)}
            >
              <Text style={styles.dropdownCloseButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal
        visible={filterModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFilterModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModalContent}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Filtres par catégorie</Text>
              <TouchableOpacity onPress={() => setFilterModalOpen(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filterModalList}>
              <TouchableOpacity
                style={[styles.filterModalButton, !categoryFilter && styles.filterModalButtonActive]}
                onPress={() => {
                  setCategoryFilter(null);
                  setFilterModalOpen(false);
                }}
              >
                <Text style={styles.filterModalIcon}>📋</Text>
                <Text style={[styles.filterModalButtonText, !categoryFilter && styles.filterModalButtonTextActive]}>
                  Tout afficher
                </Text>
                {!categoryFilter && <Ionicons name="checkmark" size={24} color="#7c3aed" />}
              </TouchableOpacity>

              {EVENT_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.filterModalButton,
                    categoryFilter === cat.value && styles.filterModalButtonActive
                  ]}
                  onPress={() => {
                    setCategoryFilter(cat.value);
                    setFilterModalOpen(false);
                  }}
                >
                  <Text style={styles.filterModalIcon}>{cat.icon}</Text>
                  <Text style={[
                    styles.filterModalButtonText,
                    categoryFilter === cat.value && styles.filterModalButtonTextActive
                  ]}>
                    {getCategoryLabel(cat)}
                  </Text>
                  {categoryFilter === cat.value && <Ionicons name="checkmark" size={24} color={cat.color} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Search Modal */}
      <Modal
        visible={searchModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSearchModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.searchModalContent}>
            <View style={styles.searchModalHeader}>
              <Text style={styles.searchModalTitle}>Rechercher un événement</Text>
              <TouchableOpacity onPress={() => setSearchModalOpen(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.searchModalSubtitle}>Filtrez les événements par titre, description ou plage de dates</Text>

            {/* Search Input */}
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color="#6b7280" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher..."
                placeholderTextColor="#9ca3af"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Date Range */}
            <View style={styles.searchDateRow}>
              <View style={styles.searchDateColumn}>
                <Text style={styles.searchDateLabel}>Date de début</Text>
                <TouchableOpacity
                  style={styles.searchDateButton}
                  onPress={() => setShowSearchStartDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={18} color="#7c3aed" />
                  <Text style={styles.searchDateButtonText}>
                    {searchStartDate ? format(searchStartDate, 'dd/MM/yyyy') : 'Du...'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.searchDateColumn}>
                <Text style={styles.searchDateLabel}>Date de fin</Text>
                <TouchableOpacity
                  style={styles.searchDateButton}
                  onPress={() => setShowSearchEndDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={18} color="#7c3aed" />
                  <Text style={styles.searchDateButtonText}>
                    {searchEndDate ? format(searchEndDate, 'dd/MM/yyyy') : 'Au...'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.searchModalButtons}>
              <TouchableOpacity
                style={styles.searchResetButton}
                onPress={() => {
                  setSearchQuery('');
                  setSearchStartDate(null);
                  setSearchEndDate(null);
                }}
              >
                <Text style={styles.searchResetButtonText}>Réinitialiser</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.searchApplyButton}
                onPress={() => setSearchModalOpen(false)}
              >
                <Text style={styles.searchApplyButtonText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Pickers for Search */}
      {showSearchStartDatePicker && (
        <DateTimePicker
          value={searchStartDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowSearchStartDatePicker(false);
            if (date) setSearchStartDate(date);
          }}
        />
      )}

      {showSearchEndDatePicker && (
        <DateTimePicker
          value={searchEndDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowSearchEndDatePicker(false);
            if (date) setSearchEndDate(date);
          }}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={formData.endDate || selectedDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowEndDatePicker(false);
            if (date) setFormData(prev => ({ ...prev, endDate: date }));
          }}
        />
      )}

      {/* Tutorial Modal */}
      <Modal
        visible={tutorialModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setTutorialModalOpen(false)}
      >
        <View style={styles.tutorialOverlay}>
          <View style={styles.tutorialModal}>
            <View style={styles.tutorialHeader}>
              <Text style={styles.tutorialTitle}>Guide du Calendrier</Text>
              <TouchableOpacity onPress={() => setTutorialModalOpen(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.tutorialContent}>
              <View style={styles.tutorialSection}>
                <Text style={styles.tutorialSectionTitle}>📅 Vues du calendrier</Text>
                <Text style={styles.tutorialText}>• <Text style={styles.tutorialBold}>Mois</Text> : Vue mensuelle avec tous les événements</Text>
                <Text style={styles.tutorialText}>• <Text style={styles.tutorialBold}>Semaine</Text> : Vue hebdomadaire détaillée</Text>
                <Text style={styles.tutorialText}>• <Text style={styles.tutorialBold}>Jour</Text> : Vue journalière avec timeline</Text>
                <Text style={styles.tutorialText}>• <Text style={styles.tutorialBold}>Agenda</Text> : Liste chronologique des événements à venir</Text>
              </View>

              <View style={styles.tutorialSection}>
                <Text style={styles.tutorialSectionTitle}>➕ Créer un événement</Text>
                <Text style={styles.tutorialText}>• Cliquez sur un jour vide pour créer un événement</Text>
                <Text style={styles.tutorialText}>• Remplissez le titre, description, heure, catégorie</Text>
                <Text style={styles.tutorialText}>• Invitez des participants de votre famille</Text>
                <Text style={styles.tutorialText}>• Configurez un rappel et la récurrence</Text>
              </View>

              <View style={styles.tutorialSection}>
                <Text style={styles.tutorialSectionTitle}>✏️ Modifier un événement</Text>
                <Text style={styles.tutorialText}>• Cliquez sur un événement existant</Text>
                <Text style={styles.tutorialText}>• Modifiez les informations souhaitées</Text>
                <Text style={styles.tutorialText}>• Utilisez l'icône 💾 pour enregistrer</Text>
                <Text style={styles.tutorialText}>• Utilisez l'icône 🗑️ pour supprimer</Text>
              </View>

              <View style={styles.tutorialSection}>
                <Text style={styles.tutorialSectionTitle}>🔍 Filtres et recherche</Text>
                <Text style={styles.tutorialText}>• <Text style={styles.tutorialBold}>Filtres</Text> : Filtrez par catégorie (Repas, Anniversaire, etc.)</Text>
                <Text style={styles.tutorialText}>• <Text style={styles.tutorialBold}>Recherche</Text> : Recherchez par titre, description ou plage de dates</Text>
                <Text style={styles.tutorialText}>• Combinez filtres et recherche pour affiner les résultats</Text>
              </View>

              <View style={styles.tutorialSection}>
                <Text style={styles.tutorialSectionTitle}>🎨 Catégories</Text>
                <Text style={styles.tutorialText}>• 🍽️ Repas • 🎂 Anniversaire • 💼 Travail</Text>
                <Text style={styles.tutorialText}>• ❤️ Personnel • ⚽ Sport • 📅 Autre</Text>
                <Text style={styles.tutorialText}>Chaque catégorie a une couleur pour faciliter la visualisation</Text>
              </View>

              <View style={styles.tutorialSection}>
                <Text style={styles.tutorialSectionTitle}>🔔 Rappels</Text>
                <Text style={styles.tutorialText}>• Configurez un rappel en minutes, heures ou jours</Text>
                <Text style={styles.tutorialText}>• Recevez une notification avant l'événement</Text>
              </View>

              <View style={styles.tutorialSection}>
                <Text style={styles.tutorialSectionTitle}>🔁 Récurrence</Text>
                <Text style={styles.tutorialText}>• Aucune : Événement unique</Text>
                <Text style={styles.tutorialText}>• Journalier : Tous les jours</Text>
                <Text style={styles.tutorialText}>• Hebdomadaire : Toutes les semaines</Text>
                <Text style={styles.tutorialText}>• Mensuel : Tous les mois</Text>
                <Text style={styles.tutorialText}>• Annuel : Tous les ans</Text>
              </View>

              <View style={styles.tutorialSection}>
                <Text style={styles.tutorialSectionTitle}>👥 Participants</Text>
                <Text style={styles.tutorialText}>• Invitez des membres de votre famille aux événements</Text>
                <Text style={styles.tutorialText}>• Cochez les participants lors de la création/édition</Text>
              </View>

              <View style={styles.tutorialSection}>
                <Text style={styles.tutorialSectionTitle}>🔒 Événements privés</Text>
                <Text style={styles.tutorialText}>• Marquez un événement comme privé</Text>
                <Text style={styles.tutorialText}>• Seul vous pourrez le voir</Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.tutorialCloseButton}
              onPress={() => setTutorialModalOpen(false)}
            >
              <Text style={styles.tutorialCloseButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Abonnement URL */}
      <Modal
        visible={subscribeUrlModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSubscribeUrlModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.searchModalContent}>
            <View style={styles.searchModalHeader}>
              <Text style={styles.searchModalTitle}>S'abonner à un calendrier</Text>
              <TouchableOpacity onPress={() => setSubscribeUrlModalOpen(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 20 }}>
              <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 12 }}>
                Entrez l'URL de votre calendrier (Google Calendar, Outlook, etc.)
              </Text>
              
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#d1d5db',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 14,
                  marginBottom: 20,
                }}
                placeholder="https://calendar.google.com/..."
                placeholderTextColor="#9ca3af"
                value={calendarUrl}
                onChangeText={setCalendarUrl}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => {
                    setSubscribeUrlModalOpen(false);
                    setCalendarUrl('');
                  }}
                >
                  <Text style={styles.modalButtonTextCancel}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSave]}
                  onPress={handleSubscribeUrl}
                >
                  <Text style={styles.modalButtonTextSave}>S'abonner</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDark ? '#000000' : '#f9fafb' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: isDark ? '#2a2a2a' : '#fff', borderBottomWidth: 1, borderBottomColor: isDark ? '#ffffff' : '#e5e7eb' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: isDark ? '#ffffff' : '#1f2937' },
  addButton: { backgroundColor: '#7c3aed', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  addButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  content: { flex: 1 },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: isDark ? '#2a2a2a' : '#fff', marginTop: 10, marginHorizontal: 10, borderRadius: 12 },
  navButton: { padding: 10 },
  navButtonText: { fontSize: 24, color: '#7c3aed', fontWeight: 'bold' },
  monthTitle: { fontSize: 16, fontWeight: 'bold', color: isDark ? '#ffffff' : '#1f2937', textTransform: 'capitalize' },
  calendar: { backgroundColor: isDark ? '#2a2a2a' : '#fff', margin: 10, borderRadius: 12, padding: 10 },
  weekRow: { flexDirection: 'row', marginBottom: 10 },
  dayHeader: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  dayHeaderText: { fontSize: 14, fontWeight: '600', color: isDark ? '#f5f5dc' : '#6b7280' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1.2, justifyContent: 'center', alignItems: 'center', borderRadius: 8, marginBottom: 5 },
  dayCellSelected: { backgroundColor: '#7c3aed' },
  dayCellToday: { borderWidth: 2, borderColor: '#7c3aed' },
  dayText: { fontSize: 16, color: isDark ? '#ffffff' : '#1f2937' },
  dayTextSelected: { color: '#fff', fontWeight: 'bold' },
  dayTextToday: { color: '#7c3aed', fontWeight: 'bold' },
  eventUnderline: { 
    width: 24, 
    height: 3, 
    borderRadius: 1.5, 
    backgroundColor: '#7c3aed', 
    position: 'absolute', 
    bottom: 6,
  },
  eventsSection: { margin: 10, backgroundColor: isDark ? '#2a2a2a' : '#fff', borderRadius: 12, padding: 20 },
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
  modalContent: { backgroundColor: isDark ? '#2a2a2a' : '#fff', borderRadius: 12, padding: 24, width: '95%', maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: isDark ? '#ffffff' : '#1f2937', marginBottom: 16 },
  modalForm: { maxHeight: 600 },
  label: { fontSize: 14, fontWeight: '600', color: isDark ? '#ffffff' : '#374151', marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: isDark ? '#000000' : '#f9fafb', borderWidth: 1, borderColor: isDark ? '#ffffff' : '#e5e7eb', borderRadius: 8, padding: 12, fontSize: 16, color: isDark ? '#ffffff' : '#1f2937' },
  textArea: { height: 80, textAlignVertical: 'top' },
  datePickerButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: isDark ? '#000000' : '#f9fafb', borderWidth: 1, borderColor: isDark ? '#ffffff' : '#e5e7eb', borderRadius: 8, padding: 12, marginBottom: 8 },
  datePickerText: { fontSize: 16, color: isDark ? '#ffffff' : '#1f2937', flex: 1 },
  datePickerIcon: { fontSize: 20 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 8, gap: 8 },
  categoryGridButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: isDark ? '#ffffff' : '#e5e7eb', backgroundColor: isDark ? '#2a2a2a' : '#fff', width: '48%' },
  categoryIcon: { fontSize: 18, marginRight: 6 },
  categoryLabel: { fontSize: 14, color: isDark ? '#f5f5dc' : '#6b7280', flex: 1 },
  categoryLabelSelected: { color: '#fff', fontWeight: '600' },
  reminderRow: { flexDirection: 'row', gap: 8, marginVertical: 8 },
  reminderInput: { flex: 1 },
  reminderUnitContainer: { flex: 2, flexDirection: 'row', gap: 4 },
  reminderUnitButton: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: isDark ? '#ffffff' : '#e5e7eb', backgroundColor: isDark ? '#2a2a2a' : '#fff', alignItems: 'center' },
  reminderUnitButtonActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  reminderUnitText: { fontSize: 12, color: isDark ? '#f5f5dc' : '#6b7280' },
  reminderUnitTextActive: { color: '#fff', fontWeight: '600' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  checkbox: { width: 24, height: 24, borderRadius: 4, borderWidth: 2, borderColor: isDark ? '#ffffff' : '#d1d5db', marginRight: 8, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  checkboxIcon: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  checkmark: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  checkboxLabel: { fontSize: 16, color: isDark ? '#ffffff' : '#374151' },
  modalButtons: { flexDirection: 'row', marginTop: 20, gap: 8 },
  modalButton: { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center' },
  modalButtonCancel: { backgroundColor: '#6b7280' },
  modalButtonSave: { backgroundColor: '#7c3aed' },
  modalButtonDelete: { backgroundColor: '#ef4444' },
  modalButtonTextCancel: { color: '#f5f5dc', fontSize: 16, fontWeight: '600' },
  modalButtonTextSave: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalButtonTextDelete: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalButtonIcon: { fontSize: 28 },
  
  participantsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  participantCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#1f2937' : '#f9fafb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: isDark ? '#374151' : '#e5e7eb',
  },
  participantName: {
    fontSize: 14,
    color: isDark ? '#ffffff' : '#1f2937',
    marginLeft: 8,
  },

  pageTitleContainer: {
    backgroundColor: isDark ? '#1f2937' : '#fff',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#374151' : '#e5e7eb',
  },
  pageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: isDark ? '#ffffff' : '#1f2937',
  },
  helpButton: {
    padding: 4,
  },

  // View Toggle Styles
  viewToggleContainer: {
    backgroundColor: isDark ? '#1f2937' : '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#374151' : '#e5e7eb',
  },
  viewToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  viewToggleButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: isDark ? '#374151' : '#f3f4f6',
    alignItems: 'center',
  },
  viewToggleButtonActive: {
    backgroundColor: '#7c3aed',
  },
  viewToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: isDark ? '#f5f5dc' : '#6b7280',
  },
  viewToggleTextActive: {
    color: '#ffffff',
  },

  // Action Buttons Styles
  actionButtonsContainer: {
    backgroundColor: isDark ? '#1f2937' : '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#374151' : '#e5e7eb',
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: isDark ? '#374151' : '#f3f4f6',
    borderWidth: 1,
    borderColor: isDark ? '#4b5563' : '#e5e7eb',
    position: 'relative',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: isDark ? '#f5f5dc' : '#374151',
    marginTop: 4,
  },
  actionButtonTextDisabled: {
    color: '#9ca3af',
  },
  actionButtonBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7c3aed',
  },

  // Filter Modal Styles
  filterModalContent: {
    backgroundColor: isDark ? '#1f2937' : '#fff',
    borderRadius: 16,
    padding: 20,
    width: '85%',
    maxHeight: '70%',
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#374151' : '#e5e7eb',
  },
  filterModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: isDark ? '#ffffff' : '#1f2937',
  },
  filterModalList: {
    maxHeight: 400,
  },
  filterModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: isDark ? '#374151' : '#f9fafb',
  },
  filterModalButtonActive: {
    backgroundColor: isDark ? '#4b5563' : '#ede9fe',
  },
  filterModalIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  filterModalButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: isDark ? '#f5f5dc' : '#374151',
    flex: 1,
  },
  filterModalButtonTextActive: {
    fontWeight: '600',
    color: '#7c3aed',
  },

  // Search Modal Styles
  searchModalContent: {
    backgroundColor: isDark ? '#1f2937' : '#fff',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  searchModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  searchModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: isDark ? '#ffffff' : '#1f2937',
  },
  searchModalSubtitle: {
    fontSize: 14,
    color: isDark ? '#9ca3af' : '#6b7280',
    marginBottom: 20,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#374151' : '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: isDark ? '#4b5563' : '#e5e7eb',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: isDark ? '#ffffff' : '#1f2937',
  },
  searchDateRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  searchDateColumn: {
    flex: 1,
  },
  searchDateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: isDark ? '#f5f5dc' : '#374151',
    marginBottom: 8,
  },
  searchDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: isDark ? '#374151' : '#f9fafb',
    borderWidth: 1,
    borderColor: isDark ? '#4b5563' : '#e5e7eb',
    gap: 8,
  },
  searchDateButtonText: {
    fontSize: 14,
    color: isDark ? '#f5f5dc' : '#6b7280',
  },
  searchModalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  searchResetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: isDark ? '#374151' : '#f3f4f6',
    alignItems: 'center',
  },
  searchResetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: isDark ? '#f5f5dc' : '#6b7280',
  },
  searchApplyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
  },
  searchApplyButtonText: {
    fontSize: 16,
    fontWeight: '600',
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

  // Toggle Icon/Number Styles
  viewToggleIcon: {
    fontSize: 20,
    color: isDark ? '#9ca3af' : '#6b7280',
  },
  viewToggleIconActive: {
    color: '#fff',
  },
  viewToggleNumber: {
    fontSize: 11,
    fontWeight: '600',
    color: isDark ? '#9ca3af' : '#6b7280',
    marginTop: 2,
  },
  viewToggleNumberActive: {
    color: '#fff',
  },

  // Recurrence Styles
  recurrenceContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  recurrenceButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: isDark ? '#374151' : '#f3f4f6',
    borderWidth: 1,
    borderColor: isDark ? '#4b5563' : '#e5e7eb',
  },
  recurrenceButtonActive: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  recurrenceText: {
    fontSize: 13,
    fontWeight: '500',
    color: isDark ? '#d1d5db' : '#374151',
  },
  recurrenceTextActive: {
    color: '#fff',
  },

  // Help Button
  helpButton: {
    marginLeft: 8,
  },

  // Tutorial Modal Styles
  tutorialOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  tutorialModal: {
    backgroundColor: isDark ? '#1f2937' : '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  tutorialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#374151' : '#e5e7eb',
  },
  tutorialTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: isDark ? '#fff' : '#1f2937',
  },
  tutorialContent: {
    padding: 20,
  },
  tutorialSection: {
    marginBottom: 20,
  },
  tutorialSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: isDark ? '#fff' : '#1f2937',
    marginBottom: 8,
  },
  tutorialText: {
    fontSize: 14,
    color: isDark ? '#d1d5db' : '#4b5563',
    marginBottom: 4,
    lineHeight: 20,
  },
  tutorialBold: {
    fontWeight: 'bold',
    color: isDark ? '#fff' : '#1f2937',
  },
  tutorialCloseButton: {
    backgroundColor: '#7c3aed',
    padding: 16,
    margin: 20,
    marginTop: 0,
    borderRadius: 8,
    alignItems: 'center',
  },
  tutorialCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Clear End Date Button
  clearEndDateButton: {
    marginTop: 8,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  clearEndDateText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
  },
});

