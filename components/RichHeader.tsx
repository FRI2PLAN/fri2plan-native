import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { trpc } from '../lib/trpc';

interface RichHeaderProps {
  onQuickActionsPress?: () => void;
  onNotificationsPress?: () => void;
  onThemeToggle?: () => void;
  onLogout?: () => void;
  isDarkMode?: boolean;
  onNavigateHome?: () => void;
}

export default function RichHeader({
  onQuickActionsPress,
  onNotificationsPress,
  onThemeToggle,
  onLogout,
  isDarkMode = true,
  onNavigateHome,
}: RichHeaderProps) {
  const navigation = useNavigation();

  // Récupérer les données utilisateur
  const { data: user } = trpc.auth.me.useQuery();

  // Récupérer le nombre de notifications non lues
  const { data: unreadCount = 0 } = trpc.notifications.getUnreadCount.useQuery();

  // Récupérer les points de la famille pour le classement
  const { data: families } = trpc.family.list.useQuery();
  const activeFamily = families?.[0];
  const activeFamilyName: string | null = activeFamily?.name || null;
  const { data: familyPoints = [] } = trpc.rewards.familyPoints.useQuery(
    { familyId: activeFamily?.id || 0 },
    { enabled: !!activeFamily }
  );

  // Calculer points et classement de l'utilisateur
  const { currentUserPoints, currentUserRank, totalMembers } = useMemo(() => {
    if (!user || !familyPoints.length) return { currentUserPoints: 0, currentUserRank: 0, totalMembers: 0 };
    const sorted = [...familyPoints].sort((a: any, b: any) => (b.totalPoints || 0) - (a.totalPoints || 0));
    const rank = sorted.findIndex((m: any) => m.userId === user.id) + 1;
    const myPoints = sorted.find((m: any) => m.userId === user.id)?.totalPoints || 0;
    return { currentUserPoints: myPoints, currentUserRank: rank, totalMembers: sorted.length };
  }, [user, familyPoints]);

  // Calcul progression vers prochain palier
  const progressPercent = useMemo(() => {
    const milestones = [0, 50, 100, 200, 500, 1000, 2000, 5000];
    const idx = milestones.findIndex(m => currentUserPoints < m);
    if (idx <= 0) return 100;
    const prev = milestones[idx - 1];
    const next = milestones[idx];
    return Math.min(((currentUserPoints - prev) / (next - prev)) * 100, 100);
  }, [currentUserPoints]);

  // Rendu de l'avatar selon le type (upload, emoji, icon, initials)
  const renderAvatar = () => {
    const avatarType = (user as any)?.avatarType;
    const avatarValue = (user as any)?.avatarValue;
    const avatarUrl = (user as any)?.avatarUrl;
    const userColor = (user as any)?.userColor || '#ec4899';

    if (avatarType === 'upload' && avatarUrl) {
      return <Image source={{ uri: avatarUrl }} style={styles.avatar} />;
    }
    if ((avatarType === 'emoji' || avatarType === 'icon') && avatarValue) {
      return (
        <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: userColor }]}>
          <Text style={styles.avatarEmoji}>{avatarValue}</Text>
        </View>
      );
    }
    // initials or fallback
    const initials = user?.name?.charAt(0).toUpperCase() || '?';
    return (
      <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: userColor }]}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
    );
  };

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {/* Left: Avatar + Name + Points - Clickable to go Home */}
        <TouchableOpacity
          style={styles.leftSection}
          onPress={onNavigateHome}
          activeOpacity={0.7}
        >
          {renderAvatar()}
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.name || 'Utilisateur'}
            </Text>
            {totalMembers > 0 && (
              <View style={styles.pointsRow}>
                <Text style={styles.pointsText}>🏆 {currentUserPoints} pts</Text>
                <Text style={styles.rankText}>{currentUserRank}/{totalMembers}</Text>
              </View>
            )}
            {totalMembers > 0 && (
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progressPercent}%` as any }]} />
              </View>
            )}
            {activeFamilyName && (
              <Text style={styles.familyNameText} numberOfLines={1}>👨‍👩‍👧 {activeFamilyName}</Text>
            )}
          </View>
        </TouchableOpacity>

        {/* Right: Actions */}
        <View style={styles.rightSection}>
          {/* Quick Actions - Icon only */}
          <TouchableOpacity
            onPress={onQuickActionsPress}
            style={styles.iconButton}
          >
            <Ionicons name="add" size={26} color="#fff" />
          </TouchableOpacity>

          {/* Notifications with badge */}
          <TouchableOpacity
            onPress={onNotificationsPress}
            style={styles.iconButton}
          >
            <Ionicons name="notifications" size={22} color="#fff" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Theme toggle */}
          <TouchableOpacity onPress={onThemeToggle} style={styles.iconButton}>
            <Ionicons
              name={isDarkMode ? 'sunny' : 'moon'}
              size={22}
              color="#fff"
            />
          </TouchableOpacity>

          {/* Logout */}
          <TouchableOpacity onPress={onLogout} style={styles.iconButton}>
            <Ionicons name="log-out" size={22} color="#fff" />
          </TouchableOpacity>

          {/* Hamburger Menu */}
          <TouchableOpacity onPress={openDrawer} style={styles.menuButton}>
            <Ionicons name="menu" size={26} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#7c3aed', // Violet
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  avatarEmoji: {
    fontSize: 18,
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 1,
  },
  pointsText: {
    color: '#fde68a',
    fontSize: 10,
    fontWeight: 'bold',
  },
  rankText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    opacity: 0.9,
  },
  progressBar: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    marginTop: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 3,
    backgroundColor: '#fbbf24',
    borderRadius: 2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    padding: 6,
    position: 'relative',
  },
  menuButton: {
    padding: 6,
    marginLeft: 4,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  familyNameText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 9,
    marginTop: 2,
  },
});
