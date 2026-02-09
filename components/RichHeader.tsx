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
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();

  // Récupérer les données utilisateur
  const { data: user } = trpc.user.me.useQuery();

  // Récupérer le nombre de notifications non lues
  const { data: unreadCount = 0 } = trpc.notifications.getUnreadCount.useQuery();

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  return (
    <View style={styles.container}>
      {/* Ligne 1 : Avatar + Nom + Menu Hamburger */}
      <View style={styles.topRow}>
        {/* Avatar + Nom */}
        <View style={styles.userInfo}>
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
            {user?.name || t('common.loading')}
          </Text>
        </View>

        {/* Menu Hamburger */}
        <TouchableOpacity onPress={openDrawer} style={styles.iconButton}>
          <Ionicons name="menu" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Ligne 2 : Actions rapides + Notifications + Mode sombre + Déconnexion */}
      <View style={styles.bottomRow}>
        {/* Actions rapides */}
        <TouchableOpacity
          onPress={onQuickActionsPress}
          style={styles.actionButton}
        >
          <Ionicons name="flash" size={20} color="#fff" />
          <Text style={styles.actionText}>{t('dashboard.quickActions')}</Text>
        </TouchableOpacity>

        {/* Notifications avec badge */}
        <TouchableOpacity
          onPress={onNotificationsPress}
          style={styles.iconButton}
        >
          <Ionicons name="notifications" size={24} color="#fff" />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Toggle mode sombre */}
        <TouchableOpacity onPress={onThemeToggle} style={styles.iconButton}>
          <Ionicons
            name={isDarkMode ? 'sunny' : 'moon'}
            size={24}
            color="#fff"
          />
        </TouchableOpacity>

        {/* Déconnexion */}
        <TouchableOpacity onPress={onLogout} style={styles.iconButton}>
          <Ionicons name="log-out" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#7c3aed', // Violet comme l'app
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: '#ec4899', // Rose/magenta
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  iconButton: {
    padding: 8,
    position: 'relative',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flex: 1,
    marginRight: 12,
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ef4444', // Rouge pour les notifications
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
