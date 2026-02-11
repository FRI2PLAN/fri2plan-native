import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, TextInput, RefreshControl, ActivityIndicator, useColorScheme, Modal, Switch, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { trpc } from '../lib/trpc';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import DateTimePicker from '@react-native-community/datetimepicker';

interface TasksScreenProps {
  onNavigate?: (screen: string) => void;
  onPrevious?: () => void;
  onNext?: () => void;
}

type Priority = 'urgent' | 'high' | 'medium' | 'low';
type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export default function TasksScreen({ onNavigate, onPrevious, onNext }: TasksScreenProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const styles = getStyles(isDark);

  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'my-tasks'>('all');
  const [favoriteFilter, setFavoriteFilter] = useState<'all' | 'active' | 'completed' | 'my-tasks'>('all');
  const [longPressProgress, setLongPressProgress] = useState(0);
  const [longPressTarget, setLongPressTarget] = useState<'all' | 'active' | 'completed' | 'my-tasks' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Create task modal state
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: undefined as number | undefined,
    dueDate: undefined as Date | undefined,
    recurrence: 'none' as Recurrence,
    points: 10,
    priority: 'medium' as Priority,
    isPrivate: false,
  });

  // Detail and Edit modals
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    assignedTo: undefined as number | undefined,
    dueDate: undefined as Date | undefined,
    recurrence: 'none' as Recurrence,
    points: 10,
    priority: 'medium' as Priority,
    isPrivate: false,
  });

  // Picker modals
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showAssignPicker, setShowAssignPicker] = useState(false);
  const [showRecurrencePicker, setShowRecurrencePicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);

  // Fetch tasks from API
  const { data: tasks, isLoading, refetch } = trpc.tasks.list.useQuery();

  // Fetch family members for assignment
  const { data: members } = trpc.family.members.useQuery(
    { familyId: 1 }, // TODO: Get actual familyId from context
    { enabled: createModalVisible }
  );

  // Mutation to complete a task
  const completeMutation = trpc.tasks.complete.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  // Mutation to update a task
  const updateMutation = trpc.tasks.update.useMutation({  
    onSuccess: () => {
      Alert.alert('Succès', 'Tâche modifiée avec succès');
      setEditModalVisible(false);
      setDetailModalVisible(false);
      refetch();
    },
    onError: (error) => {
      Alert.alert('Erreur', error.message || 'Impossible de modifier la tâche');
    },
  });

  // Mutation to delete a task
  const deleteMutation = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      Alert.alert('Succès', 'Tâche supprimée');
      setDetailModalVisible(false);
      refetch();
    },
    onError: (error) => {
      Alert.alert('Erreur', error.message || 'Impossible de supprimer la tâche');
    },
  });

  // Mutation to create a task
  const createMutation = trpc.tasks.create.useMutation({
    onSuccess: () => {
      Alert.alert('Succès', 'Tâche créée avec succès');
      setCreateModalVisible(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      Alert.alert('Erreur', error.message || 'Impossible de créer la tâche');
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const toggleTask = (id: number) => {
    completeMutation.mutate({ id });
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      assignedTo: undefined,
      dueDate: undefined,
      recurrence: 'none',
      points: 10,
      priority: 'medium',
      isPrivate: false,
    });
  };

  const handleCreateTask = () => {
    if (!formData.title.trim()) {
      Alert.alert('Erreur', 'Le titre est requis');
      return;
    }

    createMutation.mutate({
      title: formData.title,
      description: formData.description || undefined,
      assignedTo: formData.assignedTo,
      dueDate: formData.dueDate,
      recurrence: formData.recurrence,
      points: formData.points,
      priority: formData.priority,
      isPrivate: formData.isPrivate ? 1 : 0,
    });
  };

  const handleUpdateTask = () => {
    if (!selectedTask) return;
    if (!editFormData.title.trim()) {
      Alert.alert('Erreur', 'Le titre est requis');
      return;
    }

    updateMutation.mutate({
      taskId: selectedTask.id,
      title: editFormData.title,
      description: editFormData.description || undefined,
      assignedTo: editFormData.assignedTo,
      dueDate: editFormData.dueDate,
      points: editFormData.points,
      priority: editFormData.priority,
      isPrivate: editFormData.isPrivate ? 1 : 0,
    });
  };

  const handleDeleteTask = () => {
    if (!selectedTask) return;
    
    Alert.alert(
      'Confirmation',
      'Êtes-vous sûr de vouloir supprimer cette tâche ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: () => deleteMutation.mutate({ taskId: selectedTask.id })
        }
      ]
    );
  };

  const handleTaskClick = (task: any) => {
    setSelectedTask(task);
    setDetailModalVisible(true);
  };

  const handleEditClick = () => {
    if (!selectedTask) return;
    setEditFormData({
      title: selectedTask.title,
      description: selectedTask.description || '',
      assignedTo: selectedTask.assignedTo,
      dueDate: selectedTask.dueDate ? new Date(selectedTask.dueDate) : undefined,
      recurrence: 'none',
      points: selectedTask.points || 10,
      priority: selectedTask.priority || 'medium',
      isPrivate: selectedTask.isPrivate === 1,
    });
    setDetailModalVisible(false);
    setEditModalVisible(true);
  };

  const filteredTasks = (tasks || []).filter(task => {
    if (filter === 'active') return task.status !== 'completed';
    if (filter === 'completed') return task.status === 'completed';
    if (filter === 'my-tasks') {
      // TODO: Get current user ID from context
      // For now, show tasks assigned to user ID 1
      return task.assignedTo === 1;
    }
    return true;
  }).filter(task => 
    task.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#dc2626';
      case 'high': return '#f59e0b';
      case 'medium': return '#fbbf24';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'Urgent';
      case 'high': return 'Haute';
      case 'medium': return 'Moyenne';
      case 'low': return 'Faible';
      default: return '';
    }
  };

  const getPriorityEmoji = (priority: Priority) => {
    switch (priority) {
      case 'urgent': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
    }
  };

  const getRecurrenceLabel = (recurrence: Recurrence) => {
    switch (recurrence) {
      case 'none': return '🚫 Aucune';
      case 'daily': return '📅 Quotidienne';
      case 'weekly': return '📆 Hebdomadaire';
      case 'monthly': return '🗓️ Mensuelle';
      case 'yearly': return '🎉 Annuelle';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'À faire';
      case 'in_progress': return 'En cours';
      case 'completed': return 'Terminée';
      default: return status;
    }
  };

  const getMemberName = (memberId: number | undefined) => {
    if (!memberId) return 'Choisir un membre';
    const member = members?.find(m => m.id === memberId);
    return member?.name || `Membre ${memberId}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      {/* Page Title */}
      <View style={styles.pageTitleContainer}>
        <Text style={styles.pageTitle}>Tâches</Text>
      </View>

      {/* New Task Button */}
      <View style={styles.newTaskButtonContainer}>
        <TouchableOpacity 
          style={styles.newTaskButton}
          onPress={() => setCreateModalVisible(true)}
        >
          <Text style={styles.newTaskButtonText}>+ Nouvelle tâche</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une tâche..."
          placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollContainer}>
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
            onPress={() => setFilter('all')}
            onLongPress={() => {
              setFavoriteFilter('all');
              Alert.alert('Favori', 'Vue "Toutes" définie comme favorite !');
            }}
            delayLongPress={500}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              {favoriteFilter === 'all' && '⭐ '}Toutes ({tasks?.length || 0})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'active' && styles.filterTabActive]}
            onPress={() => setFilter('active')}
            onLongPress={() => {
              setFavoriteFilter('active');
              Alert.alert('Favori', 'Vue "En cours" définie comme favorite !');
            }}
            delayLongPress={500}
          >
            <Text style={[styles.filterText, filter === 'active' && styles.filterTextActive]}>
              {favoriteFilter === 'active' && '⭐ '}En cours ({tasks?.filter(t => t.status !== 'completed').length || 0})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'completed' && styles.filterTabActive]}
            onPress={() => setFilter('completed')}
            onLongPress={() => {
              setFavoriteFilter('completed');
              Alert.alert('Favori', 'Vue "Terminées" définie comme favorite !');
            }}
            delayLongPress={500}
          >
            <Text style={[styles.filterText, filter === 'completed' && styles.filterTextActive]}>
              {favoriteFilter === 'completed' && '⭐ '}Terminées ({tasks?.filter(t => t.status === 'completed').length || 0})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'my-tasks' && styles.filterTabActive]}
            onPress={() => setFilter('my-tasks')}
            onLongPress={() => {
              setFavoriteFilter('my-tasks');
              Alert.alert('Favori', 'Vue "Mes tâches" définie comme favorite !');
            }}
            delayLongPress={500}
          >
            <Text style={[styles.filterText, filter === 'my-tasks' && styles.filterTextActive]}>
              {favoriteFilter === 'my-tasks' && '⭐ '}Mes tâches
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Tasks List */}
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7c3aed']} />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#7c3aed" />
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        ) : filteredTasks.length > 0 ? (
          filteredTasks.map(task => (
            <TouchableOpacity 
              key={task.id} 
              style={styles.taskCard}
              onPress={() => handleTaskClick(task)}
              activeOpacity={0.7}
            >
              <TouchableOpacity 
                style={styles.taskCheckbox}
                onPress={() => toggleTask(task.id)}
              >
                <View style={[
                  styles.checkbox,
                  task.status === 'completed' && styles.checkboxChecked
                ]}>
                  {task.status === 'completed' && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </TouchableOpacity>

              <View style={styles.taskContent}>
                <Text style={[
                  styles.taskTitle,
                  task.status === 'completed' && styles.taskTitleCompleted
                ]}>
                  {task.title}
                </Text>
                
                {task.description && (
                  <Text style={styles.taskDescription}>{task.description}</Text>
                )}

                <View style={styles.taskMeta}>
                  <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(task.priority) }]}>
                    <Text style={styles.priorityText}>{getPriorityLabel(task.priority)}</Text>
                  </View>

                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{getStatusLabel(task.status)}</Text>
                  </View>

                  {task.dueDate && (
                    <Text style={styles.dueDateText}>
                      📅 {format(new Date(task.dueDate), 'dd MMM', { locale: fr })}
                    </Text>
                  )}
                </View>

                {task.points && task.points > 0 && (
                  <View style={styles.pointsBadge}>
                    <Text style={styles.pointsText}>⭐ {task.points} points</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'Aucune tâche trouvée' : 'Aucune tâche pour le moment'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Create Task Modal */}
      <Modal
        visible={createModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouvelle tâche</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Title */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Titre *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Titre de la tâche"
                  placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                  value={formData.title}
                  onChangeText={(text) => setFormData({ ...formData, title: text })}
                />
              </View>

              {/* Description */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Description..."
                  placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Assign To */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Assigner à</Text>
                <TouchableOpacity 
                  style={styles.pickerButton}
                  onPress={() => setShowAssignPicker(true)}
                >
                  <Text style={styles.pickerButtonText}>
                    {getMemberName(formData.assignedTo)}
                  </Text>
                  <Text style={styles.pickerArrow}>▼</Text>
                </TouchableOpacity>
              </View>

              {/* Due Date */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Date d'échéance</Text>
                <TouchableOpacity 
                  style={styles.pickerButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.pickerButtonText}>
                    {formData.dueDate 
                      ? format(formData.dueDate, 'dd/MM/yyyy HH:mm', { locale: fr })
                      : 'Choisir une date'}
                  </Text>
                  <Text style={styles.pickerArrow}>📅</Text>
                </TouchableOpacity>
              </View>

              {/* Recurrence */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Récurrence</Text>
                <TouchableOpacity 
                  style={styles.pickerButton}
                  onPress={() => setShowRecurrencePicker(true)}
                >
                  <Text style={styles.pickerButtonText}>
                    {getRecurrenceLabel(formData.recurrence)}
                  </Text>
                  <Text style={styles.pickerArrow}>▼</Text>
                </TouchableOpacity>
              </View>

              {/* Points */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Points</Text>
                <TextInput
                  style={styles.input}
                  placeholder="10"
                  placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                  value={formData.points.toString()}
                  onChangeText={(text) => setFormData({ ...formData, points: parseInt(text) || 0 })}
                  keyboardType="numeric"
                />
              </View>

              {/* Priority */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Priorité</Text>
                <TouchableOpacity 
                  style={styles.pickerButton}
                  onPress={() => setShowPriorityPicker(true)}
                >
                  <Text style={styles.pickerButtonText}>
                    {getPriorityEmoji(formData.priority)} {getPriorityLabel(formData.priority)}
                  </Text>
                  <Text style={styles.pickerArrow}>▼</Text>
                </TouchableOpacity>
              </View>

              {/* Private */}
              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Privé (visible uniquement par moi)</Text>
                  <Switch
                    value={formData.isPrivate}
                    onValueChange={(value) => setFormData({ ...formData, isPrivate: value })}
                    trackColor={{ false: '#d1d5db', true: '#7c3aed' }}
                    thumbColor={formData.isPrivate ? '#fff' : '#f3f4f6'}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setCreateModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.createButton}
                onPress={handleCreateTask}
                disabled={createMutation.isPending}
              >
                <Text style={styles.createButtonText}>
                  {createMutation.isPending ? 'Création...' : 'Créer'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={formData.dueDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              setFormData({ ...formData, dueDate: selectedDate });
              setShowTimePicker(true);
            }
          }}
        />
      )}

      {/* Time Picker */}
      {showTimePicker && (
        <DateTimePicker
          value={formData.dueDate || new Date()}
          mode="time"
          display="default"
          onChange={(event, selectedDate) => {
            setShowTimePicker(false);
            if (selectedDate) {
              setFormData({ ...formData, dueDate: selectedDate });
            }
          }}
        />
      )}

      {/* Assign Picker Modal */}
      <Modal
        visible={showAssignPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAssignPicker(false)}
      >
        <View style={styles.pickerModalOverlay}>
          <View style={styles.pickerModalContent}>
            <Text style={styles.pickerModalTitle}>Assigner à</Text>
            <ScrollView>
              <TouchableOpacity 
                style={styles.pickerOption}
                onPress={() => {
                  setFormData({ ...formData, assignedTo: undefined });
                  setShowAssignPicker(false);
                }}
              >
                <Text style={styles.pickerOptionText}>Aucun</Text>
              </TouchableOpacity>
              {members?.filter(m => m.status === 'active').map(member => (
                <TouchableOpacity 
                  key={member.id}
                  style={styles.pickerOption}
                  onPress={() => {
                    setFormData({ ...formData, assignedTo: member.id });
                    setShowAssignPicker(false);
                  }}
                >
                  <Text style={styles.pickerOptionText}>{member.name || `Membre ${member.id}`}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity 
              style={styles.pickerCloseButton}
              onPress={() => setShowAssignPicker(false)}
            >
              <Text style={styles.pickerCloseButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Recurrence Picker Modal */}
      <Modal
        visible={showRecurrencePicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRecurrencePicker(false)}
      >
        <View style={styles.pickerModalOverlay}>
          <View style={styles.pickerModalContent}>
            <Text style={styles.pickerModalTitle}>Récurrence</Text>
            {(['none', 'daily', 'weekly', 'monthly', 'yearly'] as Recurrence[]).map(rec => (
              <TouchableOpacity 
                key={rec}
                style={styles.pickerOption}
                onPress={() => {
                  setFormData({ ...formData, recurrence: rec });
                  setShowRecurrencePicker(false);
                }}
              >
                <Text style={styles.pickerOptionText}>{getRecurrenceLabel(rec)}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity 
              style={styles.pickerCloseButton}
              onPress={() => setShowRecurrencePicker(false)}
            >
              <Text style={styles.pickerCloseButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Priority Picker Modal */}
      <Modal
        visible={showPriorityPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPriorityPicker(false)}
      >
        <View style={styles.pickerModalOverlay}>
          <View style={styles.pickerModalContent}>
            <Text style={styles.pickerModalTitle}>Priorité</Text>
            {(['urgent', 'high', 'medium', 'low'] as Priority[]).map(pri => (
              <TouchableOpacity 
                key={pri}
                style={styles.pickerOption}
                onPress={() => {
                  setFormData({ ...formData, priority: pri });
                  setShowPriorityPicker(false);
                }}
              >
                <Text style={styles.pickerOptionText}>
                  {getPriorityEmoji(pri)} {getPriorityLabel(pri)}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity 
              style={styles.pickerCloseButton}
              onPress={() => setShowPriorityPicker(false)}
            >
              <Text style={styles.pickerCloseButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Detail Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Détails de la tâche</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedTask && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Titre</Text>
                  <Text style={styles.detailText}>{selectedTask.title}</Text>
                </View>

                {selectedTask.description && (
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Description</Text>
                    <Text style={styles.detailText}>{selectedTask.description}</Text>
                  </View>
                )}

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Statut</Text>
                  <Text style={styles.detailText}>{getStatusLabel(selectedTask.status)}</Text>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Priorité</Text>
                  <Text style={styles.detailText}>
                    {getPriorityEmoji(selectedTask.priority)} {getPriorityLabel(selectedTask.priority)}
                  </Text>
                </View>

                {selectedTask.dueDate && (
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Échéance</Text>
                    <Text style={styles.detailText}>
                      {format(new Date(selectedTask.dueDate), 'dd/MM/yyyy HH:mm', { locale: fr })}
                    </Text>
                  </View>
                )}

                {selectedTask.points > 0 && (
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Points</Text>
                    <Text style={styles.detailText}>⭐ {selectedTask.points} points</Text>
                  </View>
                )}

                {selectedTask.isPrivate === 1 && (
                  <View style={styles.formGroup}>
                    <Text style={styles.detailText}>🔒 Privé</Text>
                  </View>
                )}
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.cancelButton, { flex: 0.4 }]}
                onPress={handleDeleteTask}
              >
                <Text style={[styles.cancelButtonText, { color: '#ef4444' }]}>Supprimer</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.createButton}
                onPress={handleEditClick}
              >
                <Text style={styles.createButtonText}>Modifier</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Modal - Same as Create Modal but with editFormData */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modifier la tâche</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Title */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Titre *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Titre de la tâche"
                  placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                  value={editFormData.title}
                  onChangeText={(text) => setEditFormData({ ...editFormData, title: text })}
                />
              </View>

              {/* Description */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Description..."
                  placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                  value={editFormData.description}
                  onChangeText={(text) => setEditFormData({ ...editFormData, description: text })}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Points */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Points</Text>
                <TextInput
                  style={styles.input}
                  placeholder="10"
                  placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                  value={editFormData.points.toString()}
                  onChangeText={(text) => setEditFormData({ ...editFormData, points: parseInt(text) || 0 })}
                  keyboardType="numeric"
                />
              </View>

              {/* Priority */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Priorité</Text>
                <TouchableOpacity 
                  style={styles.pickerButton}
                  onPress={() => setShowPriorityPicker(true)}
                >
                  <Text style={styles.pickerButtonText}>
                    {getPriorityEmoji(editFormData.priority)} {getPriorityLabel(editFormData.priority)}
                  </Text>
                  <Text style={styles.pickerArrow}>▼</Text>
                </TouchableOpacity>
              </View>

              {/* Private */}
              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Privé (visible uniquement par moi)</Text>
                  <Switch
                    value={editFormData.isPrivate}
                    onValueChange={(value) => setEditFormData({ ...editFormData, isPrivate: value })}
                    trackColor={{ false: '#d1d5db', true: '#7c3aed' }}
                    thumbColor={editFormData.isPrivate ? '#fff' : '#f3f4f6'}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.createButton}
                onPress={handleUpdateTask}
                disabled={updateMutation.isPending}
              >
                <Text style={styles.createButtonText}>
                  {updateMutation.isPending ? 'Modification...' : 'Enregistrer'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Fonction pour générer les styles dynamiques basés sur le thème
function getStyles(isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#000000' : '#f9fafb',
    },
    pageTitleContainer: {
      backgroundColor: isDark ? '#1f2937' : '#fff',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#374151' : '#e5e7eb',
    },
    pageTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: isDark ? '#f5f5dc' : '#1f2937',
      textAlign: 'center',
    },
    newTaskButtonContainer: {
      padding: 16,
      backgroundColor: isDark ? '#1f2937' : '#fff',
      alignItems: 'center',
    },
    newTaskButton: {
      backgroundColor: '#7c3aed',
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
    },
    newTaskButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    searchContainer: {
      padding: 16,
      backgroundColor: isDark ? '#1f2937' : '#fff',
    },
    searchInput: {
      backgroundColor: isDark ? '#374151' : '#f3f4f6',
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: isDark ? '#f5f5dc' : '#1f2937',
    },
    filterScrollContainer: {
      backgroundColor: isDark ? '#1f2937' : '#fff',
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#374151' : '#e5e7eb',
    },
    filterContainer: {
      flexDirection: 'row',
      padding: 16,
      gap: 8,
    },
    filterTab: {
      minWidth: 120,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: isDark ? '#374151' : '#f3f4f6',
      alignItems: 'center',
    },
    filterTabActive: {
      backgroundColor: '#7c3aed',
    },
    filterText: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#9ca3af' : '#6b7280',
    },
    filterTextActive: {
      color: '#fff',
    },
    content: {
      flex: 1,
      padding: 16,
    },
    loadingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 16,
      color: isDark ? '#9ca3af' : '#6b7280',
    },
    taskCard: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#1f2937' : '#fff',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? '#374151' : 'transparent',
    },
    taskCheckbox: {
      marginRight: 12,
      paddingTop: 2,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: isDark ? '#6b7280' : '#d1d5db',
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxChecked: {
      backgroundColor: '#10b981',
      borderColor: '#10b981',
    },
    checkmark: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    taskContent: {
      flex: 1,
    },
    taskTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#f5f5dc' : '#1f2937',
      marginBottom: 4,
    },
    taskTitleCompleted: {
      textDecorationLine: 'line-through',
      color: '#9ca3af',
    },
    taskDescription: {
      fontSize: 14,
      color: isDark ? '#d1d5db' : '#6b7280',
      marginBottom: 8,
    },
    taskMeta: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      alignItems: 'center',
    },
    priorityBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    priorityText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
    },
    statusBadge: {
      backgroundColor: isDark ? '#374151' : '#e5e7eb',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    statusText: {
      color: isDark ? '#f5f5dc' : '#1f2937',
      fontSize: 12,
      fontWeight: '600',
    },
    dueDateText: {
      fontSize: 12,
      color: isDark ? '#9ca3af' : '#6b7280',
    },
    pointsBadge: {
      marginTop: 8,
      backgroundColor: isDark ? '#92400e' : '#fef3c7',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      alignSelf: 'flex-start',
    },
    pointsText: {
      color: isDark ? '#fbbf24' : '#92400e',
      fontSize: 12,
      fontWeight: '600',
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyStateText: {
      fontSize: 16,
      color: '#9ca3af',
    },

    // Modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: isDark ? '#1f2937' : '#fff',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '90%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#374151' : '#e5e7eb',
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: isDark ? '#f5f5dc' : '#1f2937',
    },
    modalClose: {
      fontSize: 24,
      color: isDark ? '#9ca3af' : '#6b7280',
    },
    modalBody: {
      padding: 20,
    },
    formGroup: {
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#f5f5dc' : '#1f2937',
      marginBottom: 8,
    },
    detailText: {
      fontSize: 16,
      color: isDark ? '#f5f5dc' : '#1f2937',
      marginBottom: 4,
    },
    input: {
      backgroundColor: isDark ? '#374151' : '#f3f4f6',
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: isDark ? '#f5f5dc' : '#1f2937',
      borderWidth: 1,
      borderColor: isDark ? '#4b5563' : '#e5e7eb',
    },
    textArea: {
      height: 80,
      textAlignVertical: 'top',
    },
    pickerButton: {
      backgroundColor: isDark ? '#374151' : '#f3f4f6',
      borderRadius: 8,
      padding: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isDark ? '#4b5563' : '#e5e7eb',
    },
    pickerButtonText: {
      fontSize: 16,
      color: isDark ? '#f5f5dc' : '#1f2937',
    },
    pickerArrow: {
      fontSize: 12,
      color: isDark ? '#9ca3af' : '#6b7280',
    },
    switchRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    modalFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: isDark ? '#374151' : '#e5e7eb',
      gap: 12,
    },
    cancelButton: {
      flex: 1,
      backgroundColor: isDark ? '#374151' : '#f3f4f6',
      padding: 14,
      borderRadius: 8,
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#f5f5dc' : '#1f2937',
    },
    createButton: {
      flex: 1,
      backgroundColor: '#7c3aed',
      padding: 14,
      borderRadius: 8,
      alignItems: 'center',
    },
    createButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#fff',
    },

    // Picker modal styles
    pickerModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    pickerModalContent: {
      backgroundColor: isDark ? '#1f2937' : '#fff',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '60%',
      padding: 20,
    },
    pickerModalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: isDark ? '#f5f5dc' : '#1f2937',
      marginBottom: 16,
      textAlign: 'center',
    },
    pickerOption: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#374151' : '#e5e7eb',
    },
    pickerOptionText: {
      fontSize: 16,
      color: isDark ? '#f5f5dc' : '#1f2937',
    },
    pickerCloseButton: {
      marginTop: 16,
      backgroundColor: isDark ? '#374151' : '#f3f4f6',
      padding: 14,
      borderRadius: 8,
      alignItems: 'center',
    },
    pickerCloseButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#f5f5dc' : '#1f2937',
    },
  });
}
