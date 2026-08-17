import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import MemberAvatar from './MemberAvatar';

interface MemberSummaryModalProps {
  member: any | null;
  tasks: any[];
  events: any[];
  onClose: () => void;
}

function parseLocalDate(value: unknown, isUtc?: boolean): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;

  const rawValue = String(value);
  if (isUtc || rawValue.endsWith('Z')) {
    const utcDate = new Date(rawValue.endsWith('Z') ? rawValue : `${rawValue.replace(' ', 'T')}Z`);
    return Number.isNaN(utcDate.getTime()) ? null : utcDate;
  }

  const normalized = rawValue.replace(' ', 'T');
  const [datePart, timePart = '00:00:00'] = normalized.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours = 0, minutes = 0, seconds = 0] = timePart.replace('Z', '').split(':').map(Number);
  const localDate = new Date(year, month - 1, day, hours, minutes, seconds);
  return Number.isNaN(localDate.getTime()) ? null : localDate;
}

function isToday(value: unknown, today: Date, isUtc?: boolean): boolean {
  const date = parseLocalDate(value, isUtc);
  return !!date && date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
}

export function getMemberDailySummary(memberId: number | string | undefined, tasks: any[], events: any[], today = new Date()) {
  const hasSameId = (value: unknown) => value !== null && value !== undefined && String(value) === String(memberId);
  const memberTasks = (tasks || [])
    .filter((task) => hasSameId(task.assignedTo) && isToday(task.dueDate, today))
    .sort((first, second) => Number(first.status === 'completed') - Number(second.status === 'completed'));
  const completedTasks = memberTasks.filter((task) => task.status === 'completed');
  const memberEvents = (events || [])
    .filter((event) => hasSameId(event.userId) && isToday(event.startDate, today, !!event.isUtc))
    .sort((first, second) => (parseLocalDate(first.startDate, !!first.isUtc)?.getTime() || 0) - (parseLocalDate(second.startDate, !!second.isUtc)?.getTime() || 0));

  return {
    memberTasks,
    completedTasks,
    memberEvents,
    pointsEarned: completedTasks.reduce((total, task) => total + (Number(task.points) || 0), 0),
  };
}

