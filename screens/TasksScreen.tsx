import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, RefreshControl, Modal, TextInput, Alert, Switch, ActivityIndicator, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../contexts/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { trpc } from '../lib/trpc';
import { useAuth } from '../contexts/AuthContext';
import { format, addDays } from 'date-fns';
import { fr, de, enUS } from 'date-fns/locale';

interface TasksScreenProps {
  onNavigate?: (screen: string) => void;
  onPrevious?: () => void;
  onNext?: () => void;
}

type Priority = 'urgent' | 'high' | 'medium' | 'low';
type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
type TaskStatus = 'todo' | 'inProgress' | 'completed';
type FilterType = 'inProgress' | 'completed' | 'myTasks' | 'favorites';

export default function TasksScreen({ onNavigate, onPrevious, onNext }: TasksScreenProps) {
  const { isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const styles = getStyles(isDark);

  // ── Filtres ──
  const [filter, setFilter] = useState<FilterType>('inProgress');
  const [favoriteFilter, setFavoriteFilter] = useState<FilterType>('inProgress');
  const hasInitialized = useRef(false);

  // ── Sections collapsibles ──
  const [todayExpanded, setTodayExpanded] = useState(true);
  const [upcomingExpanded, setUpcomingExpanded] = useState(false);

  // ── Refresh ──
  const [refreshing, setRefreshing] = useState(false);

  // ── Modaux formulaire ──
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  // ── Pickers ──
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showAssignPicker, setShowAssignPicker] = useState(false);
  const [showRecurrencePicker, setShowRecurrencePicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showPostponePicker, setShowPostponePicker] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'create' | 'edit'>('create');

  // ── Formulaire création ──
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

  // ── Formulaire modification ──
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

  // ── tRPC ──
  const utils = trpc.useUtils();
  const { data: tasks, isLoading, refetch } = trpc.tasks.list.useQuery();
  const { data: members } = trpc.family.members.useQuery(
    { familyId: 1 },
    { enabled: createModalVisible || editModalVisible }
  );

  const createMutation = trpc.tasks.create.useMutation({
    onSuccess: () => {
      setCreateModalVisible(false);
      resetForm();
      utils.tasks.list.invalidate();
    },
    onError: (error) => {
      Alert.alert(t('common.error') || 'Erreur', error.message || 'Impossible de créer la tâche');
    },
  });

  const updateMutation = trpc.tasks.update.useMutation({
    onSuccess: () => {
      setEditModalVisible(false);
      setDetailModalVisible(false);
      utils.tasks.list.invalidate();
    },
    onError: (error) => {
      Alert.alert(t('common.error') || 'Erreur', error.message || 'Impossible de modifier la tâche');
    },
  });

  const deleteMutation = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      setDetailModalVisible(false);
      utils.tasks.list.invalidate();
    },
    onError: (error) => {
      Alert.alert(t('common.error') || 'Erreur', error.message || 'Impossible de supprimer la tâche');
    },
  });

  const completeMutation = trpc.tasks.complete.useMutation({
    onSuccess: (data) => {
      if (data?.points) {
        Alert.alert('🎉', `+${data.points} points !`);
      }
      utils.tasks.list.invalidate();
    },
    onError: (error) => {
      Alert.alert(t('common.error') || 'Erreur', error.message);
    },
  });

  const postponeMutation = trpc.tasks.postpone.useMutation({
    onSuccess: (data) => {
      const newDate = new Date(data.newDueDate);
      const locale = i18n.language === 'de' ? de : i18n.language === 'en' ? enUS : fr;
      const formatted = format(newDate, 'dd MMMM', { locale });
      Alert.alert('⏰', `Tâche reportée au ${formatted}`);
      utils.tasks.list.invalidate();
    },
    onError: (error) => {
      Alert.alert(t('common.error') || 'Erreur', error.message);
    },
  });

  const toggleFavoriteMutation = trpc.tasks.toggleFavorite.useMutation({
    onSuccess: (data) => {
      utils.tasks.list.invalidate();
    },
    onError: (error) => {
      Alert.alert(t('common.error') || 'Erreur', error.message);
    },
  });

  // ── Helpers ──
  const getLocale = () => {
    if (i18n.language === 'de') return de;
    if (i18n.language === 'en') return enUS;
    return fr;
  };

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  const getDueDateStr = (dueDate: string): string => {
    const d = new Date(dueDate.replace(' ', 'T') + 'Z');
    return format(d, 'yyyy-MM-dd');
  };

  const sortByDueDate = (a: any, b: any) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate.replace(' ', 'T') + 'Z').getTime() - new Date(b.dueDate.replace(' ', 'T') + 'Z').getTime();
  };

  // ── Listes filtrées ──
  const filteredTasks = (tasks || []).filter(t => {
    if (filter === 'favorites') return t.isFavorite === 1 && t.status !== 'completed';
    if (t.status !== 'completed' && t.dueDate && getDueDateStr(t.dueDate) >= todayStr) return false;
    if (filter === 'myTasks') return t.assignedTo === user?.id;
    return t.status === filter;
  });

  const groupedTasks = {
    inProgress: tasks?.filter(t => t.status === 'inProgress') || [],
    completed: tasks?.filter(t => t.status === 'completed') || [],
  };

  const todayTasks = (tasks?.filter(t => {
    if (t.status === 'completed') return false;
    if (!t.dueDate) return false;
    return getDueDateStr(t.dueDate) === todayStr;
  }) || []).sort(sortByDueDate);

  const upcomingRaw = (tasks?.filter(t => {
    if (t.status === 'completed') return false;
    if (!t.dueDate) return false;
    return getDueDateStr(t.dueDate) >= tomorrowStr;
  }) || []).sort(sortByDueDate);

  const upcomingTasks = upcomingRaw.filter((t, _idx, arr) => {
    if (!t.recurrence || t.recurrence === 'none') return true;
    const firstOccurrence = arr.find(other =>
      other.title === t.title && other.recurrence === t.recurrence && other.status !== 'completed'
    );
    return firstOccurrence?.id === t.id;
  });

  // ── Grouper À venir par date ──
  const upcomingGroups: { label: string; dateStr: string; tasks: typeof upcomingTasks }[] = [];
  upcomingTasks.forEach(t => {
    const ds = t.dueDate ? getDueDateStr(t.dueDate) : 'sans-date';
    let label = '';
    if (ds === tomorrowStr) {
      label = `Demain — ${format(addDays(new Date(), 1), 'dd MMMM', { locale: getLocale() })}`;
    } else if (ds === 'sans-date') {
      label = 'Sans échéance';
    } else {
      const d = new Date(t.dueDate!.replace(' ', 'T') + 'Z');
      label = format(d, 'EEEE dd MMMM', { locale: getLocale() });
      label = label.charAt(0).toUpperCase() + label.slice(1);
    }
    const existing = upcomingGroups.find(g => g.dateStr === ds);
    if (existing) existing.tasks.push(t);
    else upcomingGroups.push({ label, dateStr: ds, tasks: [t] });
  });

  // ── Actions ──
  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', assignedTo: undefined, dueDate: undefined, recurrence: 'none', points: 10, priority: 'medium', isPrivate: false });
  };

  const handleCreateTask = () => {
    if (!formData.title.trim()) {
      Alert.alert(t('common.error') || 'Erreur', 'Le titre est requis');
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
      Alert.alert(t('common.error') || 'Erreur', 'Le titre est requis');
      return;
    }
    updateMutation.mutate({
      taskId: selectedTask.id,
      title: editFormData.title,
      description: editFormData.description || undefined,
      assignedTo: editFormData.assignedTo,
      dueDate: editFormData.dueDate,
      recurrence: editFormData.recurrence,
      points: editFormData.points,
      priority: editFormData.priority,
      isPrivate: editFormData.isPrivate ? 1 : 0,
    });
  };

  const handleDeleteTask = () => {
    if (!selectedTask) return;
    Alert.alert(
      t('common.confirm') || 'Confirmation',
      t('tasks.deleteConfirm') || 'Supprimer cette tâche ?',
      [
        { text: t('common.cancel') || 'Annuler', style: 'cancel' },
        { text: t('common.delete') || 'Supprimer', style: 'destructive', onPress: () => deleteMutation.mutate({ taskId: selectedTask.id }) },
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
      dueDate: selectedTask.dueDate ? new Date(selectedTask.dueDate.replace(' ', 'T') + 'Z') : undefined,
      recurrence: selectedTask.recurrence || 'none',
      points: selectedTask.points || 10,
      priority: selectedTask.priority || 'medium',
      isPrivate: selectedTask.isPrivate === 1,
    });
    setDetailModalVisible(false);
    setEditModalVisible(true);
  };

  const handleUpdateStatus = (status: TaskStatus) => {
    if (!selectedTask) return;
    if (status === 'completed') {
      completeMutation.mutate({ taskId: selectedTask.id });
    } else {
      updateMutation.mutate({ taskId: selectedTask.id, status });
    }
    setSelectedTask({ ...selectedTask, status });
  };

  const handleToggleFavorite = (task: any) => {
    toggleFavoriteMutation.mutate({ taskId: task.id });
  };

  // ── Helpers d'affichage ──
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#dc2626';
      case 'high': return '#f97316';
      case 'medium': return '#eab308';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getPriorityEmoji = (priority: string) => {
    switch (priority) {
      case 'urgent': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return t('tasks.urgent') || 'Urgent';
      case 'high': return t('tasks.high') || 'Haute';
      case 'medium': return t('tasks.medium') || 'Moyenne';
      case 'low': return t('tasks.low') || 'Faible';
      default: return '';
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
      case 'todo': return '⭕ À faire';
      case 'inProgress': return '🔵 En cours';
      case 'completed': return '✅ Terminée';
      default: return status;
    }
  };

  const getMemberName = (memberId: number | undefined) => {
    if (!memberId) return 'Choisir un membre';
    const member = members?.find(m => m.id === memberId);
    return member?.name || `Membre ${memberId}`;
  };

  const formatDueDate = (dueDate: string) => {
    try {
      const d = new Date(dueDate.replace(' ', 'T') + 'Z');
      return format(d, 'dd MMM', { locale: getLocale() });
    } catch { return dueDate; }
  };

  // ── Composant carte tâche ──
  const TaskCard = ({ task, showFavorite = true }: { task: any; showFavorite?: boolean }) => (
    <TouchableOpacity style={styles.taskCard} onPress={() => handleTaskClick(task)} activeOpacity={0.7}>
      {/* Barre de priorité */}
      <View style={[styles.priorityBar, { backgroundColor: getPriorityColor(task.priority) }]} />

      {/* Checkbox */}
      <TouchableOpacity style={styles.taskCheckbox} onPress={() => completeMutation.mutate({ taskId: task.id })}>
        <View style={[styles.checkbox, task.status === 'completed' && styles.checkboxChecked]}>
          {task.status === 'completed' && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>

      {/* Contenu */}
      <View style={styles.taskContent}>
        <Text style={[styles.taskTitle, task.status === 'completed' && styles.taskTitleCompleted]} numberOfLines={2}>
          {task.isPrivate === 1 && '🔒 '}{task.title}
        </Text>
        {task.description ? (
          <Text style={styles.taskDescription} numberOfLines={1}>{task.description}</Text>
        ) : null}
        <View style={styles.taskMeta}>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(task.priority) + '22' }]}>
            <Text style={[styles.priorityText, { color: getPriorityColor(task.priority) }]}>
              {getPriorityEmoji(task.priority)} {getPriorityLabel(task.priority)}
            </Text>
          </View>
          {task.dueDate && (
            <Text style={styles.dueDateText}>📅 {formatDueDate(task.dueDate)}</Text>
          )}
          {task.recurrence && task.recurrence !== 'none' && (
            <Text style={styles.recurrenceText}>🔁</Text>
          )}
          {task.points && task.points > 0 ? (
            <Text style={styles.pointsText}>⭐ {task.points}pts</Text>
          ) : null}
        </View>
      </View>

      {/* Favori */}
      {showFavorite && (
        <TouchableOpacity style={styles.favoriteBtn} onPress={() => handleToggleFavorite(task)}>
          <Text style={{ fontSize: 18 }}>{task.isFavorite === 1 ? '⭐' : '☆'}</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  // ── Composant formulaire (partagé création/modification) ──
  const TaskForm = ({ data, setData, isEdit = false }: { data: any; setData: any; isEdit?: boolean }) => (
    <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
      {/* Titre */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('common.title') || 'Titre'} *</Text>
        <TextInput
          style={styles.input}
          placeholder="Titre de la tâche"
          placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
          value={data.title}
          onChangeText={(text) => setData({ ...data, title: text })}
        />
      </View>
      {/* Description */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('calendar.description') || 'Description'}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Description..."
          placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
          value={data.description}
          onChangeText={(text) => setData({ ...data, description: text })}
          multiline
          numberOfLines={3}
        />
      </View>
      {/* Assigner à */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('tasks.assignTo') || 'Assigner à'}</Text>
        <TouchableOpacity style={styles.pickerButton} onPress={() => { setPickerTarget(isEdit ? 'edit' : 'create'); setShowAssignPicker(true); }}>
          <Text style={styles.pickerButtonText}>{getMemberName(data.assignedTo)}</Text>
          <Text style={styles.pickerArrow}>▼</Text>
        </TouchableOpacity>
      </View>
      {/* Date d'échéance */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('tasks.dueDate') || "Date d'échéance"}</Text>
        <TouchableOpacity style={styles.pickerButton} onPress={() => { setPickerTarget(isEdit ? 'edit' : 'create'); setShowDatePicker(true); }}>
          <Text style={styles.pickerButtonText}>
            {data.dueDate ? format(data.dueDate, 'dd/MM/yyyy HH:mm') : t('tasks.chooseDate') || 'Choisir une date'}
          </Text>
          <Text style={styles.pickerArrow}>📅</Text>
        </TouchableOpacity>
      </View>
      {/* Récurrence */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('tasks.recurrence') || 'Récurrence'}</Text>
        <TouchableOpacity style={styles.pickerButton} onPress={() => { setPickerTarget(isEdit ? 'edit' : 'create'); setShowRecurrencePicker(true); }}>
          <Text style={styles.pickerButtonText}>{getRecurrenceLabel(data.recurrence)}</Text>
          <Text style={styles.pickerArrow}>▼</Text>
        </TouchableOpacity>
      </View>
      {/* Points */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('tasks.points') || 'Points'}</Text>
        <TextInput
          style={styles.input}
          placeholder="10"
          placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
          value={data.points.toString()}
          onChangeText={(text) => setData({ ...data, points: parseInt(text) || 0 })}
          keyboardType="numeric"
        />
      </View>
      {/* Priorité */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('tasks.priority') || 'Priorité'}</Text>
        <TouchableOpacity style={styles.pickerButton} onPress={() => { setPickerTarget(isEdit ? 'edit' : 'create'); setShowPriorityPicker(true); }}>
          <Text style={styles.pickerButtonText}>{getPriorityEmoji(data.priority)} {getPriorityLabel(data.priority)}</Text>
          <Text style={styles.pickerArrow}>▼</Text>
        </TouchableOpacity>
      </View>
      {/* Privé */}
      <View style={styles.formGroup}>
        <View style={styles.switchRow}>
          <Text style={styles.label}>{t('common.private') || 'Privé (visible uniquement par moi)'}</Text>
          <Switch
            value={data.isPrivate}
            onValueChange={(value) => setData({ ...data, isPrivate: value })}
            trackColor={{ false: '#d1d5db', true: '#7c3aed' }}
            thumbColor={data.isPrivate ? '#fff' : '#f3f4f6'}
          />
        </View>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Titre */}
      <View style={styles.pageTitleContainer}>
        <Text style={styles.pageTitle}>{t('tabs.tasks') || 'Tâches'}</Text>
      </View>

      {/* Bouton Nouvelle tâche */}
      <View style={styles.newTaskButtonContainer}>
        <TouchableOpacity style={styles.newTaskButton} onPress={() => setCreateModalVisible(true)}>
          <Text style={styles.newTaskButtonText}>+ {t('tasks.newTask') || 'Nouvelle tâche'}</Text>
        </TouchableOpacity>
      </View>

      {/* Filtres */}
      <View style={styles.filterContainer}>
        {([
          { key: 'inProgress', label: t('tasks.inProgress') || 'En cours', count: groupedTasks.inProgress.length },
          { key: 'completed', label: t('tasks.completed') || 'Terminées', count: groupedTasks.completed.length },
          { key: 'myTasks', label: t('tasks.myTasks') || 'Mes tâches', count: tasks?.filter(t => t.assignedTo === user?.id).length || 0 },
        ] as const).map(({ key, label, count }) => (
          <TouchableOpacity
            key={key}
            style={[styles.filterTab, filter === key && styles.filterTabActive]}
            onPress={() => setFilter(key)}
            onLongPress={() => {
              setFavoriteFilter(key);
              Alert.alert('⭐', `Vue "${label}" définie comme favorite !`);
            }}
            delayLongPress={500}
          >
            <Text style={[styles.filterText, filter === key && styles.filterTextActive]}>
              {favoriteFilter === key ? '⭐ ' : ''}{label} ({count})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Contenu principal */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7c3aed']} />}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#7c3aed" />
            <Text style={styles.loadingText}>{t('common.loading') || 'Chargement...'}</Text>
          </View>
        ) : (
          <>
            {/* Section Aujourd'hui */}
            <TouchableOpacity style={styles.sectionToday} onPress={() => setTodayExpanded(p => !p)} activeOpacity={0.8}>
              <Text style={styles.sectionTodayIcon}>📅</Text>
              <Text style={styles.sectionTodayTitle}>{t('tasks.today') || "Aujourd'hui"}</Text>
              <View style={styles.sectionTodayRight}>
                {todayTasks.length > 0
                  ? <View style={styles.sectionBadge}><Text style={styles.sectionBadgeText}>{todayTasks.length}</Text></View>
                  : <Text style={styles.sectionTodayEmpty}>{t('tasks.noTask') || 'Aucune tâche'}</Text>}
                <Text style={styles.sectionChevron}>{todayExpanded ? '▲' : '▼'}</Text>
              </View>
            </TouchableOpacity>
            {todayExpanded && todayTasks.length > 0 && (
              <View style={styles.sectionContent}>
                {todayTasks.map(task => <TaskCard key={task.id} task={task} />)}
              </View>
            )}

            {/* Liste principale filtrée */}
            {filteredTasks.length > 0 && (
              <View style={styles.sectionContent}>
                {filteredTasks.map(task => <TaskCard key={task.id} task={task} />)}
              </View>
            )}

            {/* Section À venir */}
            {upcomingTasks.length > 0 && (
              <>
                <TouchableOpacity style={styles.sectionUpcoming} onPress={() => setUpcomingExpanded(p => !p)} activeOpacity={0.8}>
                  <Text style={styles.sectionUpcomingIcon}>🕐</Text>
                  <Text style={styles.sectionUpcomingTitle}>{t('tasks.upcoming') || 'À venir'}</Text>
                  <View style={styles.sectionTodayRight}>
                    <View style={[styles.sectionBadge, { backgroundColor: '#ede9fe' }]}>
                      <Text style={[styles.sectionBadgeText, { color: '#7c3aed' }]}>{upcomingTasks.length}</Text>
                    </View>
                    <Text style={[styles.sectionChevron, { color: '#6b7280' }]}>{upcomingExpanded ? '▲' : '▼'}</Text>
                  </View>
                </TouchableOpacity>
                {upcomingExpanded && (
                  <View style={styles.sectionContent}>
                    {upcomingGroups.map(group => (
                      <View key={group.dateStr}>
                        <View style={styles.dateGroupHeader}>
                          <Text style={styles.dateGroupLabel}>{group.label}</Text>
                          <Text style={styles.dateGroupCount}>{group.tasks.length}</Text>
                        </View>
                        {group.tasks.map(task => <TaskCard key={task.id} task={task} />)}
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}

            {/* État vide */}
            {filteredTasks.length === 0 && todayTasks.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateEmoji}>📋</Text>
                <Text style={styles.emptyStateText}>{t('tasks.empty') || 'Aucune tâche pour le moment'}</Text>
                <TouchableOpacity style={styles.emptyStateButton} onPress={() => setCreateModalVisible(true)}>
                  <Text style={styles.emptyStateButtonText}>+ {t('tasks.newTask') || 'Nouvelle tâche'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* ══════════════════════════════════════════════════════
          MODAL — Créer une tâche
          ══════════════════════════════════════════════════════ */}
      <Modal visible={createModalVisible} animationType="slide" transparent onRequestClose={() => setCreateModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('tasks.newTask') || 'Nouvelle tâche'}</Text>
              <TouchableOpacity onPress={() => { setCreateModalVisible(false); resetForm(); }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <TaskForm data={formData} setData={setFormData} isEdit={false} />
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => { setCreateModalVisible(false); resetForm(); }}>
                <Text style={styles.cancelButtonText}>{t('common.cancel') || 'Annuler'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.createButton} onPress={handleCreateTask} disabled={createMutation.isPending}>
                <Text style={styles.createButtonText}>{createMutation.isPending ? '...' : t('common.create') || 'Créer'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════
          MODAL — Détails de la tâche
          ══════════════════════════════════════════════════════ */}
      <Modal visible={detailModalVisible} animationType="slide" transparent onRequestClose={() => setDetailModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('tasks.details') || 'Détails'}</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {selectedTask && (
              <ScrollView style={styles.modalBody}>
                <Text style={styles.detailTitle}>{selectedTask.title}</Text>
                {selectedTask.description ? <Text style={styles.detailDesc}>{selectedTask.description}</Text> : null}

                {/* Statut — Dropdown */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>{t('tasks.status') || 'Statut'}</Text>
                  <TouchableOpacity style={styles.pickerButton} onPress={() => setShowStatusPicker(true)}>
                    <Text style={styles.pickerButtonText}>{getStatusLabel(selectedTask.status)}</Text>
                    <Text style={styles.pickerArrow}>▼</Text>
                  </TouchableOpacity>
                </View>

                {/* Priorité */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('tasks.priority') || 'Priorité'} :</Text>
                  <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(selectedTask.priority) + '22' }]}>
                    <Text style={[styles.priorityText, { color: getPriorityColor(selectedTask.priority) }]}>
                      {getPriorityEmoji(selectedTask.priority)} {getPriorityLabel(selectedTask.priority)}
                    </Text>
                  </View>
                </View>

                {/* Échéance */}
                {selectedTask.dueDate && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('tasks.dueDate') || 'Échéance'} :</Text>
                    <Text style={styles.detailValue}>📅 {formatDueDate(selectedTask.dueDate)}</Text>
                  </View>
                )}

                {/* Points */}
                {selectedTask.points > 0 && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('tasks.points') || 'Points'} :</Text>
                    <Text style={[styles.detailValue, { color: '#7c3aed', fontWeight: 'bold' }]}>⭐ +{selectedTask.points}</Text>
                  </View>
                )}

                {/* Récurrence */}
                {selectedTask.recurrence && selectedTask.recurrence !== 'none' && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('tasks.recurrence') || 'Récurrence'} :</Text>
                    <Text style={styles.detailValue}>{getRecurrenceLabel(selectedTask.recurrence)}</Text>
                  </View>
                )}

                {/* Privé */}
                {selectedTask.isPrivate === 1 && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailValue}>🔒 {t('common.private') || 'Privé'}</Text>
                  </View>
                )}

                {/* Reporter */}
                {selectedTask.status !== 'completed' && (
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>{t('tasks.postpone') || 'Reporter'}</Text>
                    <TouchableOpacity style={styles.pickerButton} onPress={() => setShowPostponePicker(true)}>
                      <Text style={styles.pickerButtonText}>⏰ {t('tasks.postponeBy') || 'Reporter de...'}</Text>
                      <Text style={styles.pickerArrow}>▼</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            )}
            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.cancelButton, { flex: 0.45 }]} onPress={handleDeleteTask}>
                <Text style={[styles.cancelButtonText, { color: '#ef4444' }]}>🗑 {t('common.delete') || 'Supprimer'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.createButton} onPress={handleEditClick}>
                <Text style={styles.createButtonText}>✏️ {t('common.edit') || 'Modifier'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════
          MODAL — Modifier une tâche
          ══════════════════════════════════════════════════════ */}
      <Modal visible={editModalVisible} animationType="slide" transparent onRequestClose={() => setEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('tasks.editTask') || 'Modifier la tâche'}</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <TaskForm data={editFormData} setData={setEditFormData} isEdit={true} />
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.cancelButtonText}>{t('common.cancel') || 'Annuler'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.createButton} onPress={handleUpdateTask} disabled={updateMutation.isPending}>
                <Text style={styles.createButtonText}>{updateMutation.isPending ? '...' : t('common.save') || 'Enregistrer'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════
          PICKERS (partagés création/modification)
          ══════════════════════════════════════════════════════ */}

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={(pickerTarget === 'edit' ? editFormData.dueDate : formData.dueDate) || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              if (pickerTarget === 'edit') setEditFormData(p => ({ ...p, dueDate: selectedDate }));
              else setFormData(p => ({ ...p, dueDate: selectedDate }));
              setShowTimePicker(true);
            }
          }}
        />
      )}
      {showTimePicker && (
        <DateTimePicker
          value={(pickerTarget === 'edit' ? editFormData.dueDate : formData.dueDate) || new Date()}
          mode="time"
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, selectedDate) => {
            setShowTimePicker(false);
            if (selectedDate) {
              if (pickerTarget === 'edit') setEditFormData(p => ({ ...p, dueDate: selectedDate }));
              else setFormData(p => ({ ...p, dueDate: selectedDate }));
            }
          }}
        />
      )}

      {/* Assigner à */}
      <Modal visible={showAssignPicker} animationType="fade" transparent onRequestClose={() => setShowAssignPicker(false)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowAssignPicker(false)}>
          <View style={styles.pickerModal} onStartShouldSetResponder={() => true}>
            <Text style={styles.pickerTitle}>{t('tasks.assignTo') || 'Assigner à'}</Text>
            <TouchableOpacity style={styles.pickerOption} onPress={() => { if (pickerTarget === 'edit') setEditFormData(p => ({ ...p, assignedTo: undefined })); else setFormData(p => ({ ...p, assignedTo: undefined })); setShowAssignPicker(false); }}>
              <Text style={styles.pickerOptionText}>👤 Aucun</Text>
            </TouchableOpacity>
            {members?.filter(m => m.status === 'active').map(member => (
              <TouchableOpacity key={member.id} style={styles.pickerOption} onPress={() => { if (pickerTarget === 'edit') setEditFormData(p => ({ ...p, assignedTo: member.id })); else setFormData(p => ({ ...p, assignedTo: member.id })); setShowAssignPicker(false); }}>
                <Text style={styles.pickerOptionText}>👤 {member.name || `Membre ${member.id}`}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Récurrence */}
      <Modal visible={showRecurrencePicker} animationType="fade" transparent onRequestClose={() => setShowRecurrencePicker(false)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowRecurrencePicker(false)}>
          <View style={styles.pickerModal} onStartShouldSetResponder={() => true}>
            <Text style={styles.pickerTitle}>{t('tasks.recurrence') || 'Récurrence'}</Text>
            {(['none', 'daily', 'weekly', 'monthly', 'yearly'] as Recurrence[]).map(rec => (
              <TouchableOpacity key={rec} style={styles.pickerOption} onPress={() => { if (pickerTarget === 'edit') setEditFormData(p => ({ ...p, recurrence: rec })); else setFormData(p => ({ ...p, recurrence: rec })); setShowRecurrencePicker(false); }}>
                <Text style={styles.pickerOptionText}>{getRecurrenceLabel(rec)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Priorité */}
      <Modal visible={showPriorityPicker} animationType="fade" transparent onRequestClose={() => setShowPriorityPicker(false)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowPriorityPicker(false)}>
          <View style={styles.pickerModal} onStartShouldSetResponder={() => true}>
            <Text style={styles.pickerTitle}>{t('tasks.priority') || 'Priorité'}</Text>
            {(['urgent', 'high', 'medium', 'low'] as Priority[]).map(pri => (
              <TouchableOpacity key={pri} style={styles.pickerOption} onPress={() => { if (pickerTarget === 'edit') setEditFormData(p => ({ ...p, priority: pri })); else setFormData(p => ({ ...p, priority: pri })); setShowPriorityPicker(false); }}>
                <Text style={styles.pickerOptionText}>{getPriorityEmoji(pri)} {getPriorityLabel(pri)}</Text>
                <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(pri) }]} />
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Statut (depuis détail) */}
      <Modal visible={showStatusPicker} animationType="fade" transparent onRequestClose={() => setShowStatusPicker(false)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowStatusPicker(false)}>
          <View style={styles.pickerModal} onStartShouldSetResponder={() => true}>
            <Text style={styles.pickerTitle}>{t('tasks.status') || 'Statut'}</Text>
            {(['todo', 'inProgress', 'completed'] as TaskStatus[]).map(s => (
              <TouchableOpacity key={s} style={[styles.pickerOption, selectedTask?.status === s && { backgroundColor: isDark ? '#374151' : '#ede9fe' }]} onPress={() => { handleUpdateStatus(s); setShowStatusPicker(false); }}>
                <Text style={styles.pickerOptionText}>{getStatusLabel(s)}</Text>
                {selectedTask?.status === s && <Text style={{ color: '#7c3aed', fontSize: 18 }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Reporter */}
      <Modal visible={showPostponePicker} animationType="fade" transparent onRequestClose={() => setShowPostponePicker(false)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowPostponePicker(false)}>
          <View style={styles.pickerModal} onStartShouldSetResponder={() => true}>
            <Text style={styles.pickerTitle}>⏰ {t('tasks.postpone') || 'Reporter'}</Text>
            {[
              { label: '+ 1 jour', days: 1 },
              { label: '+ 2 jours', days: 2 },
              { label: '+ 3 jours', days: 3 },
              { label: '+ 1 semaine', days: 7 },
              { label: '+ 2 semaines', days: 14 },
              { label: '+ 1 mois', days: 30 },
            ].map(({ label, days }) => (
              <TouchableOpacity key={days} style={styles.pickerOption} onPress={() => { if (selectedTask) postponeMutation.mutate({ taskId: selectedTask.id, days }); setShowPostponePicker(false); }}>
                <Text style={styles.pickerOptionText}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
function getStyles(isDark: boolean) {
  const bg = isDark ? '#111827' : '#f9fafb';
  const card = isDark ? '#1f2937' : '#ffffff';
  const text = isDark ? '#f9fafb' : '#111827';
  const subtext = isDark ? '#9ca3af' : '#6b7280';
  const border = isDark ? '#374151' : '#e5e7eb';
  const inputBg = isDark ? '#111827' : '#f3f4f6';

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: bg },

    // ── Titre ──
    pageTitleContainer: {
      backgroundColor: card,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: border,
      alignItems: 'center',
    },
    pageTitle: { fontSize: 24, fontWeight: 'bold', color: text },

    // ── Bouton nouvelle tâche ──
    newTaskButtonContainer: { padding: 12, backgroundColor: card, alignItems: 'center' },
    newTaskButton: { backgroundColor: '#7c3aed', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
    newTaskButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },

    // ── Filtres ──
    filterContainer: {
      flexDirection: 'row',
      backgroundColor: card,
      paddingHorizontal: 12,
      paddingBottom: 12,
      gap: 8,
    },
    filterTab: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 4,
      borderRadius: 8,
      backgroundColor: isDark ? '#374151' : '#f3f4f6',
      alignItems: 'center',
    },
    filterTabActive: { backgroundColor: '#7c3aed' },
    filterText: { fontSize: 11, color: subtext, fontWeight: '500', textAlign: 'center' },
    filterTextActive: { color: '#fff', fontWeight: '700' },

    // ── Contenu ──
    content: { flex: 1 },

    // ── Section Aujourd'hui ──
    sectionToday: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 12,
      marginTop: 12,
      marginBottom: 4,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: '#7c3aed',
    },
    sectionTodayIcon: { fontSize: 16, marginRight: 8 },
    sectionTodayTitle: { fontSize: 14, fontWeight: 'bold', color: '#fff', flex: 1 },
    sectionTodayRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sectionTodayEmpty: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
    sectionBadge: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
    sectionBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    sectionChevron: { color: '#fff', fontSize: 12 },

    // ── Section À venir ──
    sectionUpcoming: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 12,
      marginTop: 12,
      marginBottom: 4,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: card,
      borderWidth: 1,
      borderColor: border,
    },
    sectionUpcomingIcon: { fontSize: 16, marginRight: 8 },
    sectionUpcomingTitle: { fontSize: 14, fontWeight: 'bold', color: text, flex: 1 },

    sectionContent: { paddingHorizontal: 12, paddingTop: 4 },

    // ── Groupe de date ──
    dateGroupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 4,
      marginTop: 8,
    },
    dateGroupLabel: { fontSize: 12, fontWeight: '700', color: '#7c3aed', flex: 1, textTransform: 'capitalize' },
    dateGroupCount: { fontSize: 12, color: subtext },

    // ── Carte tâche ──
    taskCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: card,
      borderRadius: 12,
      marginBottom: 8,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: border,
    },
    priorityBar: { width: 4, alignSelf: 'stretch' },
    taskCheckbox: { padding: 12 },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: '#7c3aed',
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxChecked: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
    checkmark: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
    taskContent: { flex: 1, paddingVertical: 10, paddingRight: 4 },
    taskTitle: { fontSize: 15, fontWeight: '600', color: text, marginBottom: 2 },
    taskTitleCompleted: { textDecorationLine: 'line-through', color: subtext },
    taskDescription: { fontSize: 13, color: subtext, marginBottom: 4 },
    taskMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
    priorityBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    priorityText: { fontSize: 11, fontWeight: '600' },
    dueDateText: { fontSize: 11, color: subtext },
    recurrenceText: { fontSize: 13 },
    pointsText: { fontSize: 11, color: '#7c3aed', fontWeight: '600' },
    favoriteBtn: { padding: 12 },

    // ── État vide ──
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
    loadingText: { color: subtext, marginTop: 12 },
    emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
    emptyStateEmoji: { fontSize: 48, marginBottom: 12 },
    emptyStateText: { fontSize: 16, color: subtext, textAlign: 'center', marginBottom: 20 },
    emptyStateButton: { backgroundColor: '#7c3aed', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
    emptyStateButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },

    // ── Modaux ──
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: {
      backgroundColor: card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '90%',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: border,
    },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: text },
    modalClose: { fontSize: 20, color: subtext, padding: 4 },
    modalBody: { paddingHorizontal: 20, paddingTop: 12, maxHeight: 500 },
    modalFooter: {
      flexDirection: 'row',
      gap: 12,
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: border,
    },

    // ── Formulaire ──
    formGroup: { marginBottom: 16 },
    label: { fontSize: 14, fontWeight: '600', color: text, marginBottom: 6 },
    input: {
      backgroundColor: inputBg,
      borderRadius: 10,
      padding: 12,
      fontSize: 15,
      color: text,
      borderWidth: 1,
      borderColor: border,
    },
    textArea: { height: 80, textAlignVertical: 'top' },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

    // ── Picker button ──
    pickerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: inputBg,
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: border,
    },
    pickerButtonText: { fontSize: 15, color: text, flex: 1 },
    pickerArrow: { fontSize: 14, color: subtext },

    // ── Boutons footer ──
    cancelButton: {
      flex: 1,
      padding: 14,
      borderRadius: 10,
      backgroundColor: isDark ? '#374151' : '#f3f4f6',
      alignItems: 'center',
    },
    cancelButtonText: { fontSize: 15, fontWeight: '600', color: text },
    createButton: {
      flex: 1,
      padding: 14,
      borderRadius: 10,
      backgroundColor: '#7c3aed',
      alignItems: 'center',
    },
    createButtonText: { fontSize: 15, fontWeight: '600', color: '#fff' },

    // ── Détail ──
    detailTitle: { fontSize: 20, fontWeight: 'bold', color: text, marginBottom: 8 },
    detailDesc: { fontSize: 14, color: subtext, marginBottom: 16, lineHeight: 20 },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    detailLabel: { fontSize: 14, color: subtext, minWidth: 80 },
    detailValue: { fontSize: 14, color: text },

    // ── Picker modaux ──
    pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    pickerModal: {
      backgroundColor: card,
      borderRadius: 16,
      padding: 20,
      width: '85%',
      maxHeight: '70%',
    },
    pickerTitle: { fontSize: 17, fontWeight: 'bold', color: text, marginBottom: 14 },
    pickerOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 13,
      paddingHorizontal: 8,
      borderRadius: 8,
      marginBottom: 2,
    },
    pickerOptionText: { fontSize: 16, color: text },
    priorityDot: { width: 12, height: 12, borderRadius: 6 },
  });
}
