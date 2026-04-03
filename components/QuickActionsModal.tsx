import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

interface QuickActionsModalProps {
  visible: boolean;
  onClose: () => void;
  onNavigate?: (pageIndex: number) => void;
}

interface QuickAction {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  pageIndex: number;
  color: string;
}

export default function QuickActionsModal({ visible, onClose, onNavigate }: QuickActionsModalProps) {
  const { t } = useTranslation();

  const quickActions: QuickAction[] = [
    {
      id: 'event',
      icon: 'calendar',
      label: t('quickActions.newEvent', 'Nouvel événement'),
      pageIndex: 1,
      color: '#3b82f6',
    },
    {
      id: 'task',
      icon: 'checkmark-circle',
      label: t('quickActions.newTask', 'Nouvelle tâche'),
      pageIndex: 2,
      color: '#10b981',
    },
    {
      id: 'note',
      icon: 'document-text',
      label: t('quickActions.newNote', 'Nouvelle note'),
      pageIndex: 6,
      color: '#06b6d4',
    },
    {
      id: 'expense',
      icon: 'cash',
      label: t('quickActions.newExpense', 'Nouvelle dépense'),
      pageIndex: 7,
      color: '#f59e0b',
    },
    {
      id: 'request',
      icon: 'help-circle',
      label: t('quickActions.newRequest', 'Nouvelle requête'),
      pageIndex: 5,
      color: '#ec4899',
    },
  ];

  const handleActionPress = (pageIndex: number) => {
    onClose();
    if (onNavigate) {
      onNavigate(pageIndex);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
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
              {/* Handle bar */}
              <View style={styles.handleBar} />

              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {t('quickActions.title', 'Actions rapides')}
                </Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              {/* Actions List — pas de ScrollView, tout visible directement */}
              <View style={styles.actionsContainer}>
                {quickActions.map((action) => (
                  <TouchableOpacity
                    key={action.id}
                    style={styles.actionRow}
                    onPress={() => handleActionPress(action.pageIndex)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.actionIconContainer,
                        { backgroundColor: action.color },
                      ]}
                    >
                      <Ionicons name={action.icon} size={22} color="#fff" />
                    </View>
                    <Text style={styles.actionLabel}>{action.label}</Text>
                    <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
                  </TouchableOpacity>
                ))}
              </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    width: '100%',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  closeButton: {
    padding: 4,
  },
  actionsContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginVertical: 3,
    backgroundColor: '#f9fafb',
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
});