const MemberSummaryModal = ({ member, tasks, events, onClose }: MemberSummaryModalProps) => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const styles = getStyles(isDark);
  const summary = useMemo(
    () => getMemberDailySummary(member?.id, tasks, events),
    [member?.id, tasks, events]
  );

  if (!member) return null;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('common.close')} />
        <View style={styles.panel}>
          <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <View style={styles.memberHeader}>
              <View style={styles.avatarRing}>
                <MemberAvatar member={member} size={64} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>{t('dashboard.memberSummaryTitle', { name: member.name || '' })}</Text>
                <Text style={styles.subtitle}>{t('dashboard.todayAtHome')}</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{summary.completedTasks.length}/{summary.memberTasks.length}</Text>
                <Text style={styles.statLabel}>{t('dashboard.memberTasks')}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>⭐ {summary.pointsEarned}</Text>
                <Text style={styles.statLabel}>{t('dashboard.memberPoints')}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{summary.memberEvents.length}</Text>
                <Text style={styles.statLabel}>{t('dashboard.memberEvents')}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>✅ {t('dashboard.memberTasks')}</Text>
              {summary.memberTasks.length === 0 ? (
                <Text style={styles.emptyText}>{t('dashboard.memberNoTasks')}</Text>
              ) : (
                summary.memberTasks.map((task) => (
                  <View key={`task-${task.id}`} style={styles.listRow}>
                    <Text style={[styles.rowIcon, task.status === 'completed' && styles.rowIconCompleted]}>{task.status === 'completed' ? '✓' : '○'}</Text>
                    <Text style={[styles.rowTitle, task.status === 'completed' && styles.rowTitleCompleted]} numberOfLines={1}>{task.title}</Text>
                    {Number(task.points) > 0 && <Text style={styles.rowMeta}>+{task.points}</Text>}
                  </View>
                ))
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📅 {t('dashboard.memberEvents')}</Text>
              {summary.memberEvents.length === 0 ? (
                <Text style={styles.emptyText}>{t('dashboard.memberNoEvents')}</Text>
              ) : (
                summary.memberEvents.map((event) => (
                  <View key={`event-${event.id}`} style={styles.listRow}>
                    <View style={[styles.eventDot, { backgroundColor: event.color || member.userColor || '#7C3AED' }]} />
                    <Text style={styles.rowTitle} numberOfLines={1}>{event.title}</Text>
                  </View>
                ))
              )}
            </View>

            <View style={[styles.section, styles.achievementSection]}>
              <Text style={styles.sectionTitle}>✨ {t('dashboard.memberAchievements')}</Text>
              {summary.completedTasks.length === 0 ? (
                <Text style={styles.emptyText}>{t('dashboard.memberNoAchievements')}</Text>
              ) : (
                summary.completedTasks.slice(0, 3).map((task) => (
                  <Text key={`achievement-${task.id}`} style={styles.achievementText}>• {task.title}</Text>
                ))
              )}
            </View>
          </ScrollView>

          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            activeOpacity={0.72}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
          >
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

function getStyles(isDark: boolean) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(10, 8, 18, 0.62)',
      justifyContent: 'center',
      paddingHorizontal: 20,
      paddingVertical: 34,
    },
    panel: {
      width: '100%',
      maxHeight: '88%',
      borderRadius: 24,
      backgroundColor: isDark ? '#191421' : '#FFFEFB',
      borderWidth: 1,
      borderColor: isDark ? '#4B3C61' : '#E9DDFE',
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOpacity: 0.28,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 12,
    },
    content: {
      padding: 20,
      paddingBottom: 8,
    },
    memberHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginBottom: 20,
    },
    avatarRing: {
      width: 74,
      height: 74,
      borderRadius: 37,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? '#2A2037' : '#F4F0FF',
    },
    title: {
      color: isDark ? '#FFFFFF' : '#241735',
      fontSize: 22,
      fontWeight: '800',
      letterSpacing: -0.3,
    },
    subtitle: {
      color: isDark ? '#CDBEF2' : '#786590',
      marginTop: 3,
      fontSize: 13,
      fontWeight: '600',
    },
    statsRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 20,
    },
    statCard: {
      flex: 1,
      alignItems: 'center',
      borderRadius: 14,
      paddingVertical: 11,
      paddingHorizontal: 5,
      backgroundColor: isDark ? '#251C31' : '#F6F2FF',
    },
    statValue: {
      color: '#7C3AED',
      fontSize: 16,
      fontWeight: '900',
    },
    statLabel: {
      color: isDark ? '#D2C6E8' : '#77658E',
      marginTop: 3,
      fontSize: 10,
      fontWeight: '700',
      textAlign: 'center',
    },
    section: {
      marginBottom: 18,
    },
    achievementSection: {
      marginBottom: 4,
    },
    sectionTitle: {
      color: isDark ? '#FFFFFF' : '#281A42',
      fontSize: 15,
      fontWeight: '800',
      marginBottom: 8,
    },
    emptyText: {
      color: isDark ? '#AB9BBD' : '#82718F',
      fontSize: 13,
      lineHeight: 19,
      paddingVertical: 4,
    },
    listRow: {
      minHeight: 40,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      paddingHorizontal: 10,
      marginBottom: 6,
      borderRadius: 10,
      backgroundColor: isDark ? '#211A2C' : '#FAF8FC',
    },
    rowIcon: {
      color: '#9B8BAD',
      fontSize: 18,
      fontWeight: '800',
    },
    rowIconCompleted: {
      color: '#22A06B',
    },
    rowTitle: {
      flex: 1,
      color: isDark ? '#F5F1FA' : '#362844',
      fontSize: 13,
      fontWeight: '600',
    },
    rowTitleCompleted: {
      color: isDark ? '#B5A9C1' : '#8A7E94',
      textDecorationLine: 'line-through',
    },
    rowMeta: {
      color: '#7C3AED',
      fontSize: 12,
      fontWeight: '800',
    },
    eventDot: {
      width: 9,
      height: 9,
      borderRadius: 5,
    },
    achievementText: {
      color: isDark ? '#E2D7F3' : '#604D72',
      fontSize: 13,
      lineHeight: 21,
      paddingLeft: 2,
    },
    closeButton: {
      alignSelf: 'center',
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 10,
      marginBottom: 16,
      backgroundColor: isDark ? '#332744' : '#EEE7FA',
    },
    closeIcon: {
      color: isDark ? '#FFFFFF' : '#5C4677',
      fontSize: 21,
      fontWeight: '800',
    },
  });
}

export default MemberSummaryModal;
