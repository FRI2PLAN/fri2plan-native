import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../lib/trpc';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { formatDistanceToNow } from 'date-fns';
import { fr, de, enUS } from 'date-fns/locale';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function NotificationsModal({
  const styles = getStyles(isDark); visible, onClose }: NotificationsModalProps) {
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();

  const { data: notifications = [], isLoading, refetch } = trpc.notifications.list.useQuery(
    undefined,
    { enabled: visible }
  );

  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => refetch(),
  });

  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => refetch(),
  });

  const deleteAllMutation = trpc.notifications.deleteAll.useMutation({
    onSuccess: () => refetch(),
  });

  const handleMarkAsRead = (notificationId: number) => {
    markAsReadMutation.mutate({ notificationId });
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleDeleteAll = () => {
    Alert.alert(
      t('common.confirm'),
      t('notifications.deleteAll') + ' ?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => deleteAllMutation.mutate(),
        },
      ]
    );
  };

  const getLocale = () => {
    switch (i18n.language) {
      case 'fr': return fr;
      case 'de': return de;
      default: return enUS;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task': return 'checkmark-circle';
      case 'event': return 'calendar';
      case 'message': return 'chatbubbles';
      case 'request': return 'document-text';
      case 'budget': return 'cash';
      default: return 'notifications';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'task': return '#10b981';
      case 'event': return '#3b82f6';
      case 'message': return '#8b5cf6';
      case 'request': return '#ec4899';
      case 'budget': return '#14b8a6';
      default: return '#6b7280';
    }
  };

  const bg = isDark ? '#1f2937' : '#ffffff';
  const textPrimary = isDark ? '#f9fafb' : '#1f2937';
  const textSecondary = isDark ? '#9ca3af' : '#6b7280';
  const borderColor = isDark ? '#374151' : '#e5e7eb';
  const unreadBg = isDark ? '#111827' : '#f9fafb';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.dismissArea} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: bg, maxHeight: SCREEN_HEIGHT * 0.88 }]}>
          {/* Poignée */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: borderColor }]}>
            <Text style={[styles.title, { color: textPrimary }]}>
              {t('common.notifications')}
            </Text>
            <View style={styles.headerActions}>
              {notifications.length > 0 && (
                <>
                  <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.actionBtn}>
                    <Ionicons name="checkmark-done" size={20} color="#7c3aed" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleDeleteAll} style={styles.actionBtn}>
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Contenu */}
          {isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#7c3aed" />
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.centered}>
              <Ionicons name="notifications-off-outline" size={56} color={textSecondary} />
              <Text style={[styles.emptyText, { color: textSecondary }]}>
                {t('notifications.noNotifications')}
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.list}
              contentContainerStyle={{ paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
            >
              {notifications.map((notification: any) => (
                <TouchableOpacity
                  key={notification.id}
                  style={[
                    styles.item,
                    { borderBottomColor: borderColor },
                    !notification.isRead && { backgroundColor: unreadBg },
                  ]}
                  onPress={() => handleMarkAsRead(notification.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconCircle, { backgroundColor: getNotificationColor(notification.type) }]}>
                    <Ionicons name={getNotificationIcon(notification.type)} size={18} color="#fff" />
                  </View>
                  <View style={styles.itemContent}>
                    <Text style={[styles.itemTitle, { color: textPrimary }]}>
                      {notification.title}
                    </Text>
                    <Text style={[styles.itemMessage, { color: textSecondary }]}>
                      {notification.message}
                    </Text>
                    <Text style={[styles.itemTime, { color: isDark ? '#6b7280' : '#9ca3af' }]}>
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                        locale: getLocale(),
                      })}
                    </Text>
                  </View>
                  {!notification.isRead && <View style={styles.unreadDot} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function getStyles(isDark: boolean) { return StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    width: '100%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d1d5db',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtn: {
    padding: 8,
  },
  closeBtn: {
    padding: 6,
    marginLeft: 4,
  },
  centered: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    marginTop: 14,
  },
  list: {
    flex: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  itemMessage: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  itemTime: {
    fontSize: 11,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    marginLeft: 8,
    marginTop: 6,
    flexShrink: 0,
  },
}); }
