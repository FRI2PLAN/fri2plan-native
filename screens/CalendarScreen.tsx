import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, Modal, TextInput, Alert, Dimensions, Platform, Linking } from 'react-native';
import { CalendarSkeleton } from '../components/SkeletonLoader';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../contexts/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import * as DocumentPicker from 'expo-document-picker';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, isToday, addMonths, subMonths, addDays, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameHour } from 'date-fns';
import { fr, de, enUS } from 'date-fns/locale';
import { trpc } from '../lib/trpc';
import { useAuth } from '../contexts/AuthContext';
import { useFamily } from '../contexts/FamilyContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Parser une date stockée en base en objet Date JS.
 *
 * @param dateStr  - La string de date (format MySQL DATETIME)
 * @param isUtc    - true si la date est en UTC (import iCal), false si heure locale (création manuelle)
 *
 * Deux cas :
 *  - isUtc = false (défaut) : heure locale (création manuelle '2026-05-04 17:00:00')
 *    → on parse les composants manuellement pour forcer l'heure locale de l'appareil.
 *  - isUtc = true : UTC (import iCal '2026-05-04 15:00:00' qui représente 17:00 à Zurich)
 *    → on ajoute le Z et new Date() convertit automatiquement en heure locale de l'appareil.
 *
 * Cette approche fonctionne quel que soit le fuseau horaire de l'utilisateur.
 */
function parseLocalDate(dateStr: string | undefined | null, isUtc?: boolean): Date {
  if (!dateStr) return new Date();
  // Normaliser : remplacer espace par T si nécessaire
  const s = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
  // Si isUtc=true, la date est en UTC : ajouter Z pour que new Date() convertisse en heure locale
  if (isUtc) {
    const utcStr = s.endsWith('Z') ? s : s + 'Z';
    return new Date(utcStr);
  }
  // Sinon, c'est une heure locale (création manuelle) :
  // on parse les composants manuellement pour éviter l'interprétation UTC
  // par Android/Hermes qui traite les strings ISO sans Z comme UTC.
  const [datePart, timePart = '00:00:00'] = s.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes, seconds = 0] = timePart.replace('Z', '').split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, seconds);
}

const EVENT_CATEGORIES = [
  { value: 'meal', label: 'Repas', labelEn: 'Meal', labelDe: 'Mahlzeit', icon: '🍽️', color: '#f59e0b' },
  { value: 'birthday', label: 'Anniversaire', labelEn: 'Birthday', labelDe: 'Geburtstag', icon: '🎂', color: '#ec4899' },
  { value: 'work', label: 'Travail', labelEn: 'Work', labelDe: 'Arbeit', icon: '💼', color: '#3b82f6' },
  { value: 'personal', label: 'Personnel', labelEn: 'Personal', labelDe: 'Persönlich', icon: '❤️', color: '#ef4444' },
  { value: 'sport', label: 'Sport', labelEn: 'Sport', labelDe: 'Sport', icon: '⚽', color: '#10b981' },
  { value: 'other', label: 'Autre', labelEn: 'Other', labelDe: 'Andere', icon: '📅', color: '#6b7280' },
];

// REMINDER_OPTIONS est généré dynamiquement dans le composant via useTranslation()

// Boutons icônes pour les modaux
const ModalIconButton = ({
  icon,
  onPress,
  color,
  size = 44,
  disabled = false}: {
  icon: string;
  onPress: () => void;
  color: string;
  size?: number;
  disabled?: boolean;
}) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: color,
      alignItems: 'center',
      justifyContent: 'center',
      opacity: disabled ? 0.5 : 1}}
  >
    <Text style={{ fontSize: 20 }}>{icon}</Text>
  </TouchableOpacity>
);

interface CalendarScreenProps {
  onNavigate?: (screen: string) => void;
  onPrevious?: () => void;
  onNext?: () => void;
}

