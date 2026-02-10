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

  // Only 5 options like WebView
  const quickActions: QuickAction[] = [
    {
      id: 'event',
      icon: 'calendar',
      label: 'Nouvel événement',
      screen: 'Calendar',
      color: '#3b82f6', // Bleu
    },
    {
      id: 'task',
      icon: 'checkmark-circle',
      label: 'Nouvelle tâche',
      screen: 'Tasks',
      color: '#10b981', // Vert
    },
    {
      id: 'note',
      icon: 'document',
      label: 'Nouvelle note',
      screen: 'Notes',
      color: '#06b6d4', // Cyan
    },
    {
      id: 'expense',
      icon: 'cash',
      label: 'Nouvelle dépense',
      screen: 'Budget',
      color: '#f59e0b', // Orange
    },
    {
      id: 'request',
      icon: 'help-circle',
      label: 'Nouvelle requête',
      screen: 'Requests',
      color: '#ec4899', // Rose
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
                     <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Actions List (vertical) */}
              <ScrollView style={styles.actionsContainer}>
                {quickActions.map((action) => (
                  <TouchableOpacity
                    key={action.id}
                    style={styles.actionRow}
                    onPress={() => handleActionPress(action.screen)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.actionIconContainer,
                        { backgroundColor: action.color },
                      ]}
                    >
                      <Ionicons
                        name={action.icon}
                        size={24}
                        color="#fff"
                      />
                    </View>
                    <Text style={styles.actionLabel}>{action.label}</Text>
                  </TouchableOpacity>
                ))}
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
    padding: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#f9fafb',
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
});
