import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface SkeletonBoxProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonBox({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonBoxProps) {
  const { isDark } = useTheme();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [isDark ? 0.15 : 0.5, isDark ? 0.35 : 0.9],
  });

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: isDark ? '#374151' : '#e5e7eb',
          opacity,
        },
        style,
      ]}
    />
  );
}

// Skeleton pour une carte du Dashboard (statistique)
export function SkeletonStatCard() {
  return (
    <View style={skeletonStyles.statCard}>
      <SkeletonBox width={40} height={40} borderRadius={20} />
      <View style={{ flex: 1, marginLeft: 12, gap: 6 }}>
        <SkeletonBox width="60%" height={12} />
        <SkeletonBox width="40%" height={20} />
      </View>
    </View>
  );
}

// Skeleton pour une ligne d'événement/tâche
export function SkeletonEventRow() {
  return (
    <View style={skeletonStyles.eventRow}>
      <SkeletonBox width={4} height={50} borderRadius={2} style={{ marginRight: 12 }} />
      <View style={{ flex: 1, gap: 6 }}>
        <SkeletonBox width="70%" height={14} />
        <SkeletonBox width="45%" height={11} />
      </View>
      <SkeletonBox width={50} height={24} borderRadius={12} />
    </View>
  );
}

// Skeleton pour une cellule de calendrier mensuel
export function SkeletonCalendarGrid() {
  const { isDark } = useTheme();
  const days = Array.from({ length: 35 });
  return (
    <View style={skeletonStyles.calGrid}>
      {days.map((_, i) => (
        <SkeletonBox
          key={i}
          width="12%"
          height={36}
          borderRadius={6}
          style={{ margin: '1%' }}
        />
      ))}
    </View>
  );
}

// Skeleton pour une tâche dans la liste
export function SkeletonTaskRow() {
  return (
    <View style={skeletonStyles.taskRow}>
      <SkeletonBox width={22} height={22} borderRadius={11} style={{ marginRight: 12 }} />
      <View style={{ flex: 1, gap: 6 }}>
        <SkeletonBox width="75%" height={14} />
        <SkeletonBox width="50%" height={11} />
      </View>
      <SkeletonBox width={60} height={22} borderRadius={11} />
    </View>
  );
}

// Skeleton complet pour le Dashboard
export function DashboardSkeleton() {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      {/* Stats cards */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
        {[1, 2, 3].map(i => (
          <View key={i} style={{ flex: 1 }}>
            <SkeletonStatCard />
          </View>
        ))}
      </View>
      {/* Section title */}
      <SkeletonBox width="40%" height={16} style={{ marginBottom: 12 }} />
      {/* Events */}
      {[1, 2, 3].map(i => <SkeletonEventRow key={i} />)}
      {/* Section title */}
      <SkeletonBox width="35%" height={16} style={{ marginTop: 20, marginBottom: 12 }} />
      {/* Tasks */}
      {[1, 2, 3].map(i => <SkeletonTaskRow key={i} />)}
    </View>
  );
}

// Skeleton complet pour le Calendar
export function CalendarSkeleton() {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      {/* Navigation mois */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <SkeletonBox width={36} height={36} borderRadius={18} />
        <SkeletonBox width="50%" height={20} />
        <SkeletonBox width={36} height={36} borderRadius={18} />
      </View>
      {/* Jours de la semaine */}
      <View style={{ flexDirection: 'row', marginBottom: 8 }}>
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
          <SkeletonBox key={i} width="12%" height={20} borderRadius={4} style={{ margin: '1%' }} />
        ))}
      </View>
      {/* Grille calendrier */}
      <SkeletonCalendarGrid />
      {/* Liste événements */}
      <SkeletonBox width="40%" height={16} style={{ marginTop: 20, marginBottom: 12 }} />
      {[1, 2, 3].map(i => <SkeletonEventRow key={i} />)}
    </View>
  );
}

// Skeleton complet pour les Tasks
export function TasksSkeleton() {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      {/* Filtres */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {[1, 2, 3].map(i => (
          <SkeletonBox key={i} width={80} height={32} borderRadius={16} />
        ))}
      </View>
      {/* Tâches */}
      {[1, 2, 3, 4, 5].map(i => <SkeletonTaskRow key={i} />)}
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 8,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 8,
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
