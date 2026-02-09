import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

interface QuickActionsModalProps {
  visible: boolean;
  onClose: () => void;
}

interface QuickAction {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  screen: string;
  color: string;
}

export default function QuickActionsModal({ visible, onClose }: QuickActionsModalProps) {
  const navigation = useNavigation();
  const { t } = useTranslation();

  const quickActions: QuickAction[] = [
    {
      id: 'calendar',
      icon: 'calendar',
      label: t('navigation.calendar'),
      screen: 'Calendar',
      color: '#3b82f6', // Bleu
    },
    {
      id: 'tasks',
      icon: 'checkmark-circle',
      label: t('navigation.tasks'),
      screen: 'Tasks',
      color: '#10b981', // Vert
    },
    {
      id: 'shopping',
      icon: 'cart',
      label: t('navigation.shopping'),
      screen: 'Shopping',
      color: '#f59e0b', // Orange
    },
    {
      id: 'messages',
      icon: 'chatbubbles',
      label: t('navigation.messages'),
      screen: 'Messages',
      color: '#8b5cf6', // Violet
    },
    {
      id: 'requests',
      icon: 'document-text',
      label: t('navigation.requests'),
      screen: 'Requests',
      color: '#ec4899', // Rose
    },
    {
      id: 'notes',
      icon: 'document',
      label: t('navigation.notes'),
      screen: 'Notes',
      color: '#06b6d4', // Cyan
    },
    {
      id: 'budget',
      icon: 'cash',
      label: t('navigation.budget'),
      screen: 'Budget',
      color: '#14b8a6', // Teal
    },
    {
      id: 'rewards',
      icon: 'gift',
      label: t('navigation.rewards'),
      screen: 'Rewards',
      color: '#f43f5e', // Rouge
    },
  ];

  const handleActionPress = (screen: string) => {
    onClose();
    navigation.navigate(screen as never);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity activeOpacity={1}>
            <View style={styles.modalContent}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {t('dashboard.quickActions')}
                </Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              {/* Actions Grid */}
              <ScrollView style={styles.actionsContainer}>
                <View style={styles.actionsGrid}>
                  {quickActions.map((action) => (
                    <TouchableOpacity
                      key={action.id}
                      style={styles.actionCard}
                      onPress={() => handleActionPress(action.screen)}
                    >
                      <View
                        style={[
                          styles.actionIconContainer,
                          { backgroundColor: action.color },
                        ]}
                      >
                        <Ionicons
                          name={action.icon}
                          size={28}
                          color="#fff"
                        />
                      </View>
                      <Text style={styles.actionLabel}>{action.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton: {
    padding: 4,
  },
  actionsContainer: {
    padding: 20,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 20,
  },
  actionIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
});
