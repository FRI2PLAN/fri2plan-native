import React from 'react';
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
}

export default function RichHeader({
  onQuickActionsPress,
  onNotificationsPress,
  onThemeToggle,
  onLogout,
  isDarkMode = true,
}: RichHeaderProps) {
  const navigation = useNavigation();

  // Récupérer les données utilisateur
  const { data: user } = trpc.user.me.useQuery();

  // Récupérer le nombre de notifications non lues
  const { data: unreadCount = 0 } = trpc.notifications.getUnreadCount.useQuery();

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {/* Left: Avatar + Name */}
        <View style={styles.leftSection}>
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
          )}
          <Text style={styles.userName} numberOfLines={1}>
            {user?.name || 'Utilisateur'}
          </Text>
        </View>

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
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  avatarPlaceholder: {
    backgroundColor: '#ec4899', // Rose/magenta
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
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
    backgroundColor: '#ef4444', // Rouge
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
});
