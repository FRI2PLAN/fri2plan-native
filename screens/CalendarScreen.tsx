import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CalendarScreenProps {
  onNavigate?: (screen: string) => void;
}

interface Event {
  id: string;
  title: string;
  date: Date;
  time: string;
  color: string;
  type: 'event' | 'task';
}

export default function CalendarScreen({ onNavigate }: CalendarScreenProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Mock events data
  const mockEvents: Event[] = [
    { id: '1', title: 'Réunion d\'équipe', date: new Date(), time: '10:30', color: '#7c3aed', type: 'event' },
    { id: '2', title: 'Rendez-vous médecin', date: new Date(), time: '14:00', color: '#ef4444', type: 'event' },
    { id: '3', title: 'Faire les courses', date: new Date(), time: '16:30', color: '#10b981', type: 'task' },
  ];

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

  const getEventsForDate = (date: Date) => {
    return mockEvents.filter(event => isSameDay(event.date, date));
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

      <ScrollView style={styles.content}>
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
          
          {selectedDateEvents.length > 0 ? (
            selectedDateEvents.map(event => (
              <View key={event.id} style={[styles.eventCard, { borderLeftColor: event.color }]}>
                <View style={styles.eventHeader}>
                  <Text style={styles.eventTime}>{event.time}</Text>
                  <View style={[styles.eventBadge, { backgroundColor: event.color }]}>
                    <Text style={styles.eventBadgeText}>
                      {event.type === 'event' ? 'Événement' : 'Tâche'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.eventTitle}>{event.title}</Text>
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
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#7c3aed',
    position: 'absolute',
    bottom: 5,
  },
  eventsSection: {
    padding: 20,
  },
  eventsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
    textTransform: 'capitalize',
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  eventBadge: {
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
  },
  noEvents: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  noEventsText: {
    fontSize: 16,
    color: '#9ca3af',
  },
});