export default function CalendarScreen({ onNavigate, onPrevious, onNext }: CalendarScreenProps) {
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();
  const REMINDER_OPTIONS = [
    { value: '5', label: t('calendar.reminder5min') },
    { value: '15', label: t('calendar.reminder15min') },
    { value: '30', label: t('calendar.reminder30min') },
    { value: '60', label: t('calendar.reminder1h') },
    { value: '120', label: t('calendar.reminder2h') },
    { value: '1440', label: t('calendar.reminder1d') },
    { value: '10080', label: t('calendar.reminder1w') },
  ];
  const styles = getStyles(isDark);
  const { user } = useAuth();
  const { activeFamilyId: ctxFamilyId } = useFamily();
  const { data: families } = trpc.family.list.useQuery();
  const activeFamily = ctxFamilyId ? (families as any[])?.find((f: any) => f.id === ctxFamilyId) ?? families?.[0] : families?.[0];
  const { data: familyMembers = [] } = trpc.family.members.useQuery(
    { familyId: activeFamily?.id || 0 },
    { enabled: !!activeFamily }
  );
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [dropdownModalOpen, setDropdownModalOpen] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [subscribeModalOpen, setSubscribeModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [subscribeUrl, setSubscribeUrl] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [googleCalendarModal, setGoogleCalendarModal] = useState(false);
  const [googleCalendars, setGoogleCalendars] = useState<any[]>([]);
  const [googleCalendarLoading, setGoogleCalendarLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'agenda'>('month');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [calendarMenuVisible, setCalendarMenuVisible] = useState(false);

  useEffect(() => {
    loadViewMode();
    loadFilters();
    // Gérer le deep link fri2plan://google-calendar/callback?google_calendars=...
    const handleDeepLink = (event: { url: string }) => {
      const url = event.url;
      if (url && url.startsWith('fri2plan://google-calendar/callback')) {
        try {
          const params = new URL(url).searchParams;
          const encoded = params.get('google_calendars');
          if (encoded) {
            const calendars = JSON.parse(decodeURIComponent(encoded));
            setGoogleCalendars(calendars);
            setGoogleCalendarModal(true);
          }
        } catch {}
      }
    };
    const subscription = Linking.addEventListener('url', handleDeepLink);
    // Vérifier si l'app a été ouverte via un deep link
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });
    return () => subscription.remove();
  }, []);

  const loadViewMode = async () => {
    try {
      const saved = await AsyncStorage.getItem('calendar_view_mode');
      if (saved) setViewMode(saved as any);
    } catch {}
  };

  const saveViewMode = async (mode: 'month' | 'week' | 'day' | 'agenda') => {
    try {
      await AsyncStorage.setItem('calendar_view_mode', mode);
      setViewMode(mode);
    } catch {}
  };

  const loadFilters = async () => {
    try {
      const categories = await AsyncStorage.getItem('calendar_filter_categories');
      const members = await AsyncStorage.getItem('calendar_filter_members');
      if (categories) setSelectedCategories(JSON.parse(categories));
      if (members) setSelectedMembers(JSON.parse(members));
    } catch {}
  };

  const saveFilters = async () => {
    try {
      await AsyncStorage.setItem('calendar_filter_categories', JSON.stringify(selectedCategories));
      await AsyncStorage.setItem('calendar_filter_members', JSON.stringify(selectedMembers));
    } catch {}
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
        copyToCacheDirectory: true});
      if (result.canceled) return;
      setIsImporting(true);
      const file = result.assets[0];
      const response = await fetch(file.uri);
      const icsContent = await response.text();
      const eventsToImport = parseICS(icsContent);
      let successCount = 0;
      for (const event of eventsToImport) {
        try {
          await createEvent.mutateAsync(event);
          successCount++;
        } catch {}
      }
      setIsImporting(false);
      setImportModalOpen(false);
      refetch();
      Alert.alert('Import réussi', `${successCount} événement(s) importé(s).`, [{ text: 'OK' }]);
    } catch (error) {
      setIsImporting(false);
      Alert.alert('Erreur', "Impossible d'importer le fichier.", [{ text: 'OK' }]);
    }
  };

  const parseICS = (icsContent: string) => {
    const eventsArr: any[] = [];
    const lines = icsContent.split('\n');
    let currentEvent: any = null;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === 'BEGIN:VEVENT') {
        currentEvent = { title: '', description: '', startDate: '', durationMinutes: 60, category: 'other', reminderMinutes: 15, isPrivate: 0 };
      } else if (line === 'END:VEVENT' && currentEvent) {
        if (currentEvent.startDate) eventsArr.push(currentEvent);
        currentEvent = null;
      } else if (currentEvent) {
        if (line.startsWith('SUMMARY:')) currentEvent.title = line.substring(8);
        else if (line.startsWith('DESCRIPTION:')) currentEvent.description = cleanDescription(line.substring(12));
        else if (line.startsWith('DTSTART')) {
          // Extraire la partie valeur après ':' (peut être DTSTART;TZID=...:20260505T173000)
          const colonIdx = line.lastIndexOf(':');
          const dateStr = colonIdx >= 0 ? line.substring(colonIdx + 1) : line.split(':')[1];
          const startStr = parseICSDateToString(dateStr);
          currentEvent.startDate = startStr;
        } else if (line.startsWith('DTEND')) {
          const colonIdx = line.lastIndexOf(':');
          const dateStr = colonIdx >= 0 ? line.substring(colonIdx + 1) : line.split(':')[1];
          const endStr = parseICSDateToString(dateStr);
          // Calculer la durée en minutes entre startDate et endDate (en tant que strings locales)
          if (currentEvent.startDate && endStr) {
            const startMs = new Date(currentEvent.startDate.replace(' ', 'T')).getTime();
            const endMs = new Date(endStr.replace(' ', 'T')).getTime();
            currentEvent.durationMinutes = Math.round((endMs - startMs) / (1000 * 60));
          }
        }
      }
    }
    return eventsArr;
  };

  // Retourne une string 'yyyy-MM-dd HH:mm:ss' en heure locale (pas de conversion UTC)
  const parseICSDateToString = (dateStr: string): string => {
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const hour = dateStr.length >= 13 ? dateStr.substring(9, 11) : '00';
    const minute = dateStr.length >= 13 ? dateStr.substring(11, 13) : '00';
    return `${year}-${month}-${day} ${hour}:${minute}:00`;
  };

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '09:00',
    endTime: '10:00',
    category: 'other',
    reminder: '15',
    isPrivate: false});
  // Pickers date/heure
  const [eventDate, setEventDate] = useState(new Date());
  const [startTimeDate, setStartTimeDate] = useState(() => { const d = new Date(); d.setHours(9, 0, 0, 0); return d; });
  const [endTimeDate, setEndTimeDate] = useState(() => { const d = new Date(); d.setHours(10, 0, 0, 0); return d; });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showReminderDropdown, setShowReminderDropdown] = useState(false);

  // Nettoie les descriptions ICS (URLs, balises HTML, etc.)
  const cleanDescription = (desc: string | null | undefined): string => {
    if (!desc) return '';
    return desc
      .replace(/<[^>]*>/g, '')           // balises HTML
      .replace(/https?:\/\/\S+/g, '')   // URLs
      .replace(/\\n/g, ' ')              // \n ICS
      .replace(/\\,/g, ',')             // \, ICS
      .replace(/\\;/g, ';')             // \; ICS
      .replace(/\\\\/g, '')            // \\ ICS
      .replace(/\\\s*/g, ' ')           // \ suivi d'espace (ex: "\ \") ICS
      .replace(/\s+/g, ' ')              // espaces multiples
      .trim();
  };

  const getLocale = () => {
    const lang = i18n.language;
    if (lang === 'de') return de;
    if (lang === 'en') return enUS;
    return fr;
  };

  const getCategoryLabel = (cat: any) => {
    if (i18n.language === 'de') return cat.labelDe || cat.label;
    if (i18n.language === 'en') return cat.labelEn || cat.label;
    return cat.label;
  };

  const eventsQuery = trpc.events.list.useQuery(undefined, { refetchOnWindowFocus: false });
  const isLoadingEvents = eventsQuery.isLoading;
  const events = (eventsQuery.data || []).map((e: any) => ({
    ...e,
    // Les dates en base sont en heure locale (Europe/Zurich) — NE PAS ajouter 'Z' (qui forcerait UTC +2h)
    startTime: e.startDate || '',
    endTime: e.endDate || ''}));
  const refetch = eventsQuery.refetch;

  const createEvent = trpc.events.create.useMutation();
  const updateEvent = trpc.events.update.useMutation();
  const deleteEvent = trpc.events.delete.useMutation();

  // ─── Abonnements calendrier ────────────────────────────────────────────────
  const calendarUtils = trpc.useUtils();
  const { data: calendarSubscriptions = [], refetch: refetchSubscriptions } = trpc.events.listSubscriptions.useQuery();
  const createSubscription = trpc.events.createSubscription.useMutation({
    onSuccess: () => { refetchSubscriptions(); setSubscribeUrl(''); setSubscribeName(''); },
  });
  const deleteSubscription = trpc.events.deleteSubscription.useMutation({
    onSuccess: () => { refetchSubscriptions(); refetch(); },
  });
  const syncSubscription = trpc.events.syncSubscription.useMutation({
    onSuccess: () => { refetch(); Alert.alert('✓', 'Synchronisation terminée'); },
  });
  const deleteSubscriptionEvents = trpc.events.deleteSubscriptionEvents.useMutation({
    onSuccess: (result, variables) => {
      // Après suppression des événements, re-synchroniser automatiquement
      syncSubscription.mutate({ id: variables.id });
      refetch();
    },
    onError: (e: any) => Alert.alert('Erreur', e.message || 'Impossible de supprimer les événements'),
  });
  const updateSubscription = trpc.events.updateSubscription.useMutation({
    onSuccess: () => { refetchSubscriptions(); refetch(); setColorPickerSubId(null); },
  });
  const [subscribeName, setSubscribeName] = useState('');
  const [subscribeLoading, setSubscribeLoading] = useState(false);
  const [subscriptionView, setSubscriptionView] = useState<'list' | 'add'>('list');
  const [subscribeColor, setSubscribeColor] = useState('#6366f1');
  const [colorPickerSubId, setColorPickerSubId] = useState<number | null>(null);

  const subscribeGoogleCalendar = async (cal: any) => {
    setGoogleCalendarLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      // Récupérer le token Google stocké lors du polling
      let googleToken: any = null;
      try {
        const stored = await AsyncStorage.getItem('googleOAuthToken');
        if (stored) googleToken = JSON.parse(stored);
      } catch {}
      const response = await fetch('https://app.fri2plan.ch/api/google-calendar/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          calendarId: cal.id,
          calendarName: cal.summary,
          color: cal.backgroundColor || '#4285f4',
          googleToken,
        }),
      });
      const data = await response.json();
      if (data.success) {
        Alert.alert('Calendrier ajouté', `"${cal.summary}" a été synchronisé avec succès.`);
        setGoogleCalendarModal(false);
        refetch();
      } else {
        Alert.alert('Erreur', data.error || 'Impossible d\'ajouter ce calendrier.');
      }
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de contacter le serveur.');
    } finally {
      setGoogleCalendarLoading(false);
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  // Grille complète : du lundi de la première semaine au dimanche de la dernière semaine
  const calendarGridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarGridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarGrid = eachDayOfInterval({ start: calendarGridStart, end: calendarGridEnd });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getEventsForDate = (date: Date) => {
    if (!events) return [];
    let filteredEvents = events;
    if (viewMode === 'agenda') {
      filteredEvents = filteredEvents.filter(event => parseLocalDate(event.startTime, !!event.isUtc) >= new Date());
    } else if (viewMode === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      filteredEvents = filteredEvents.filter(event => {
        const eventDate = parseLocalDate(event.startTime, !!event.isUtc);
        return eventDate >= weekStart && eventDate <= weekEnd;
      });
    } else {
      filteredEvents = filteredEvents.filter(event => isSameDay(parseLocalDate(event.startTime, !!event.isUtc), date));
    }
    if (selectedCategories.length > 0) {
      filteredEvents = filteredEvents.filter(event => selectedCategories.includes(event.category));
    }
    if (selectedMembers.length > 0) {
      filteredEvents = filteredEvents.filter(event => selectedMembers.includes(event.userId));
    }
    return filteredEvents;
  };

  const getCategoryInfo = (categoryValue: string) => {
    return EVENT_CATEGORIES.find(cat => cat.value === categoryValue) || EVENT_CATEGORIES[EVENT_CATEGORIES.length - 1];
  };

  const handleCreateEvent = async () => {
    try {
      const dateStr = format(eventDate, 'yyyy-MM-dd');
      const startDateTime = new Date(`${dateStr}T${format(startTimeDate, 'HH:mm')}:00`);
      const endDateTime = new Date(`${dateStr}T${format(endTimeDate, 'HH:mm')}:00`);
      const durationMinutes = Math.round((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60));
      await createEvent.mutateAsync({
        title: formData.title,
        description: formData.description,
        startDate: format(startDateTime, 'yyyy-MM-dd HH:mm:ss'),
        endDate: format(endDateTime, 'yyyy-MM-dd HH:mm:ss'),
        durationMinutes,
        category: formData.category,
        reminderMinutes: parseInt(formData.reminder),
        isPrivate: formData.isPrivate ? 1 : 0});
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
      const dateStr = format(eventDate, 'yyyy-MM-dd');
      const startDateTime = new Date(`${dateStr}T${format(startTimeDate, 'HH:mm')}:00`);
      const endDateTime = new Date(`${dateStr}T${format(endTimeDate, 'HH:mm')}:00`);
      const durationMinutes = Math.round((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60));
      await updateEvent.mutateAsync({
        eventId: selectedEvent.id,
        title: formData.title,
        description: formData.description,
        startDate: format(startDateTime, 'yyyy-MM-dd HH:mm:ss'),
        endDate: format(endDateTime, 'yyyy-MM-dd HH:mm:ss'),
        durationMinutes,
        category: formData.category,
        reminderMinutes: parseInt(formData.reminder),
        isPrivate: formData.isPrivate ? 1 : 0});
      setEditModalOpen(false);
      setSelectedEvent(null);
      resetForm();
      refetch();
    } catch (error) {
      console.error('Error updating event:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder les modifications.');
      setEditModalOpen(false);
      setSelectedEvent(null);
      resetForm();
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

  const resetForm = () => {
    setFormData({ title: '', description: '', startTime: '09:00', endTime: '10:00', category: 'other', reminder: '15', isPrivate: false });
    const now = new Date();
    setEventDate(selectedDate);
    const s = new Date(selectedDate); s.setHours(9, 0, 0, 0); setStartTimeDate(s);
    const e = new Date(selectedDate); e.setHours(10, 0, 0, 0); setEndTimeDate(e);
    setShowDatePicker(false); setShowStartTimePicker(false); setShowEndTimePicker(false);
    setShowCategoryDropdown(false); setShowReminderDropdown(false);
  };

  const openEditModal = (event: any) => {
    setSelectedEvent(event);
    const startTime = parseLocalDate(event.startTime, !!event.isUtc);
    const endTime = parseLocalDate(event.endTime, !!event.isUtc);
    setEventDate(startTime);
    setStartTimeDate(startTime);
    setEndTimeDate(endTime);
    setFormData({
      title: event.title,
      description: event.description || '',
      startTime: format(startTime, 'HH:mm'),
      endTime: format(endTime, 'HH:mm'),
      category: event.category || 'other',
      reminder: (event.reminderMinutes ?? event.reminder)?.toString() || '15',
      isPrivate: event.isPrivate || false});
    setEditModalOpen(true);
  };

  const selectedDateEvents = getEventsForDate(selectedDate);
  const hasActiveFilters = selectedCategories.length > 0 || selectedMembers.length > 0;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* ── Titre centré ── */}
      <View style={styles.pageTitleContainer}>
        <Text style={styles.pageTitle}>📅 {t('calendar.title') || 'Calendrier'}</Text>
      </View>

      {/* ── Barre principale : filtres de vue + bouton 3 points ── */}
      <View style={styles.viewBar}>
        {(['month', 'week', 'day', 'agenda'] as const).map((mode) => {
          const isActive = viewMode === mode;
          const numbers: Record<string, string> = { month: '30', week: '7', day: '1', agenda: '' };
          return (
            <TouchableOpacity
              key={mode}
              onPress={() => saveViewMode(mode)}
              style={[styles.calIconWrapper, isActive && styles.calIconWrapperActive]}
            >
              {mode === 'agenda' ? (
                <View style={[styles.calIcon, isActive && styles.calIconActive]}>
                  <View style={[styles.calIconBand, isActive && styles.calIconBandActive]} />
                  <View style={styles.calIconBody}>
                    <View style={[styles.agendaLine, { width: '70%' }]} />
                    <View style={[styles.agendaLine, { width: '50%' }]} />
                    <View style={[styles.agendaLine, { width: '60%' }]} />
                  </View>
                </View>
              ) : (
                <View style={[styles.calIcon, isActive && styles.calIconActive]}>
                  <View style={[styles.calIconBand, isActive && styles.calIconBandActive]}>
                    <View style={styles.calIconRing} />
                    <View style={styles.calIconRing} />
                  </View>
                  <View style={styles.calIconBody}>
                    <Text style={[styles.calIconNumber, isActive && styles.calIconNumberActive]}>{numbers[mode]}</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Bouton 3 points verticaux */}
        <TouchableOpacity
          style={[styles.calIconWrapper, calendarMenuVisible && styles.calIconWrapperActive]}
          onPress={() => setCalendarMenuVisible(true)}
        >
          <View style={[styles.calIcon, calendarMenuVisible && styles.calIconActive, { justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ fontSize: 18, color: isDark ? '#d1d5db' : '#374151', lineHeight: 22 }}>⋮</Text>
            {hasActiveFilters && (
              <View style={[styles.filterBadge, { top: 2, right: 2 }]}>
                <Text style={styles.filterBadgeText}>{selectedCategories.length + selectedMembers.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* ── Menu 3 points : Import / Abonnement / Export / Google Calendar / Filtres ── */}
      <Modal visible={calendarMenuVisible} transparent animationType="fade" onRequestClose={() => setCalendarMenuVisible(false)}>
        <TouchableOpacity style={styles.calMenuOverlay} activeOpacity={1} onPress={() => setCalendarMenuVisible(false)}>
          <View style={styles.calMenuContent}>
            <TouchableOpacity style={styles.calMenuItem} onPress={() => { setCalendarMenuVisible(false); setImportModalOpen(true); }}>
              <Text style={styles.calMenuIcon}>📥</Text>
              <Text style={styles.calMenuLabel}>{t('calendar.importIcs') || 'Importer un calendrier'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.calMenuItem} onPress={() => { setCalendarMenuVisible(false); setSubscribeModalOpen(true); setSubscriptionView('list'); }}>
              <Text style={styles.calMenuIcon}>🔗</Text>
              <Text style={[styles.calMenuLabel, { flex: 1 }]}>{t('calendar.subscribeIcs') || 'Abonnement calendrier'}</Text>
              {calendarSubscriptions.length > 0 && (
                <View style={{ backgroundColor: '#7c3aed', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, marginLeft: 4 }}>
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{calendarSubscriptions.length}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.calMenuItem} onPress={() => { setCalendarMenuVisible(false); setExportModalOpen(true); }}>
              <Text style={styles.calMenuIcon}>📤</Text>
              <Text style={styles.calMenuLabel}>{t('calendar.exportIcs') || 'Exporter le calendrier'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.calMenuItem} onPress={async () => {
              setCalendarMenuVisible(false);
              // Générer un sessionId unique pour le polling
              const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
              // Récupérer le token FRI2PLAN AVANT d'ouvrir le navigateur
              const token = await AsyncStorage.getItem('authToken');
              if (!token) {
                Alert.alert('Erreur', 'Vous devez être connecté pour utiliser Google Calendar.');
                return;
              }
              // Passer le token dans l'URL car Linking.openURL ne peut pas envoyer de headers Authorization
              const connectUrl = `https://app.fri2plan.ch/api/google-calendar/connect?source=android&sessionId=${sessionId}&token=${encodeURIComponent(token)}`;
              Linking.openURL(connectUrl).catch(() =>
                Alert.alert('Erreur', "Impossible d'ouvrir le navigateur.")
              );
              // Polling toutes les 2s pendant 3 minutes max
              let attempts = 0;
              const maxAttempts = 90;
              const pollInterval = setInterval(async () => {
                attempts++;
                if (attempts > maxAttempts) {
                  clearInterval(pollInterval);
                  return;
                }
                try {
                  const pollRes = await fetch(`https://app.fri2plan.ch/api/google-calendar/poll?sessionId=${sessionId}`, {
                    headers: { 'Authorization': token ? `Bearer ${token}` : '' },
                  });
                  const pollData = await pollRes.json();
                  if (pollData.status === 'ready') {
                    clearInterval(pollInterval);
                    // Stocker le token Google pour l'utiliser lors de subscribe
                    if (pollData.tokenData) {
                      await AsyncStorage.setItem('googleOAuthToken', JSON.stringify(pollData.tokenData));
                    }
                    setGoogleCalendars(pollData.calendars || []);
                    setGoogleCalendarModal(true);
                  }
                } catch { /* ignorer les erreurs de polling */ }
              }, 2000);
            }}>
              <Text style={styles.calMenuIcon}>🗓️</Text>
              <Text style={styles.calMenuLabel}>{t('calendar.googleCalendar') || 'Google Calendar'}</Text>
            </TouchableOpacity>
            <View style={styles.calMenuDivider} />
            <TouchableOpacity style={[styles.calMenuItem, hasActiveFilters && styles.calMenuItemActive]} onPress={() => { setCalendarMenuVisible(false); setFilterModalOpen(true); }}>
              <Text style={styles.calMenuIcon}>⚙️</Text>
              <Text style={[styles.calMenuLabel, hasActiveFilters && styles.calMenuLabelActive]}>
                {t('calendar.filters') || 'Filtres'}{hasActiveFilters ? ` (${selectedCategories.length + selectedMembers.length})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Contenu principal scrollable ── */}
      <ScrollView
        style={styles.content}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#ef4444']} />}
      >
        {/* Skeleton de chargement */}
        {isLoadingEvents && !refreshing ? (
          <CalendarSkeleton />
        ) : null}
        {/* ── Vue Mois ── */}
        {viewMode === 'month' && (
          <>
            {/* Navigation mois : flèches aux extrémités, mois centré */}
            <View style={styles.monthNav}>
              <TouchableOpacity onPress={() => setCurrentDate(subMonths(currentDate, 1))} style={styles.navArrow} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.navArrowText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.monthTitle}>
                {format(currentDate, 'MMMM yyyy', { locale: getLocale() })}
              </Text>
              <TouchableOpacity onPress={() => setCurrentDate(addMonths(currentDate, 1))} style={styles.navArrow} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.navArrowText}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Grille calendrier */}
            <View style={styles.calendar}>
              <View style={styles.weekRow}>
                {(t('calendar.weekDays', { returnObjects: true }) as string[] || ['L', 'M', 'M', 'J', 'V', 'S', 'D']).map((day: string, index: number) => (
                  <View key={index} style={styles.dayHeader}>
                    <Text style={styles.dayHeaderText}>{day}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.daysGrid}>
                {calendarGrid.map((day) => {
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const dayEvts = isCurrentMonth ? (events || []).filter(e => isSameDay(parseLocalDate(e.startTime, !!e.isUtc), day)) : [];
                  const hasEvents = dayEvts.length > 0;
                  const isSelected = isSameDay(day, selectedDate);
                  const isTodayDate = isToday(day);
                  // Couleurs des points : utiliser la couleur de l'abonnement si disponible
                  const dotColors = dayEvts.slice(0, 3).map((e: any) => {
                    if (e.calendarSubscriptionId) {
                      const sub = (calendarSubscriptions as any[]).find((s: any) => s.id === e.calendarSubscriptionId);
                      return sub?.color || '#7c3aed';
                    }
                    return e.color || '#7c3aed';
                  });
                  return (
                    <TouchableOpacity
                      key={day.toString()}
                      style={[
                        styles.dayCell,
                        isSelected && styles.dayCellSelected,
                        isTodayDate && !isSelected && styles.dayCellToday,
                        !isCurrentMonth && styles.dayCellOutside,
                      ]}
                      onPress={() => {
                        setSelectedDate(day);
                        const dayEvents = (events || []).filter(e => isSameDay(parseLocalDate(e.startTime, !!e.isUtc), day));
                        if (dayEvents.length > 0) setDropdownModalOpen(true);
                        else {
                          setFormData(prev => ({ ...prev, startTime: '09:00', endTime: '10:00' }));
                          setCreateModalOpen(true);
                        }
                      }}
                    >
                      <Text style={[
                        styles.dayText,
                        isTodayDate && !isSelected && styles.dayTextToday,
                        isSelected && styles.dayTextSelected,
                        !isCurrentMonth && styles.dayTextOutside,
                      ]}>
                        {format(day, 'd')}
                      </Text>
                      {hasEvents && (
                        <View style={{ flexDirection: 'row', gap: 2, position: 'absolute', bottom: 2 }}>
                          {dotColors.map((col, idx) => (
                            <View key={idx} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: col }} />
                          ))}
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Événements du jour sélectionné */}
            <View style={styles.eventsSection}>
              <View style={styles.eventsSectionHeader}>
                <Text style={styles.eventsTitle}>
                  {format(selectedDate, 'EEEE d MMMM', { locale: getLocale() })}
                </Text>
                <TouchableOpacity
                  style={styles.addEventBtn}
                  onPress={() => {
                    setFormData(prev => ({ ...prev, startTime: '09:00', endTime: '10:00' }));
                    setCreateModalOpen(true);
                  }}
                >
                  <Text style={styles.addEventBtnText}>+</Text>
                </TouchableOpacity>
              </View>

              {selectedDateEvents.length > 0 ? (
                <>
                  {selectedDateEvents.slice(0, 3).map(event => {
                    const category = getCategoryInfo(event.category);
                    const desc = cleanDescription(event.description);
                    // Couleur de la barre : abonnement > couleur event > catégorie
                    const barColor = (() => {
                      if ((event as any).calendarSubscriptionId) {
                        const sub = (calendarSubscriptions as any[]).find((s: any) => s.id === (event as any).calendarSubscriptionId);
                        if (sub?.color) return sub.color;
                      }
                      return (event as any).color || category.color;
                    })();
                    const isEventPast = parseLocalDate(event.startTime, !!event.isUtc) < new Date();
                    return (
                      <TouchableOpacity key={event.id} style={[styles.eventCard, isEventPast && { opacity: 0.6 }]} onPress={() => openEditModal(event)}>
                        <View style={[styles.eventColorBar, { backgroundColor: barColor }]} />
                        <View style={styles.eventCardContent}>
                          <View style={styles.eventHeader}>
                            <Text style={styles.eventIcon}>{category.icon}</Text>
                            <Text style={styles.eventTime}>{format(parseLocalDate(event.startTime, !!event.isUtc), 'HH:mm')}</Text>
                            {isEventPast && (
                              <View style={{ backgroundColor: '#9ca3af', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, marginLeft: 4 }}>
                                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{t('calendar.past') || 'Passé'}</Text>
                              </View>
                            )}
                            {event.isPrivate ? <Text style={styles.privateIcon}>🔒</Text> : null}
                          </View>
                          <Text style={styles.eventTitle}>{event.title}</Text>
                          {desc && !isEventPast ? <Text style={styles.eventDescription} numberOfLines={1}>{desc}</Text> : null}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  {selectedDateEvents.length > 3 && (
                    <TouchableOpacity style={styles.moreEventsBtn} onPress={() => setDropdownModalOpen(true)}>
                      <Text style={styles.moreEventsBtnText}>{`+ ${selectedDateEvents.length - 3} ${t('calendar.moreEvents') || 'autres'}`}</Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <TouchableOpacity
                  style={styles.noEvents}
                  onPress={() => {
                    setFormData(prev => ({ ...prev, startTime: '09:00', endTime: '10:00' }));
                    setCreateModalOpen(true);
                  }}
                >
                  <Text style={styles.noEventsText}>{t('calendar.noEvents') || 'Aucun événement'}</Text>
                  <Text style={styles.noEventsHint}>{t('calendar.tapToAdd') || 'Appuyez pour ajouter'}</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {/* ── Vue Agenda ── */}
        {viewMode === 'agenda' && (
          <View style={styles.agendaContainer}>
            {events && events.length > 0 ? (
              events
                .filter(event => parseLocalDate(event.startTime, !!event.isUtc) >= new Date())
                .sort((a, b) => parseLocalDate(a.startTime, !!a.isUtc).getTime() - parseLocalDate(b.startTime, !!b.isUtc).getTime())
                .map((event, index, arr) => {
                  const eventDate = parseLocalDate(event.startTime, !!event.isUtc);
                  const prevEventDate = index > 0 ? parseLocalDate(arr[index - 1].startTime, !!arr[index - 1].isUtc) : null;
                  const showDateHeader = !prevEventDate || !isSameDay(eventDate, prevEventDate);
                  const category = getCategoryInfo(event.category);
                  const desc = cleanDescription(event.description);
                  return (
                    <View key={event.id}>
                      {showDateHeader && (
                        <View style={styles.agendaDateHeader}>
                          <Text style={styles.agendaDateText}>
                            {isToday(eventDate) ? t('dashboard.today') || "Aujourd'hui" : format(eventDate, 'EEEE d MMMM yyyy', { locale: getLocale() })}
                          </Text>
                        </View>
                      )}
                      <TouchableOpacity style={styles.agendaEventCard} onPress={() => openEditModal(event)}>
                        <View style={[styles.agendaEventColorBar, { backgroundColor: category.color }]} />
                        <View style={styles.agendaEventContent}>
                          <View style={styles.agendaEventHeader}>
                            <Text style={styles.agendaEventIcon}>{category.icon}</Text>
                            <Text style={styles.agendaEventTime}>{format(eventDate, 'HH:mm')}</Text>
                            {event.isPrivate ? <Text style={styles.agendaPrivateIcon}>🔒</Text> : null}
                          </View>
                          <Text style={styles.agendaEventTitle}>{event.title}</Text>
                          {desc ? <Text style={styles.agendaEventDescription}>{desc}</Text> : null}
                        </View>
                      </TouchableOpacity>
                    </View>
                  );
                })
            ) : (
              <View style={styles.agendaEmpty}>
                <Text style={styles.agendaEmptyText}>{t('calendar.noUpcomingEvents') || 'Aucun événement à venir'}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Vue Semaine ── */}
        {viewMode === 'week' && (
          <View style={styles.weekViewContainer}>
            <View style={styles.weekNav}>
              <TouchableOpacity onPress={() => setCurrentDate(subWeeks(currentDate, 1))} style={styles.navArrow}>
                <Text style={styles.navArrowText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.weekNavTitle}>
                {format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'd MMM', { locale: getLocale() })}
                {' – '}
                {format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'd MMM', { locale: getLocale() })}
              </Text>
              <TouchableOpacity onPress={() => setCurrentDate(addWeeks(currentDate, 1))} style={styles.navArrow}>
                <Text style={styles.navArrowText}>›</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.weekHeader}>
              <View style={styles.weekTimeColumn} />
              {eachDayOfInterval({
                start: startOfWeek(currentDate, { weekStartsOn: 1 }),
                end: endOfWeek(currentDate, { weekStartsOn: 1 })}).map(day => (
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
            <ScrollView style={styles.weekTimeline}>
              {Array.from({ length: 24 }, (_, hour) => (
                <View key={hour} style={styles.weekTimeRow}>
                  <View style={styles.weekTimeLabel}>
                    <Text style={styles.weekTimeLabelText}>{hour.toString().padStart(2, '0')}h</Text>
                  </View>
                  {eachDayOfInterval({
                    start: startOfWeek(currentDate, { weekStartsOn: 1 }),
                    end: endOfWeek(currentDate, { weekStartsOn: 1 })}).map(day => {
                    const hourEvents = (events || []).filter(event => {
                      const eventDate = parseLocalDate(event.startTime, !!event.isUtc);
                      return isSameDay(eventDate, day) && eventDate.getHours() === hour;
                    });
                    return (
                      <View key={day.toString()} style={styles.weekDayColumn}>
                        {hourEvents.map(event => {
                          const category = getCategoryInfo(event.category);
                          return (
                            <TouchableOpacity
                              key={event.id}
                              style={[styles.weekEventCard, { backgroundColor: category.color + '30', borderLeftColor: category.color }]}
                              onPress={() => openEditModal(event)}
                            >
                              <Text style={styles.weekEventIcon}>{category.icon}</Text>
                              <Text style={styles.weekEventTitle} numberOfLines={1}>{event.title}</Text>
                              <Text style={styles.weekEventTime}>{format(parseLocalDate(event.startTime, !!event.isUtc), 'HH:mm')}</Text>
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

        {/* ── Vue Jour ── */}
        {viewMode === 'day' && (
          <View style={styles.dayViewContainer}>
            <View style={styles.dayNav}>
              <TouchableOpacity onPress={() => setSelectedDate(subDays(selectedDate, 1))} style={styles.navArrow}>
                <Text style={styles.navArrowText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.dayNavTitle}>
                {isToday(selectedDate) ? t('dashboard.today') || "Aujourd'hui" : format(selectedDate, 'EEEE d MMMM yyyy', { locale: getLocale() })}
              </Text>
              <TouchableOpacity onPress={() => setSelectedDate(addDays(selectedDate, 1))} style={styles.navArrow}>
                <Text style={styles.navArrowText}>›</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.dayTimeline}>
              {Array.from({ length: 24 }, (_, hour) => {
                const hourEvents = (events || []).filter(event => {
                  const eventDate = parseLocalDate(event.startTime, !!event.isUtc);
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
const startT = parseLocalDate(event.startTime, !!event.isUtc);
        const endT = parseLocalDate(event.endTime, !!event.isUtc);
                        const durationMinutes = (endT.getTime() - startT.getTime()) / (1000 * 60);
                        const eventHeight = Math.max(durationMinutes * 2, 40);
                        const topOffset = startT.getMinutes() * 2;
                        const desc = cleanDescription(event.description);
                        return (
                          <TouchableOpacity
                            key={event.id}
                            style={[styles.dayEventCard, { backgroundColor: category.color + '20', borderLeftColor: category.color, height: eventHeight, top: topOffset }]}
                            onPress={() => openEditModal(event)}
                          >
                            <Text style={styles.dayEventTime}>{format(startT, 'HH:mm')} - {format(endT, 'HH:mm')}</Text>
                            <View style={styles.dayEventHeader}>
                              <Text style={styles.dayEventIcon}>{category.icon}</Text>
                              <Text style={styles.dayEventTitle} numberOfLines={1}>{event.title}</Text>
                              {event.isPrivate ? <Text style={styles.dayEventPrivate}>🔒</Text> : null}
                            </View>
                            {desc && durationMinutes > 30 ? (
                              <Text style={styles.dayEventDescription} numberOfLines={2}>{desc}</Text>
                            ) : null}
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

      {/* ════════════════════════════════════════════════════════════
          MODAUX — boutons remplacés par icônes rondes
          ════════════════════════════════════════════════════════════ */}

      {/* ── Créer événement ── */}
      <Modal visible={createModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('calendar.addEvent') || 'Nouvel événement'}</Text>
            <ScrollView style={styles.modalForm} keyboardShouldPersistTaps="handled">
              {/* Titre */}
              <Text style={styles.label}>{t('common.title') || 'Titre'}</Text>
              <TextInput style={styles.input} value={formData.title} onChangeText={text => setFormData(p => ({ ...p, title: text }))} placeholder={t('common.title') || 'Titre'} placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'} />
              {/* Description */}
              <Text style={styles.label}>{t('calendar.description') || 'Description'}</Text>
              <TextInput style={[styles.input, styles.textArea]} value={formData.description} onChangeText={text => setFormData(p => ({ ...p, description: text }))} multiline numberOfLines={3} placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'} />
              {/* Catégorie — Dropdown */}
              <Text style={styles.label}>{t('calendar.category') || 'Catégorie'}</Text>
              <TouchableOpacity style={[styles.input, styles.dropdownTrigger]} onPress={() => setShowCategoryDropdown(true)}>
                <Text style={styles.dropdownTriggerText}>{getCategoryLabel(getCategoryInfo(formData.category))} {getCategoryInfo(formData.category).icon}</Text>
                <Text style={styles.dropdownChevron}>▼</Text>
              </TouchableOpacity>
              {/* Date */}
              <Text style={styles.label}>{t('common.date') || 'Date'}</Text>
              <TouchableOpacity style={[styles.input, styles.dropdownTrigger]} onPress={() => setShowDatePicker(true)}>
                <Text style={styles.dropdownTriggerText}>📅 {format(eventDate, 'dd/MM/yyyy')}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker value={eventDate} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(_, d) => { setShowDatePicker(false); if (d) setEventDate(d); }} locale={i18n.language === 'de' ? 'de-DE' : i18n.language === 'en' ? 'en-US' : 'fr-FR'} />
              )}
              {/* Heure début */}
              <Text style={styles.label}>{t('calendar.startTime') || 'Heure de début'}</Text>
              <TouchableOpacity style={[styles.input, styles.dropdownTrigger]} onPress={() => setShowStartTimePicker(true)}>
                <Text style={styles.dropdownTriggerText}>🕐 {format(startTimeDate, 'HH:mm')}</Text>
              </TouchableOpacity>
              {showStartTimePicker && (
                <DateTimePicker value={startTimeDate} mode="time" is24Hour display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(_, d) => { setShowStartTimePicker(false); if (d) setStartTimeDate(d); }} />
              )}
              {/* Heure fin */}
              <Text style={styles.label}>{t('calendar.endTime') || 'Heure de fin'}</Text>
              <TouchableOpacity style={[styles.input, styles.dropdownTrigger]} onPress={() => setShowEndTimePicker(true)}>
                <Text style={styles.dropdownTriggerText}>🕐 {format(endTimeDate, 'HH:mm')}</Text>
              </TouchableOpacity>
              {showEndTimePicker && (
                <DateTimePicker value={endTimeDate} mode="time" is24Hour display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(_, d) => { setShowEndTimePicker(false); if (d) setEndTimeDate(d); }} />
              )}
              {/* Rappel — Dropdown */}
              <Text style={styles.label}>{t('calendar.reminder') || 'Rappel'}</Text>
              <TouchableOpacity style={[styles.input, styles.dropdownTrigger]} onPress={() => setShowReminderDropdown(true)}>
                <Text style={styles.dropdownTriggerText}>🔔 {REMINDER_OPTIONS.find(o => o.value === formData.reminder)?.label || '15 min'}</Text>
                <Text style={styles.dropdownChevron}>▼</Text>
              </TouchableOpacity>
              {/* Privé */}
              <TouchableOpacity style={styles.checkboxRow} onPress={() => setFormData(p => ({ ...p, isPrivate: !p.isPrivate }))}>
                <View style={[styles.checkbox, formData.isPrivate && styles.checkboxChecked]}>
                  {formData.isPrivate ? <Text style={styles.checkmark}>✓</Text> : null}
                </View>
                <Text style={styles.checkboxLabel}>🔒 {t('common.private') || 'Événement privé'}</Text>
              </TouchableOpacity>
            </ScrollView>
            {/* Boutons icônes */}
            <View style={styles.iconBtnRow}>
              <ModalIconButton icon="✕" color={isDark ? '#374151' : '#e5e7eb'} onPress={() => { setCreateModalOpen(false); resetForm(); }} />
              <ModalIconButton icon="✓" color="#10b981" onPress={handleCreateEvent} />
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modifier événement ── */}
      <Modal visible={editModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('common.edit') || 'Modifier'}</Text>
            <ScrollView style={styles.modalForm} keyboardShouldPersistTaps="handled">
              {/* Titre */}
              <Text style={styles.label}>{t('common.title') || 'Titre'}</Text>
              <TextInput style={styles.input} value={formData.title} onChangeText={text => setFormData(p => ({ ...p, title: text }))} placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'} />
              {/* Description */}
              <Text style={styles.label}>{t('calendar.description') || 'Description'}</Text>
              <TextInput style={[styles.input, styles.textArea]} value={formData.description} onChangeText={text => setFormData(p => ({ ...p, description: text }))} multiline numberOfLines={3} placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'} />
              {/* Catégorie — Dropdown */}
              <Text style={styles.label}>{t('calendar.category') || 'Catégorie'}</Text>
              <TouchableOpacity style={[styles.input, styles.dropdownTrigger]} onPress={() => setShowCategoryDropdown(true)}>
                <Text style={styles.dropdownTriggerText}>{getCategoryLabel(getCategoryInfo(formData.category))} {getCategoryInfo(formData.category).icon}</Text>
                <Text style={styles.dropdownChevron}>▼</Text>
              </TouchableOpacity>
              {/* Date */}
              <Text style={styles.label}>{t('common.date') || 'Date'}</Text>
              <TouchableOpacity style={[styles.input, styles.dropdownTrigger]} onPress={() => setShowDatePicker(true)}>
                <Text style={styles.dropdownTriggerText}>📅 {format(eventDate, 'dd/MM/yyyy')}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker value={eventDate} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(_, d) => { setShowDatePicker(false); if (d) setEventDate(d); }} locale={i18n.language === 'de' ? 'de-DE' : i18n.language === 'en' ? 'en-US' : 'fr-FR'} />
              )}
              {/* Heure début */}
              <Text style={styles.label}>{t('calendar.startTime') || 'Heure de début'}</Text>
              <TouchableOpacity style={[styles.input, styles.dropdownTrigger]} onPress={() => setShowStartTimePicker(true)}>
                <Text style={styles.dropdownTriggerText}>🕐 {format(startTimeDate, 'HH:mm')}</Text>
              </TouchableOpacity>
              {showStartTimePicker && (
                <DateTimePicker value={startTimeDate} mode="time" is24Hour display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(_, d) => { setShowStartTimePicker(false); if (d) setStartTimeDate(d); }} />
              )}
              {/* Heure fin */}
              <Text style={styles.label}>{t('calendar.endTime') || 'Heure de fin'}</Text>
              <TouchableOpacity style={[styles.input, styles.dropdownTrigger]} onPress={() => setShowEndTimePicker(true)}>
                <Text style={styles.dropdownTriggerText}>🕐 {format(endTimeDate, 'HH:mm')}</Text>
              </TouchableOpacity>
              {showEndTimePicker && (
                <DateTimePicker value={endTimeDate} mode="time" is24Hour display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(_, d) => { setShowEndTimePicker(false); if (d) setEndTimeDate(d); }} />
              )}
              {/* Rappel — Dropdown */}
              <Text style={styles.label}>{t('calendar.reminder') || 'Rappel'}</Text>
              <TouchableOpacity style={[styles.input, styles.dropdownTrigger]} onPress={() => setShowReminderDropdown(true)}>
                <Text style={styles.dropdownTriggerText}>🔔 {REMINDER_OPTIONS.find(o => o.value === formData.reminder)?.label || '15 min'}</Text>
                <Text style={styles.dropdownChevron}>▼</Text>
              </TouchableOpacity>
              {/* Privé */}
              <TouchableOpacity style={styles.checkboxRow} onPress={() => setFormData(p => ({ ...p, isPrivate: !p.isPrivate }))}>
                <View style={[styles.checkbox, formData.isPrivate && styles.checkboxChecked]}>
                  {formData.isPrivate ? <Text style={styles.checkmark}>✓</Text> : null}
                </View>
                <Text style={styles.checkboxLabel}>🔒 {t('common.private') || 'Événement privé'}</Text>
              </TouchableOpacity>
            </ScrollView>
            {/* Boutons icônes : Supprimer | Annuler | Sauvegarder */}
            <View style={styles.iconBtnRow}>
              <ModalIconButton icon="🗑" color="#ef4444" onPress={handleDeleteEvent} />
              <ModalIconButton icon="✕" color={isDark ? '#374151' : '#e5e7eb'} onPress={() => { setEditModalOpen(false); setSelectedEvent(null); resetForm(); }} />
              <ModalIconButton icon="✓" color="#10b981" onPress={handleUpdateEvent} />
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Dropdown événements du jour ── */}
      <Modal visible={dropdownModalOpen} animationType="fade" transparent>
        <TouchableOpacity style={styles.dropdownOverlay} activeOpacity={1} onPress={() => setDropdownModalOpen(false)}>
          <View style={styles.dropdownContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.dropdownTitle}>
              {format(selectedDate, 'EEEE d MMMM', { locale: getLocale() })}
            </Text>
            <TouchableOpacity style={styles.dropdownAddButton} onPress={() => { setDropdownModalOpen(false); setFormData(p => ({ ...p, startTime: '09:00', endTime: '10:00' })); setCreateModalOpen(true); }}>
              <Text style={styles.dropdownAddButtonText}>+ {t('calendar.addEvent') || 'Ajouter'}</Text>
            </TouchableOpacity>
            <ScrollView style={styles.dropdownEventsList}>
              {(events || []).filter(e => isSameDay(parseLocalDate(e.startTime, !!e.isUtc), selectedDate)).map(event => {
                const category = getCategoryInfo(event.category);
                const desc = cleanDescription(event.description);
                // Couleur barre : abonnement > couleur event > catégorie
                const dropBarColor = (() => {
                  if ((event as any).calendarSubscriptionId) {
                    const sub = (calendarSubscriptions as any[]).find((s: any) => s.id === (event as any).calendarSubscriptionId);
                    if (sub?.color) return sub.color;
                  }
                  return (event as any).color || category.color;
                })();
                const isImported = !!(event as any).calendarSubscriptionId;
                const isDropPast = parseLocalDate(event.startTime, !!event.isUtc) < new Date();
                return (
                  <TouchableOpacity key={event.id} style={[styles.dropdownEventCard, isDropPast && { opacity: 0.6 }]} onPress={() => { setDropdownModalOpen(false); openEditModal(event); }}>
                    <View style={[styles.dropdownEventColorBar, { backgroundColor: dropBarColor }]} />
                    <View style={styles.dropdownEventContent}>
                      <View style={styles.dropdownEventHeader}>
                        <Text style={styles.dropdownEventIcon}>{category.icon}</Text>
                        <Text style={styles.dropdownEventTime}>{format(parseLocalDate(event.startTime, !!event.isUtc), 'HH:mm')}</Text>
                        {isDropPast && (
                          <View style={{ backgroundColor: '#9ca3af', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, marginLeft: 4 }}>
                            <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{t('calendar.past') || 'Passé'}</Text>
                          </View>
                        )}
                        {isImported && !isDropPast && (
                          <View style={{ backgroundColor: dropBarColor, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, marginLeft: 4 }}>
                            <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>ICS</Text>
                          </View>
                        )}
                        {event.isPrivate ? <Text style={styles.dropdownPrivateIcon}>🔒</Text> : null}
                      </View>
                      <Text style={styles.dropdownEventTitle}>{event.title}</Text>
                      {desc && !isDropPast ? <Text style={styles.dropdownEventDescription} numberOfLines={1}>{desc}</Text> : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {/* Bouton icône fermer */}
            <View style={[styles.iconBtnRow, { justifyContent: 'center' }]}>
              <ModalIconButton icon="✕" color={isDark ? '#374151' : '#e5e7eb'} onPress={() => setDropdownModalOpen(false)} />
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Filtres ── */}
      <Modal visible={filterModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('calendar.filters') || 'Filtres'}</Text>
            <ScrollView style={styles.modalForm}>
              <Text style={styles.filterSectionTitle}>{t('calendar.byCategory') || 'Par catégorie'}</Text>
              <View style={styles.filterCheckboxContainer}>
                {EVENT_CATEGORIES.map(cat => (
                  <TouchableOpacity key={cat.value} style={styles.filterCheckboxRow} onPress={() => {
                    if (selectedCategories.includes(cat.value)) setSelectedCategories(selectedCategories.filter(c => c !== cat.value));
                    else setSelectedCategories([...selectedCategories, cat.value]);
                  }}>
                    <View style={[styles.checkbox, selectedCategories.includes(cat.value) && styles.checkboxChecked]}>
                      {selectedCategories.includes(cat.value) ? <Text style={styles.checkmark}>✓</Text> : null}
                    </View>
                    <Text style={styles.filterCheckboxIcon}>{cat.icon}</Text>
                    <Text style={styles.filterCheckboxLabel}>{getCategoryLabel(cat)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {familyMembers && familyMembers.length > 0 && (
                <>
                  <Text style={styles.filterSectionTitle}>{t('calendar.byMember') || 'Par membre'}</Text>
                  <View style={styles.filterCheckboxContainer}>
                    {familyMembers.map((member: any) => (
                      <TouchableOpacity key={member.id} style={styles.filterCheckboxRow} onPress={() => {
                        if (selectedMembers.includes(member.id)) setSelectedMembers(selectedMembers.filter(m => m !== member.id));
                        else setSelectedMembers([...selectedMembers, member.id]);
                      }}>
                        <View style={[styles.checkbox, selectedMembers.includes(member.id) && styles.checkboxChecked]}>
                          {selectedMembers.includes(member.id) ? <Text style={styles.checkmark}>✓</Text> : null}
                        </View>
                        <Text style={styles.filterCheckboxLabel}>{member.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>
            {/* Boutons icônes : Réinitialiser | Annuler | Appliquer */}
            <View style={styles.iconBtnRow}>
              <ModalIconButton icon="↺" color={isDark ? '#374151' : '#e5e7eb'} onPress={resetFilters} />
              <ModalIconButton icon="✕" color={isDark ? '#374151' : '#e5e7eb'} onPress={() => setFilterModalOpen(false)} />
              <ModalIconButton icon="✓" color="#10b981" onPress={applyFilters} />
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Import ICS ── */}
      <Modal visible={importModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('calendar.import') || 'Importer'}</Text>
              <Text style={styles.importInfoText}>{t('calendar.importDesc') || 'Sélectionnez un fichier .ics (iCalendar) pour importer vos événements.'}</Text>
            <Text style={styles.importInfoNote}>{t('calendar.importNote') || '⚠️ Les événements récurrents ne sont pas supportés.'}</Text>
            <TouchableOpacity style={styles.importSelectButton} onPress={handleImportICS} disabled={isImporting}>
              <Text style={styles.importSelectButtonText}>{isImporting ? t('calendar.importing') || '🔄 Import en cours...' : t('calendar.importSelect') || '📂 Sélectionner un fichier .ics'}</Text>
            </TouchableOpacity>
            {/* Bouton icône fermer */}
            <View style={[styles.iconBtnRow, { justifyContent: 'center', marginTop: 8 }]}>
              <ModalIconButton icon="✕" color={isDark ? '#374151' : '#e5e7eb'} onPress={() => setImportModalOpen(false)} disabled={isImporting} />
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Abonnement calendrier ── */}
      <Modal visible={subscribeModalOpen} animationType="slide" transparent onRequestClose={() => { setSubscribeModalOpen(false); setSubscriptionView('list'); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, { textAlign: 'center' }]}>🔗 {t('calendar.subscribe') || 'Abonnements'}</Text>

            {/* Onglets Actifs (large) / + (petit, violet) */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14, alignItems: 'center' }}>
              <TouchableOpacity
                style={[{ flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center', backgroundColor: isDark ? '#374151' : '#e5e7eb', borderWidth: subscriptionView === 'list' ? 2 : 0, borderColor: '#7c3aed' }]}
                onPress={() => setSubscriptionView('list')}
              >
                <Text style={{ color: isDark ? '#fff' : '#1f2937', fontWeight: subscriptionView === 'list' ? '700' : '500', fontSize: 13 }}>✅ {t('calendar.subscriptionsActive') || 'Actifs'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' }}
                onPress={() => setSubscriptionView('add')}
              >
                <Text style={{ color: '#fff', fontSize: 24, lineHeight: 28, fontWeight: '300' }}>+</Text>
              </TouchableOpacity>
            </View>

            {subscriptionView === 'list' ? (
              <ScrollView style={{ maxHeight: 320 }}>
                {calendarSubscriptions.length === 0 ? (
                  <View style={{ padding: 24, alignItems: 'center' }}>
                    <Text style={{ fontSize: 32, marginBottom: 8 }}>🔗</Text>
                    <Text style={{ fontSize: 14, color: isDark ? '#9ca3af' : '#6b7280', textAlign: 'center' }}>
                      {t('calendar.noSubscriptions') || 'Aucun abonnement actif.\nAjoutez un calendrier ICS pour le synchroniser automatiquement.'}
                    </Text>
                  </View>
                ) : (
                  calendarSubscriptions.map((sub: any) => ((sub => {
                    const hasError = !!sub.lastSyncError;
                    const hasSynced = !!sub.lastSyncAt;
                    const statusColor = hasError ? '#ef4444' : hasSynced ? '#22c55e' : '#f59e0b';
                    const statusLabel = hasError
                      ? (t('calendar.syncError') || 'Erreur de sync')
                      : hasSynced
                        ? (t('calendar.lastSync') || 'Dernière sync')
                        : (t('calendar.neverSynced') || 'Jamais synchronisé');
                    const statusIcon = hasError ? '⚠️' : hasSynced ? '✅' : '⏳';
                    const subColor = sub.color || '#6366f1';
                    const isPickingColor = colorPickerSubId === sub.id;
                    const PRESET_COLORS = ['#6366f1','#3b82f6','#22c55e','#f59e0b','#ef4444','#ec4899','#8b5cf6','#14b8a6','#f97316','#64748b'];
                    const FREQ_OPTIONS = [
                      { label: t('calendar.syncFreq1h') || '1h', value: 3600 },
                      { label: t('calendar.syncFreq6h') || '6h', value: 21600 },
                      { label: t('calendar.syncFreq24h') || '24h', value: 86400 },
                    ];
                    const currentFreq = sub.syncFrequency || 3600;
                    return (
                    <View key={sub.id} style={{ backgroundColor: isDark ? '#2a2a2a' : '#f9fafb', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: statusColor + '55' }}>
                      {/* En-tête : pastille couleur + nom + badge statut */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                        <TouchableOpacity
                          onPress={() => setColorPickerSubId(isPickingColor ? null : sub.id)}
                          style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: subColor, marginRight: 8, borderWidth: 2, borderColor: isDark ? '#ffffff33' : '#00000022' }}
                        />
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? '#ffffff' : '#1f2937', flex: 1, textAlign: 'center' }} numberOfLines={1}>{sub.name}</Text>
                            {/* Badge statut */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: statusColor + '22', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 12, borderWidth: 1, borderColor: statusColor + '66' }}>
                              <Text style={{ fontSize: 10 }}>{statusIcon}</Text>
                              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: statusColor, marginLeft: 4 }} />
                            </View>
                          </View>
                          <Text style={{ fontSize: 11, color: isDark ? '#9ca3af' : '#6b7280', marginTop: 2, textAlign: 'center' }} numberOfLines={1}>{sub.url}</Text>
                        </View>
                      </View>
                      {/* Sélecteur de couleur (inline) */}
                      {isPickingColor && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10, paddingVertical: 8, paddingHorizontal: 4, backgroundColor: isDark ? '#1f2937' : '#f3f4f6', borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
                          {PRESET_COLORS.map(c => (
                            <TouchableOpacity
                              key={c}
                              onPress={() => updateSubscription.mutate({ id: sub.id, color: c })}
                              style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c, borderWidth: subColor === c ? 3 : 1.5, borderColor: subColor === c ? '#fff' : (isDark ? '#ffffff44' : '#00000022') }}
                            />
                          ))}
                        </View>
                      )}
                      {/* Ligne de statut */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingHorizontal: 4, paddingVertical: 5, backgroundColor: statusColor + '11', borderRadius: 6 }}>
                        <Text style={{ fontSize: 11, color: statusColor, fontWeight: '600', flex: 1, textAlign: 'center' }}>
                          {statusLabel}{hasSynced ? ` : ${new Date(sub.lastSyncAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}` : ''}
                        </Text>
                        {hasError && (
                          <Text style={{ fontSize: 10, color: '#ef4444', flex: 2, textAlign: 'center' }} numberOfLines={1}>{sub.lastSyncError}</Text>
                        )}
                      </View>
                      {/* Fréquence de sync */}
                      <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 8 }}>
                        {FREQ_OPTIONS.map(opt => (
                          <TouchableOpacity
                            key={opt.value}
                            onPress={() => updateSubscription.mutate({ id: sub.id, syncFrequency: opt.value })}
                            style={{ paddingVertical: 4, paddingHorizontal: 12, borderRadius: 20, backgroundColor: currentFreq === opt.value ? '#7c3aed' : (isDark ? '#374151' : '#e5e7eb') }}
                          >
                            <Text style={{ fontSize: 12, fontWeight: '600', color: currentFreq === opt.value ? '#fff' : (isDark ? '#d1d5db' : '#374151') }}>{opt.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      {/* Boutons icônes seules */}
                      <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
                        <TouchableOpacity
                          style={{ backgroundColor: '#7c3aed', paddingVertical: 9, paddingHorizontal: 18, borderRadius: 7, alignItems: 'center', justifyContent: 'center' }}
                          onPress={() => syncSubscription.mutate({ id: sub.id })}
                          disabled={syncSubscription.isPending || deleteSubscriptionEvents.isPending}
                        >
                          <Text style={{ color: '#fff', fontSize: 18 }}>🔄</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{ backgroundColor: '#f59e0b', paddingVertical: 9, paddingHorizontal: 18, borderRadius: 7, alignItems: 'center', justifyContent: 'center' }}
                          onPress={() => Alert.alert(
                            t('calendar.deleteImportedEvents') || 'Supprimer et réimporter',
                            `Supprimer tous les événements importés de "${sub.name}" et les réimporter ?`,
                            [
                              { text: t('common.cancel') || 'Annuler', style: 'cancel' },
                              { text: 'OK', style: 'destructive', onPress: () => deleteSubscriptionEvents.mutate({ id: sub.id }) },
                            ]
                          )}
                          disabled={deleteSubscriptionEvents.isPending || syncSubscription.isPending}
                        >
                          <Text style={{ color: '#fff', fontSize: 18 }}>🗑️↩</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{ backgroundColor: '#ef4444', paddingVertical: 9, paddingHorizontal: 18, borderRadius: 7, alignItems: 'center', justifyContent: 'center' }}
                          onPress={() => Alert.alert(
                            t('common.delete') || 'Supprimer',
                            `${t('calendar.deleteSubscriptionConfirm') || 'Supprimer l\'abonnement et tous ses événements importés'} "${sub.name}" ?`,
                            [
                              { text: t('common.cancel') || 'Annuler', style: 'cancel' },
                              { text: t('common.delete') || 'Supprimer', style: 'destructive', onPress: () => deleteSubscription.mutate({ id: sub.id }) },
                            ]
                          )}
                        >
                          <Text style={{ color: '#fff', fontSize: 18 }}>🗑️</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    );
                  })(sub)))
                )}
              </ScrollView>
            ) : (
              <ScrollView style={{ maxHeight: 320 }}>
                <Text style={styles.importInfoText}>{t('calendar.subscribeDesc') || "Entrez l'URL d'un calendrier ICS (Google, Apple, etc.)."}</Text>
                <Text style={[styles.label, { marginTop: 12 }]}>{t('calendar.subscriptionName') || 'Nom'}</Text>
                <TextInput
                  style={styles.input}
                  value={subscribeName}
                  onChangeText={setSubscribeName}
                  placeholder={t('calendar.subscriptionNamePlaceholder') || 'Ex: Calendrier travail'}
                  placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
                />
                <Text style={[styles.label, { marginTop: 10 }]}>URL</Text>
                <TextInput
                  style={[styles.input, { marginTop: 4 }]}
                  value={subscribeUrl}
                  onChangeText={setSubscribeUrl}
                  placeholder="https://calendar.google.com/calendar/ical/..."
                  placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
                  autoCapitalize="none"
                  keyboardType="url"
                  multiline
                />
                <TouchableOpacity
                  style={[styles.importSelectButton, { marginTop: 14, opacity: (!subscribeUrl.trim() || !subscribeName.trim() || createSubscription.isPending) ? 0.6 : 1 }]}
                  disabled={!subscribeUrl.trim() || !subscribeName.trim() || createSubscription.isPending}
                  onPress={async () => {
                    if (!subscribeUrl.trim() || !subscribeName.trim()) return;
                    try {
                      await createSubscription.mutateAsync({ name: subscribeName.trim(), url: subscribeUrl.trim() });
                      setSubscriptionView('list');
                      Alert.alert('✓', t('calendar.subscriptionAdded') || 'Abonnement ajouté avec succès !');
                    } catch (e: any) {
                      Alert.alert('Erreur', e.message || 'Impossible d\'ajouter l\'abonnement');
                    }
                  }}
                >
                  <Text style={styles.importSelectButtonText}>
                    {createSubscription.isPending ? '🔄 Ajout en cours...' : '🔗 ' + (t('calendar.addSubscription') || 'Ajouter l\'abonnement')}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            {/* Bouton fermer */}
            <View style={[styles.iconBtnRow, { justifyContent: 'center', marginTop: 12 }]}>
              <ModalIconButton icon="✕" color={isDark ? '#374151' : '#e5e7eb'} onPress={() => { setSubscribeModalOpen(false); setSubscriptionView('list'); }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Export ── */}
      <Modal visible={exportModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('calendar.export') || 'Exporter'}</Text>
            <Text style={styles.importInfoText}>{t('calendar.exportDesc') || 'Exportez vos événements au format ICS.'}</Text>
            <TouchableOpacity style={[styles.importSelectButton, { marginTop: 16 }]} onPress={() => setExportModalOpen(false)}>
              <Text style={styles.importSelectButtonText}>{t('calendar.exportICS') || '📤 Exporter en .ics'}</Text>
            </TouchableOpacity>
            {/* Bouton icône fermer */}
            <View style={[styles.iconBtnRow, { justifyContent: 'center', marginTop: 8 }]}>
              <ModalIconButton icon="✕" color={isDark ? '#374151' : '#e5e7eb'} onPress={() => setExportModalOpen(false)} />
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Dropdown Catégorie ── */}
      <Modal visible={showCategoryDropdown} animationType="fade" transparent>
        <TouchableOpacity style={styles.dropdownOverlay} activeOpacity={1} onPress={() => setShowCategoryDropdown(false)}>
          <View style={[styles.dropdownContent, { paddingVertical: 8 }]} onStartShouldSetResponder={() => true}>
            <Text style={styles.dropdownTitle}>{t('calendar.category') || 'Catégorie'}</Text>
            {EVENT_CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.value}
                style={[styles.pickerOption, formData.category === cat.value && { backgroundColor: cat.color + '33' }]}
                onPress={() => { setFormData(p => ({ ...p, category: cat.value })); setShowCategoryDropdown(false); }}
              >
                <Text style={styles.pickerOptionText}>{cat.icon} {getCategoryLabel(cat)}</Text>
                {formData.category === cat.value && <Text style={{ color: cat.color, fontSize: 18 }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Dropdown Rappel ── */}
      <Modal visible={showReminderDropdown} animationType="fade" transparent>
        <TouchableOpacity style={styles.dropdownOverlay} activeOpacity={1} onPress={() => setShowReminderDropdown(false)}>
          <View style={[styles.dropdownContent, { paddingVertical: 8 }]} onStartShouldSetResponder={() => true}>
            <Text style={styles.dropdownTitle}>{t('calendar.reminder') || 'Rappel'}</Text>
            {REMINDER_OPTIONS.map(option => (
              <TouchableOpacity
                key={option.value}
                style={[styles.pickerOption, formData.reminder === option.value && { backgroundColor: isDark ? '#374151' : '#ede9fe' }]}
                onPress={() => { setFormData(p => ({ ...p, reminder: option.value })); setShowReminderDropdown(false); }}
              >
                <Text style={styles.pickerOptionText}>🔔 {option.label}</Text>
                {formData.reminder === option.value && <Text style={{ color: '#7c3aed', fontSize: 18 }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Sélection calendriers Google ── */}
      <Modal visible={googleCalendarModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🗓️ Calendriers Google</Text>
            <Text style={[styles.importInfoText, { marginBottom: 12 }]}>
              Sélectionnez un calendrier à synchroniser avec FRI2PLAN.
            </Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {googleCalendars.length === 0 ? (
                <Text style={[styles.importInfoText, { textAlign: 'center', marginTop: 20 }]}>{t('calendar.noCalendarsFound')}</Text>
              ) : googleCalendars.map((cal: any) => (
                <TouchableOpacity
                  key={cal.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 14,
                    marginBottom: 8,
                    borderRadius: 10,
                    backgroundColor: isDark ? '#2a2a2a' : '#f9fafb',
                    borderWidth: 1,
                    borderColor: isDark ? '#374151' : '#e5e7eb',
                    opacity: googleCalendarLoading ? 0.6 : 1,
                  }}
                  onPress={() => subscribeGoogleCalendar(cal)}
                  disabled={googleCalendarLoading}
                >
                  <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: cal.backgroundColor || '#4285f4', marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: isDark ? '#ffffff' : '#1f2937' }}>
                      {cal.summary}{cal.primary ? ' ★' : ''}
                    </Text>
                    {cal.description ? (
                      <Text style={{ fontSize: 12, color: isDark ? '#9ca3af' : '#6b7280', marginTop: 2 }} numberOfLines={1}>
                        {cal.description}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={{ fontSize: 18, color: '#4285f4' }}>+</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={[styles.iconBtnRow, { justifyContent: 'center', marginTop: 8 }]}>
              <ModalIconButton icon="✕" color={isDark ? '#374151' : '#e5e7eb'} onPress={() => setGoogleCalendarModal(false)} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const getStyles = (isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDark ? '#111827' : '#f9fafb' },
  content: { flex: 1 },

  // ── Titre page ──
  pageTitleContainer: {
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#374151' : '#e5e7eb'},
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: isDark ? '#ffffff' : '#1f2937',
    textAlign: 'center'},

  // ── Badge filtres actifs ──
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center'},
  filterBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  // ── Menu 3 points ──
  calMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 130,
    paddingRight: 12},
  calMenuContent: {
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8},
  calMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16},
  calMenuItemActive: {
    backgroundColor: isDark ? '#312e81' : '#ede9fe'},
  calMenuIcon: { fontSize: 20, marginRight: 12 },
  calMenuLabel: {
    fontSize: 15,
    color: isDark ? '#f3f4f6' : '#1f2937'},
  calMenuLabelActive: {
    color: isDark ? '#a5b4fc' : '#7c3aed',
    fontWeight: '600'},
  calMenuDivider: {
    height: 1,
    backgroundColor: isDark ? '#374151' : '#e5e7eb',
    marginVertical: 4},

  // ── Barre sélecteur de vue ──
  viewBar: {
    flexDirection: 'row',
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#374151' : '#e5e7eb',
    justifyContent: 'space-around'},
  calIconWrapper: { alignItems: 'center', justifyContent: 'center', padding: 4, borderRadius: 8 },
  calIconWrapperActive: { backgroundColor: isDark ? '#4c1d95' : '#ede9fe' },
  calIcon: {
    width: 44, height: 44, borderRadius: 8, overflow: 'hidden',
    borderWidth: 1.5, borderColor: isDark ? '#6b7280' : '#d1d5db',
    backgroundColor: isDark ? '#374151' : '#ffffff'},
  calIconActive: { borderColor: '#ef4444' },
  calIconBand: {
    height: 14, backgroundColor: isDark ? '#6b7280' : '#e5e7eb',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6},
  calIconBandActive: { backgroundColor: '#ef4444' },
  calIconRing: {
    width: 4, height: 6, borderRadius: 2,
    backgroundColor: isDark ? '#d1d5db' : '#9ca3af',
    borderWidth: 1, borderColor: isDark ? '#9ca3af' : '#6b7280'},
  calIconBody: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  calIconNumber: { fontSize: 16, fontWeight: 'bold', color: isDark ? '#d1d5db' : '#374151', lineHeight: 20 },
  calIconNumberActive: { color: '#ef4444' },
  agendaLine: { height: 2.5, borderRadius: 2, backgroundColor: isDark ? '#6b7280' : '#d1d5db', marginVertical: 2, alignSelf: 'flex-start', marginLeft: 6 },

  // ── Navigation mois ──
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: isDark ? '#1f2937' : '#ffffff'},
  navArrow: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center'},
  navArrowText: {
    fontSize: 28,
    fontWeight: '300',
    color: isDark ? '#d1d5db' : '#374151',
    lineHeight: 32},
  monthTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDark ? '#ffffff' : '#1f2937',
    textAlign: 'center',
    textTransform: 'capitalize',
    flex: 1},

  // ── Grille calendrier ──
  calendar: {
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
    paddingHorizontal: 8,
    paddingBottom: 8},
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  dayHeader: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  dayHeaderText: { fontSize: 13, fontWeight: '600', color: isDark ? '#9ca3af' : '#6b7280' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 8, marginBottom: 2 },
  dayCellSelected: { backgroundColor: '#7c3aed' },
  dayCellToday: { borderWidth: 2, borderColor: '#ef4444' },
  dayCellOutside: { opacity: 0.35 },
  dayText: { fontSize: 15, color: isDark ? '#ffffff' : '#1f2937' },
  dayTextSelected: { color: '#fff', fontWeight: 'bold' },
  dayTextToday: { color: '#ef4444', fontWeight: 'bold' },
  dayTextOutside: { color: isDark ? '#6b7280' : '#9ca3af' },
  eventDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#7c3aed', position: 'absolute', bottom: 3 },

  // ── Section événements ──
  eventsSection: { margin: 10, backgroundColor: isDark ? '#1a1a1a' : '#fff', borderRadius: 12, padding: 16 },
  eventsSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  eventsTitle: { fontSize: 16, fontWeight: 'bold', color: isDark ? '#ffffff' : '#1f2937', textTransform: 'capitalize', flex: 1 },
  addEventBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' },
  addEventBtnText: { color: '#fff', fontSize: 20, lineHeight: 28, fontWeight: 'bold' },
  eventCard: { flexDirection: 'row', backgroundColor: isDark ? '#2a2a2a' : '#f9fafb', borderRadius: 8, marginBottom: 10, overflow: 'hidden' },
  eventColorBar: { width: 4 },
  eventCardContent: { flex: 1, padding: 12 },
  eventHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  eventIcon: { fontSize: 16, marginRight: 6 },
  eventTime: { fontSize: 14, fontWeight: 'bold', color: '#7c3aed', flex: 1 },
  privateIcon: { fontSize: 12 },
  eventTitle: { fontSize: 15, fontWeight: '600', color: isDark ? '#ffffff' : '#1f2937', marginBottom: 2 },
  eventDescription: { fontSize: 13, color: isDark ? '#d1d5db' : '#6b7280' },
  moreEventsBtn: { paddingVertical: 8, alignItems: 'center', borderRadius: 8, backgroundColor: isDark ? '#374151' : '#f3f4f6', marginTop: 4 },
  moreEventsBtnText: { fontSize: 13, fontWeight: '600', color: '#7c3aed' },
  noEvents: { padding: 20, alignItems: 'center', borderRadius: 10, backgroundColor: isDark ? '#1f2937' : '#f9fafb', marginTop: 4 },
  noEventsText: { fontSize: 15, color: isDark ? '#9ca3af' : '#9ca3af' },
  noEventsHint: { fontSize: 12, color: isDark ? '#6b7280' : '#9ca3af', marginTop: 4 },

  // ── Agenda ──
  agendaContainer: { padding: 16 },
  agendaDateHeader: { paddingVertical: 10, marginTop: 14, marginBottom: 6, borderBottomWidth: 2, borderBottomColor: '#7c3aed' },
  agendaDateText: { fontSize: 15, fontWeight: 'bold', color: isDark ? '#ffffff' : '#1f2937' },
  agendaEventCard: { flexDirection: 'row', backgroundColor: isDark ? '#1f2937' : '#fff', borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: isDark ? '#374151' : '#e5e7eb', overflow: 'hidden' },
  agendaEventColorBar: { width: 4 },
  agendaEventContent: { flex: 1, padding: 12 },
  agendaEventHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  agendaEventIcon: { fontSize: 16, marginRight: 6 },
  agendaEventTime: { fontSize: 13, fontWeight: '600', color: isDark ? '#fbbf24' : '#7c3aed', marginRight: 6 },
  agendaPrivateIcon: { fontSize: 12 },
  agendaEventTitle: { fontSize: 15, fontWeight: '600', color: isDark ? '#ffffff' : '#1f2937', marginBottom: 2 },
  agendaEventDescription: { fontSize: 13, color: isDark ? '#d1d5db' : '#6b7280' },
  agendaEmpty: { padding: 40, alignItems: 'center' },
  agendaEmptyText: { fontSize: 15, color: isDark ? '#9ca3af' : '#9ca3af' },

  // ── Semaine ──
  weekViewContainer: { flex: 1 },
  weekNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 10, backgroundColor: isDark ? '#1f2937' : '#fff', borderBottomWidth: 1, borderBottomColor: isDark ? '#374151' : '#e5e7eb' },
  weekNavTitle: { fontSize: 16, fontWeight: 'bold', color: isDark ? '#ffffff' : '#1f2937', flex: 1, textAlign: 'center' },
  weekHeader: { flexDirection: 'row', backgroundColor: isDark ? '#1f2937' : '#fff', borderBottomWidth: 2, borderBottomColor: isDark ? '#374151' : '#e5e7eb' },
  weekTimeColumn: { width: 50 },
  weekDayHeader: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  weekDayName: { fontSize: 11, fontWeight: '600', color: isDark ? '#9ca3af' : '#6b7280', textTransform: 'uppercase' },
  weekDayNameToday: { color: '#7c3aed' },
  weekDayNumber: { fontSize: 15, fontWeight: 'bold', color: isDark ? '#ffffff' : '#1f2937', marginTop: 2 },
  weekDayNumberToday: { color: '#7c3aed' },
  weekTimeline: { flex: 1 },
  weekTimeRow: { flexDirection: 'row', minHeight: 80, borderBottomWidth: 1, borderBottomColor: isDark ? '#374151' : '#e5e7eb' },
  weekTimeLabel: { width: 50, paddingTop: 6, paddingRight: 6, alignItems: 'flex-end' },
  weekTimeLabelText: { fontSize: 10, color: isDark ? '#9ca3af' : '#6b7280', fontWeight: '600' },
  weekDayColumn: { flex: 1, position: 'relative', borderRightWidth: 1, borderRightColor: isDark ? '#2a2a2a' : '#f3f4f6' },
  weekEventCard: { position: 'absolute', left: 1, right: 1, borderLeftWidth: 3, borderRadius: 3, padding: 3, overflow: 'hidden' },
  weekEventIcon: { fontSize: 10 },
  weekEventTitle: { fontSize: 10, fontWeight: '600', color: isDark ? '#ffffff' : '#1f2937' },
  weekEventTime: { fontSize: 9, color: isDark ? '#fbbf24' : '#7c3aed', marginTop: 1 },

  // ── Jour ──
  dayViewContainer: { flex: 1 },
  dayNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 10, backgroundColor: isDark ? '#1f2937' : '#fff', borderBottomWidth: 1, borderBottomColor: isDark ? '#374151' : '#e5e7eb' },
  dayNavTitle: { fontSize: 16, fontWeight: 'bold', color: isDark ? '#ffffff' : '#1f2937', flex: 1, textAlign: 'center' },
  dayTimeline: { flex: 1 },
  dayTimeSlot: { flexDirection: 'row', minHeight: 100, borderBottomWidth: 1, borderBottomColor: isDark ? '#374151' : '#e5e7eb' },
  dayTimeLabel: { width: 56, paddingTop: 8, paddingRight: 8, alignItems: 'flex-end' },
  dayTimeLabelText: { fontSize: 11, color: isDark ? '#9ca3af' : '#6b7280', fontWeight: '600' },
  dayTimeContent: { flex: 1, position: 'relative', paddingLeft: 6 },
  dayTimeHalfHourLine: { position: 'absolute', top: 50, left: 0, right: 0, height: 1, backgroundColor: isDark ? '#2a2a2a' : '#f3f4f6' },
  dayEventCard: { position: 'absolute', left: 6, right: 6, borderLeftWidth: 4, borderRadius: 6, padding: 6, overflow: 'hidden' },
  dayEventTime: { fontSize: 10, fontWeight: '600', color: isDark ? '#fbbf24' : '#7c3aed', marginBottom: 2 },
  dayEventHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 1 },
  dayEventIcon: { fontSize: 12, marginRight: 3 },
  dayEventTitle: { flex: 1, fontSize: 13, fontWeight: '600', color: isDark ? '#ffffff' : '#1f2937' },
  dayEventPrivate: { fontSize: 11 },
  dayEventDescription: { fontSize: 11, color: isDark ? '#d1d5db' : '#6b7280', marginTop: 2 },

  // ── Modaux ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: isDark ? '#1a1a1a' : '#fff', borderRadius: 16, padding: 20, width: '90%', maxHeight: '85%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: isDark ? '#ffffff' : '#1f2937', marginBottom: 16 },
  modalForm: { maxHeight: 400 },
  label: { fontSize: 13, fontWeight: '600', color: isDark ? '#ffffff' : '#374151', marginTop: 10, marginBottom: 4 },
  input: { backgroundColor: isDark ? '#000000' : '#f9fafb', borderWidth: 1, borderColor: isDark ? '#ffffff' : '#e5e7eb', borderRadius: 8, padding: 12, fontSize: 15, color: isDark ? '#ffffff' : '#1f2937' },
  textArea: { height: 80, textAlignVertical: 'top' },
  categoryScroll: { marginVertical: 6 },
  categoryButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: isDark ? '#ffffff' : '#e5e7eb', marginRight: 6, backgroundColor: isDark ? '#2a2a2a' : '#fff' },
  categoryIcon: { fontSize: 16, marginRight: 4 },
  categoryLabel: { fontSize: 13, color: isDark ? '#d1d5db' : '#6b7280' },
  categoryLabelSelected: { color: '#fff', fontWeight: '600' },
  reminderScroll: { marginVertical: 6 },
  reminderButton: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: isDark ? '#ffffff' : '#e5e7eb', marginRight: 6, backgroundColor: isDark ? '#2a2a2a' : '#fff' },
  reminderButtonSelected: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  reminderButtonText: { fontSize: 13, color: isDark ? '#d1d5db' : '#6b7280' },
  reminderButtonTextSelected: { color: '#fff', fontWeight: '600' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: isDark ? '#ffffff' : '#d1d5db', marginRight: 8, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  checkboxLabel: { fontSize: 15, color: isDark ? '#ffffff' : '#374151' },

  // ── Boutons icônes modaux ──
  iconBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16},

  // ── Dropdown ──
  dropdownOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  dropdownContent: { backgroundColor: isDark ? '#1a1a1a' : '#fff', borderRadius: 16, padding: 20, width: '90%', maxHeight: '70%' },
  dropdownTitle: { fontSize: 17, fontWeight: 'bold', color: isDark ? '#ffffff' : '#1f2937', marginBottom: 14, textTransform: 'capitalize' },
  dropdownAddButton: { backgroundColor: '#7c3aed', paddingVertical: 11, borderRadius: 8, alignItems: 'center', marginBottom: 14 },
  dropdownAddButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  dropdownEventsList: { maxHeight: 280 },
  dropdownEventCard: { flexDirection: 'row', backgroundColor: isDark ? '#2a2a2a' : '#f9fafb', borderRadius: 8, marginBottom: 8, overflow: 'hidden' },
  dropdownEventColorBar: { width: 4 },
  dropdownEventContent: { flex: 1, padding: 10 },
  dropdownEventHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  dropdownEventIcon: { fontSize: 16, marginRight: 6 },
  dropdownEventTime: { fontSize: 13, fontWeight: '600', color: '#7c3aed', flex: 1 },
  dropdownPrivateIcon: { fontSize: 12 },
  dropdownEventTitle: { fontSize: 15, fontWeight: '600', color: isDark ? '#ffffff' : '#1f2937', marginBottom: 1 },
  dropdownEventDescription: { fontSize: 13, color: isDark ? '#d1d5db' : '#6b7280' },

  // ── Filtres ──
  filterSectionTitle: { fontSize: 15, fontWeight: 'bold', color: isDark ? '#ffffff' : '#1f2937', marginTop: 14, marginBottom: 10 },
  filterCheckboxContainer: { gap: 6 },
  filterCheckboxRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  filterCheckboxIcon: { fontSize: 16, marginLeft: 6, marginRight: 6 },
  filterCheckboxLabel: { fontSize: 15, color: isDark ? '#ffffff' : '#374151' },

  // ── Import/Export ──
  importInfo: { marginBottom: 16 },
  importInfoText: { fontSize: 14, color: isDark ? '#d1d5db' : '#6b7280', lineHeight: 20 },
  importInfoNote: { fontSize: 13, color: '#f59e0b', marginTop: 8 },
  importSelectButton: { backgroundColor: '#7c3aed', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  importSelectButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  // ── Dropdown Trigger (catégorie, rappel, date, heure) ──
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14},
  dropdownTriggerText: {
    fontSize: 15,
    color: isDark ? '#ffffff' : '#1f2937',
    flex: 1},
  dropdownChevron: {
    fontSize: 12,
    color: isDark ? '#9ca3af' : '#6b7280',
    marginLeft: 8},

  // ── Picker options (dans les modaux dropdown) ──
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4},
  pickerOptionText: {
    fontSize: 16,
    color: isDark ? '#ffffff' : '#1f2937'}});
