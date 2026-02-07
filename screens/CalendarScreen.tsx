import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, RefreshControl, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { trpc } from '../lib/trpc';

interface CalendarScreenProps {
  onNavigate?: (screen: string) => void;
}

export default function CalendarScreen({ onNavigate }: CalendarScreenProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  // Fetch events from API
  const { data: events, isLoading, refetch } = trpc.events.list.useQuery();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const handlePreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

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

  const selectedDateEvents = getEventsForDate(selectedDate);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Calendrier</Text>
        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonText}>+ Nouvel événement</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7c3aed']} />
        }
      >
        {/* Month Navigation */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={handlePreviousMonth} style={styles.navButton}>
            <Text style={styles.navButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.monthTitle}>
            {format(currentDate, 'MMMM yyyy', { locale: fr })}
          </Text>
          <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
            <Text style={styles.navButtonText}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendar}>
          {/* Day headers */}
          <View style={styles.weekRow}>
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, index) => (
              <View key={index} style={styles.dayHeader}>
                <Text style={styles.dayHeaderText}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Days grid */}
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
                  onPress={() => handleDateSelect(day)}
                >
                  <Text style={[
                    styles.dayText,
                    isSelected && styles.dayTextSelected,
                    isTodayDate && styles.dayTextToday,
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
            {format(selectedDate, 'EEEE d MMMM', { locale: fr })}
          </Text>
          
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#7c3aed" />
            </View>
          ) : selectedDateEvents.length > 0 ? (
            selectedDateEvents.map(event => (
              <View key={event.id} style={styles.eventCard}>
                <View style={styles.eventHeader}>
                  <Text style={styles.eventTime}>
                    {format(new Date(event.startTime), 'HH:mm')}
                  </Text>
                  <View style={styles.eventBadge}>
                    <Text style={styles.eventBadgeText}>Événement</Text>
                  </View>
                </View>
                <Text style={styles.eventTitle}>{event.title}</Text>
                {event.description && (
                  <Text style={styles.eventDescription}>{event.description}</Text>
                )}
                {event.location && (
                  <Text style={styles.eventLocation}>📍 {event.location}</Text>
                )}
              </View>
            ))
          ) : (
            <View style={styles.noEvents}>
              <Text style={styles.noEventsText}>Aucun événement pour cette date</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  addButton: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 10,
    marginHorizontal: 10,
    borderRadius: 12,
  },
  navButton: {
    padding: 10,
  },
  navButtonText: {
    fontSize: 24,
    color: '#7c3aed',
    fontWeight: 'bold',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    textTransform: 'capitalize',
  },
  calendar: {
    backgroundColor: '#fff',
    margin: 10,
    borderRadius: 12,
    padding: 10,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  dayHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  dayHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 5,
  },
  dayCellSelected: {
    backgroundColor: '#7c3aed',
  },
  dayCellToday: {
    borderWidth: 2,
    borderColor: '#7c3aed',
  },
  dayText: {
    fontSize: 16,
    color: '#1f2937',
  },
  dayTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  dayTextToday: {
    color: '#7c3aed',
    fontWeight: 'bold',
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#7c3aed',
    position: 'absolute',
    bottom: 2,
  },
  eventsSection: {
    margin: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  eventsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
    textTransform: 'capitalize',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  eventCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#7c3aed',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7c3aed',
  },
  eventBadge: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  eventBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 14,
    color: '#6b7280',
  },
  noEvents: {
    padding: 40,
    alignItems: 'center',
  },
  noEventsText: {
    fontSize: 16,
    color: '#9ca3af',
  },
});
