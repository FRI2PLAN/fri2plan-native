import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, TextInput, RefreshControl, Modal, useColorScheme, FlatList } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, addDays, subDays, startOfDay, endOfDay } from 'date-fns';
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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const styles = getStyles(isDark);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'agenda'>('month');

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

  // Fetch events
  const { data: events, isLoading, refetch } = trpc.events.list.useQuery();
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
    return events.filter(event => {
      const eventDate = new Date(event.startTime);
      return isSameDay(eventDate, date);
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
      </View>

      {/* View Mode Toggle */}
      <View style={styles.viewToggleContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity 
            style={[styles.viewToggleButton, viewMode === 'month' && styles.viewToggleButtonActive]}
            onPress={() => saveViewMode('month')}
          >
            <Text style={[styles.viewToggleText, viewMode === 'month' && styles.viewToggleTextActive]}>📅 Mois</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.viewToggleButton, viewMode === 'week' && styles.viewToggleButtonActive]}
            onPress={() => saveViewMode('week')}
          >
            <Text style={[styles.viewToggleText, viewMode === 'week' && styles.viewToggleTextActive]}>📆 Semaine</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.viewToggleButton, viewMode === 'day' && styles.viewToggleButtonActive]}
            onPress={() => saveViewMode('day')}
          >
            <Text style={[styles.viewToggleText, viewMode === 'day' && styles.viewToggleTextActive]}>🗓️ Jour</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.viewToggleButton, viewMode === 'agenda' && styles.viewToggleButtonActive]}
            onPress={() => saveViewMode('agenda')}
          >
            <Text style={[styles.viewToggleText, viewMode === 'agenda' && styles.viewToggleTextActive]}>📝 Agenda</Text>
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
                  key={index}
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                    isTodayDate && styles.dayCellToday,
                  ]}
                  onPress={() => setSelectedDate(day)}
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

        {/* Week View - Coming soon */}
        {viewMode === 'week' && (
          <View style={styles.comingSoonContainer}>
            <Text style={styles.comingSoonText}>📆 Vue Semaine</Text>
            <Text style={styles.comingSoonSubtext}>Disponible prochainement</Text>
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
    </SafeAreaView>
  );
}

const getStyles = (isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDark ? '#000000' : '#f9fafb' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: isDark ? '#1a1a1a' : '#fff', borderBottomWidth: 1, borderBottomColor: isDark ? '#ffffff' : '#e5e7eb' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: isDark ? '#ffffff' : '#1f2937' },
  addButton: { backgroundColor: '#7c3aed', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  addButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  content: { flex: 1 },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: isDark ? '#1a1a1a' : '#fff', marginTop: 10, marginHorizontal: 10, borderRadius: 12 },
  navButton: { padding: 10 },
  navButtonText: { fontSize: 24, color: '#7c3aed', fontWeight: 'bold' },
  monthTitle: { fontSize: 18, fontWeight: 'bold', color: isDark ? '#ffffff' : '#1f2937', textTransform: 'capitalize' },
  calendar: { backgroundColor: isDark ? '#1a1a1a' : '#fff', margin: 10, borderRadius: 12, padding: 10 },
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
  eventsSection: { margin: 10, backgroundColor: isDark ? '#1a1a1a' : '#fff', borderRadius: 12, padding: 20 },
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
  modalContent: { backgroundColor: isDark ? '#1a1a1a' : '#fff', borderRadius: 12, padding: 24, width: '90%', maxHeight: '80%' },
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
});

