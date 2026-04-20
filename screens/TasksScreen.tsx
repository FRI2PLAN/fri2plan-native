import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, Modal, TextInput, Alert, Switch, ActivityIndicator, Platform } from 'react-native';
import { TasksSkeleton } from '../components/SkeletonLoader';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../contexts/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { trpc } from '../lib/trpc';
import { useAuth } from '../contexts/AuthContext';
import { format, addDays } from 'date-fns';
import { fr, de, enUS } from 'date-fns/locale';

/** Parser une date locale (heure Europe/Zurich) sans ambigüité sur Android/Hermes */
function parseLocalDate(dateStr: string | undefined | null): Date {
  if (!dateStr) return new Date();
  const s = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
  const [datePart, timePart = '00:00:00'] = s.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes, seconds = 0] = timePart.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, seconds);
}

interface TasksScreenProps {
  onNavigate?: (screen: string) => void;
  onPrevious?: () => void;
  onNext?: () => void;
}

type Priority = 'urgent' | 'high' | 'medium' | 'low';
type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
type TaskStatus = 'todo' | 'inProgress' | 'completed';
type FilterType = 'inProgress' | 'completed' | 'myTasks';

// ─── Composant Avatar ────────────────────────────────────────────────────────
function AvatarCircle({ name, size = 28, color = '#7c3aed' }: { name: string; size?: number; color?: string }) {
  const initials = name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color, alignItems: 'center', justifyContent: 'center'}}>
      <Text style={{ color: '#fff', fontSize: size * 0.38, fontWeight: '700' }}>{initials}</Text>
    </View>
  );
}

export default function TasksScreen({ onNavigate, onPrevious, onNext }: TasksScreenProps) {
  const { isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const styles = getStyles(isDark);

  // ── Filtres ──
  const [filter, setFilter] = useState<FilterType>('inProgress');
  const [favoriteFilter, setFavoriteFilter] = useState<FilterType>('inProgress');

  // ── Sections collapsibles ──
  const [overdueExpanded, setOverdueExpanded] = useState(true);
  const [todayExpanded, setTodayExpanded] = useState(true);
  const [upcomingExpanded, setUpcomingExpanded] = useState(false);

  // ── Refresh ──
  const [refreshing, setRefreshing] = useState(false);

  // ── Modaux ──
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [quickActionsVisible, setQuickActionsVisible] = useState(false);
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
  const emptyForm = {
    title: '', description: '',
    assignedTo: undefined as number | undefined,
    dueDate: undefined as Date | undefined,
    recurrence: 'none' as Recurrence,
    points: 10, priority: 'medium' as Priority, isPrivate: false};
  const [formData, setFormData] = useState(emptyForm);
  const [editFormData, setEditFormData] = useState(emptyForm);

  // ── tRPC ──
  const utils = trpc.useUtils();
  const { data: tasks, isLoading, refetch } = trpc.tasks.list.useQuery();
  const { data: members } = trpc.family.members.useQuery(
    { familyId: 1 },
    { enabled: createModalVisible || editModalVisible || showAssignPicker }
  );

  const createMutation = trpc.tasks.create.useMutation({
    onSuccess: () => { setCreateModalVisible(false); setFormData(emptyForm); utils.tasks.list.invalidate(); },
    onError: (e) => Alert.alert('Erreur', e.message)});

  const updateMutation = trpc.tasks.update.useMutation({
    onSuccess: () => { setEditModalVisible(false); setQuickActionsVisible(false); utils.tasks.list.invalidate(); },
    onError: (e) => Alert.alert('Erreur', e.message)});

  const deleteMutation = trpc.tasks.delete.useMutation({
    onSuccess: () => { setQuickActionsVisible(false); utils.tasks.list.invalidate(); },
    onError: (e) => Alert.alert('Erreur', e.message)});

  const completeMutation = trpc.tasks.complete.useMutation({
    onSuccess: (data) => {
      if (data?.points) Alert.alert('🎉', `+${data.points} points !`);
      setQuickActionsVisible(false);
      utils.tasks.list.invalidate();
    },
    onError: (e) => Alert.alert('Erreur', e.message)});

  const postponeMutation = trpc.tasks.postpone.useMutation({
    onSuccess: (data) => {
      const locale = i18n.language === 'de' ? de : i18n.language === 'en' ? enUS : fr;
      const formatted = format(new Date(data.newDueDate), 'dd MMMM', { locale });
      Alert.alert('⏰', `Reportée au ${formatted}`);
      setShowPostponePicker(false);
      utils.tasks.list.invalidate();
    },
    onError: (e) => Alert.alert('Erreur', e.message)});

  // ── Helpers ──
  const getLocale = () => i18n.language === 'de' ? de : i18n.language === 'en' ? enUS : fr;
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  const getDueDateStr = (dueDate: string) => {
    try { return format(parseLocalDate(dueDate), 'yyyy-MM-dd'); }
    catch { return ''; }
  };

  const getMemberById = (id: number | undefined) => members?.find(m => m.id === id);
  const getMemberName = (id: number | undefined) => {
    if (!id) return 'Aucun';
    return getMemberById(id)?.name || `Membre ${id}`;
  };

  const getPriorityColor = (p: string) => ({ urgent: '#dc2626', high: '#f97316', medium: '#eab308', low: '#10b981' }[p] || '#6b7280');
  const getPriorityEmoji = (p: string) => ({ urgent: '🔴', high: '🟠', medium: '🟡', low: '🟢' }[p] || '⚪');
  const getPriorityLabel = (p: string) => ({ urgent: t('tasks.urgent') || 'Urgent', high: t('tasks.high') || 'Haute', medium: t('tasks.medium') || 'Moyenne', low: t('tasks.low') || 'Basse' }[p] || '');
  const getRecurrenceLabel = (r: Recurrence) => ({ none: '🚫 Aucune', daily: '📅 Quotidienne', weekly: '📆 Hebdomadaire', monthly: '🗓️ Mensuelle', yearly: '🎉 Annuelle' }[r]);
  const getStatusLabel = (s: string) => ({ todo: '⭕ À faire', inProgress: '🔵 En cours', completed: '✅ Terminée' }[s] || s);

  const formatDueDate = (d: string) => {
    try { return format(parseLocalDate(d), 'dd MMM', { locale: getLocale() }); }
    catch { return d; }
  };

  // ── Filtrage ──
  const overdueTasks = (tasks || []).filter(t => t.status !== 'completed' && t.dueDate && getDueDateStr(t.dueDate) < todayStr)
    .sort((a, b) => parseLocalDate(a.dueDate!).getTime() - parseLocalDate(b.dueDate!).getTime());
  const todayTasks = (tasks || []).filter(t => t.status !== 'completed' && t.dueDate && getDueDateStr(t.dueDate) === todayStr);
  const upcomingTasks = (tasks || []).filter(t => t.status !== 'completed' && t.dueDate && getDueDateStr(t.dueDate) >= tomorrowStr)
    .sort((a, b) => parseLocalDate(a.dueDate!).getTime() - parseLocalDate(b.dueDate!).getTime());

  const upcomingGroups: { label: string; dateStr: string; tasks: typeof upcomingTasks }[] = [];
  upcomingTasks.forEach(t => {
    const ds = getDueDateStr(t.dueDate!);
    let label = ds === tomorrowStr
      ? `Demain — ${format(addDays(new Date(), 1), 'dd MMMM', { locale: getLocale() })}`
      : (() => { const d = parseLocalDate(t.dueDate!); const l = format(d, 'EEEE dd MMMM', { locale: getLocale() }); return l.charAt(0).toUpperCase() + l.slice(1); })();
    const g = upcomingGroups.find(g => g.dateStr === ds);
    if (g) g.tasks.push(t); else upcomingGroups.push({ label, dateStr: ds, tasks: [t] });
  });

  const filteredTasks = (tasks || []).filter(t => {
    if (filter === 'myTasks') return t.assignedTo === user?.id;
    return t.status === filter;
  });

  // ── Actions ──
  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };

  const handleTaskPress = (task: any) => {
    setSelectedTask(task);
    setQuickActionsVisible(true);
  };

  const handleEditClick = () => {
    if (!selectedTask) return;
    setEditFormData({
      title: selectedTask.title,
      description: selectedTask.description || '',
      assignedTo: selectedTask.assignedTo,
      dueDate: selectedTask.dueDate ? parseLocalDate(selectedTask.dueDate) : undefined,
      recurrence: selectedTask.recurrence || 'none',
      points: selectedTask.points || 10,
      priority: selectedTask.priority || 'medium',
      isPrivate: selectedTask.isPrivate === 1});
    setQuickActionsVisible(false);
    setEditModalVisible(true);
  };

  const handleDeleteTask = () => {
    if (!selectedTask) return;
    Alert.alert('Supprimer ?', `"${selectedTask.title}"`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteMutation.mutate({ taskId: selectedTask.id }) },
    ]);
  };

  const handleAssignToMe = () => {
    if (!selectedTask || !user) return;
    const isAlreadyMine = selectedTask.assignedTo === user.id;
    updateMutation.mutate({
      taskId: selectedTask.id,
      assignedTo: isAlreadyMine ? undefined : user.id});
    setSelectedTask({ ...selectedTask, assignedTo: isAlreadyMine ? undefined : user.id });
  };

  const handleCreateTask = () => {
    if (!formData.title.trim()) { Alert.alert('Erreur', 'Le titre est requis'); return; }
    createMutation.mutate({
      title: formData.title,
      description: formData.description || undefined,
      assignedTo: formData.assignedTo,
      dueDate: formData.dueDate,
      recurrence: formData.recurrence,
      points: formData.points,
      priority: formData.priority,
      isPrivate: formData.isPrivate ? 1 : 0});
  };

  const handleUpdateTask = () => {
    if (!selectedTask) return;
    if (!editFormData.title.trim()) { Alert.alert('Erreur', 'Le titre est requis'); return; }
    updateMutation.mutate({
      taskId: selectedTask.id,
      title: editFormData.title,
      description: editFormData.description || undefined,
      assignedTo: editFormData.assignedTo,
      dueDate: editFormData.dueDate,
      recurrence: editFormData.recurrence,
      points: editFormData.points,
      priority: editFormData.priority,
      isPrivate: editFormData.isPrivate ? 1 : 0});
  };

  // ── Composant carte tâche ────────────────────────────────────────────────
  const TaskCard = ({ task }: { task: any }) => {
    const assignedMember = getMemberById(task.assignedTo);
    const isAssignedToMe = task.assignedTo === user?.id;
    return (
      <TouchableOpacity style={styles.taskCard} onPress={() => handleTaskPress(task)} activeOpacity={0.75}>
        {/* Barre priorité */}
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
            {task.isPrivate === 1 ? '🔒 ' : ''}{task.title}
          </Text>
          {task.description ? <Text style={styles.taskDescription} numberOfLines={1}>{task.description}</Text> : null}
          <View style={styles.taskMeta}>
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(task.priority) + '22' }]}>
              <Text style={[styles.priorityText, { color: getPriorityColor(task.priority) }]}>
                {getPriorityEmoji(task.priority)} {getPriorityLabel(task.priority)}
              </Text>
            </View>
            {task.dueDate && <Text style={styles.dueDateText}>📅 {formatDueDate(task.dueDate)}</Text>}
            {task.recurrence && task.recurrence !== 'none' && <Text style={{ fontSize: 13 }}>🔁</Text>}
            {task.points > 0 && <Text style={styles.pointsText}>⭐ {task.points}pts</Text>}
          </View>
        </View>

        {/* Avatar assigné */}
        <View style={styles.avatarZone}>
          {assignedMember ? (
            <AvatarCircle
              name={assignedMember.name || '?'}
              size={30}
              color={isAssignedToMe ? '#7c3aed' : '#6b7280'}
            />
          ) : (
            <View style={styles.avatarEmpty}>
              <Text style={styles.avatarEmptyText}>+</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // ── Formulaire (fonction de rendu, pas un composant, pour éviter le re-montage au clavier) ──
  const renderTaskForm = (data: typeof emptyForm, setData: (d: typeof emptyForm) => void, isEdit = false) => (
    <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
      {/* Titre */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('common.title') || 'Titre'} *</Text>
        <TextInput style={styles.input} placeholder="Titre de la tâche" placeholderTextColor={isDark ? '#9ca3af' : '#9ca3af'}
          value={data.title} onChangeText={text => setData({ ...data, title: text })} />
      </View>
      {/* Description */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('calendar.description') || 'Description'}</Text>
        <TextInput style={[styles.input, styles.textArea]} placeholder="Description..." placeholderTextColor={isDark ? '#9ca3af' : '#9ca3af'}
          value={data.description} onChangeText={text => setData({ ...data, description: text })} multiline numberOfLines={3} />
      </View>
      {/* Assigner à */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('tasks.assignTo') || 'Assigner à'}</Text>
        <TouchableOpacity style={styles.pickerButton} onPress={() => { setPickerTarget(isEdit ? 'edit' : 'create'); setShowAssignPicker(true); }}>
          {data.assignedTo ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AvatarCircle name={getMemberName(data.assignedTo)} size={24} />
              <Text style={styles.pickerButtonText}>{getMemberName(data.assignedTo)}</Text>
            </View>
          ) : <Text style={styles.pickerButtonText}>{t('tasks.chooseMember')}</Text>}
          <Text style={styles.pickerArrow}>▼</Text>
        </TouchableOpacity>
      </View>
      {/* Date d'échéance */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('tasks.dueDate') || "Date d'échéance"}</Text>
        <TouchableOpacity style={styles.pickerButton} onPress={() => { setPickerTarget(isEdit ? 'edit' : 'create'); setShowDatePicker(true); }}>
          <Text style={styles.pickerButtonText}>{data.dueDate ? format(data.dueDate, 'dd/MM/yyyy HH:mm') : '📅 Choisir une date'}</Text>
          <Text style={styles.pickerArrow}>▼</Text>
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
        <TextInput style={styles.input} placeholder="10" placeholderTextColor="#9ca3af"
          value={data.points.toString()} onChangeText={text => setData({ ...data, points: parseInt(text) || 0 })} keyboardType="numeric" />
      </View>
      {/* Priorité */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('tasks.priority') || 'Priorité'}</Text>
        <TouchableOpacity style={styles.pickerButton} onPress={() => { setPickerTarget(isEdit ? 'edit' : 'create'); setShowPriorityPicker(true); }}>
          <Text style={styles.pickerButtonText}>{getPriorityEmoji(data.priority)} {getPriorityLabel(data.priority)}</Text>
          <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(data.priority) }]} />
        </TouchableOpacity>
      </View>
      {/* Privé */}
      <View style={styles.formGroup}>
        <View style={styles.switchRow}>
          <Text style={styles.label}>{t('common.private') || 'Privé'}</Text>
          <Switch value={data.isPrivate} onValueChange={v => setData({ ...data, isPrivate: v })}
            trackColor={{ false: '#d1d5db', true: '#7c3aed' }} thumbColor={data.isPrivate ? '#fff' : '#f3f4f6'} />
        </View>
      </View>
    </ScrollView>
  );

  // ── Rendu principal ──────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Titre */}
      <View style={styles.pageTitleContainer}>
        <Text style={styles.pageTitle}>✅ {t('tabs.tasks') || 'Tâches'}</Text>
      </View>

      {/* Filtres + bouton + sur la même ligne */}
      <View style={styles.filterContainer}>
        {([
          { key: 'myTasks' as FilterType, label: t('tasks.myTasks') || 'Mes tâches', count: (tasks || []).filter(t => t.assignedTo === user?.id).length },
          { key: 'completed' as FilterType, label: '✓ ' + (t('tasks.completed') || 'Terminé'), count: (tasks || []).filter(t => t.status === 'completed').length },
        ]).map(({ key, label, count }) => (
          <TouchableOpacity
            key={key}
            style={[styles.filterTab, filter === key && styles.filterTabActive]}
            onPress={() => setFilter(key)}
            onLongPress={() => { setFavoriteFilter(key); Alert.alert('⭐', `Vue "${label}" définie comme favorite !`); }}
            delayLongPress={500}
          >
            <Text style={[styles.filterText, filter === key && styles.filterTextActive]}>
              {favoriteFilter === key ? '⭐ ' : ''}{label} ({count})
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.filterAddBtn} onPress={() => setCreateModalVisible(true)}>
          <Text style={styles.filterAddBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Liste */}
      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7c3aed']} />}>
        {isLoading ? (
          <TasksSkeleton />
        ) : (
          <>
            {/* Section En retard */}
            {overdueTasks.length > 0 && (
              <>
                <TouchableOpacity style={[styles.sectionToday, { backgroundColor: '#f59e0b' }]} onPress={() => setOverdueExpanded(p => !p)} activeOpacity={0.8}>
                  <Text style={styles.sectionTodayIcon}>⚠️</Text>
                  <Text style={styles.sectionTodayTitle}>{t('tasks.overdue') || 'En retard'}</Text>
                  <View style={styles.sectionRight}>
                    <View style={styles.sectionBadge}><Text style={styles.sectionBadgeText}>{overdueTasks.length}</Text></View>
                    <Text style={styles.sectionChevron}>{overdueExpanded ? '▲' : '▼'}</Text>
                  </View>
                </TouchableOpacity>
                {overdueExpanded && overdueTasks.map(t => <TaskCard key={t.id} task={t} />)}
              </>
            )}

            {/* Section Aujourd'hui */}
            <TouchableOpacity style={styles.sectionToday} onPress={() => setTodayExpanded(p => !p)} activeOpacity={0.8}>
              <Text style={styles.sectionTodayIcon}>📅</Text>
              <Text style={styles.sectionTodayTitle}>{t('tasks.today') || "Aujourd'hui"}</Text>
              <View style={styles.sectionRight}>
                {todayTasks.length > 0
                  ? <View style={styles.sectionBadge}><Text style={styles.sectionBadgeText}>{todayTasks.length}</Text></View>
                  : <Text style={styles.sectionEmpty}>{t('tasks.noTask') || 'Aucune'}</Text>}
                <Text style={styles.sectionChevron}>{todayExpanded ? '▲' : '▼'}</Text>
              </View>
            </TouchableOpacity>
            {todayExpanded && todayTasks.map(t => <TaskCard key={t.id} task={t} />)}

            {/* Liste filtrée */}
            {filteredTasks.length > 0 && filteredTasks.map(t => <TaskCard key={t.id} task={t} />)}

            {/* Section À venir */}
            {upcomingTasks.length > 0 && (
              <>
                <TouchableOpacity style={styles.sectionUpcoming} onPress={() => setUpcomingExpanded(p => !p)} activeOpacity={0.8}>
                  <Text style={styles.sectionTodayIcon}>🕐</Text>
                  <Text style={[styles.sectionTodayTitle, { color: isDark ? '#f9fafb' : '#111827' }]}>{t('tasks.upcoming') || 'À venir'}</Text>
                  <View style={styles.sectionRight}>
                    <View style={[styles.sectionBadge, { backgroundColor: '#ede9fe' }]}>
                      <Text style={[styles.sectionBadgeText, { color: '#7c3aed' }]}>{upcomingTasks.length}</Text>
                    </View>
                    <Text style={[styles.sectionChevron, { color: '#6b7280' }]}>{upcomingExpanded ? '▲' : '▼'}</Text>
                  </View>
                </TouchableOpacity>
                {upcomingExpanded && upcomingGroups.map(g => (
                  <View key={g.dateStr}>
                    <View style={styles.dateGroupHeader}>
                      <Text style={styles.dateGroupLabel}>{g.label}</Text>
                      <Text style={styles.dateGroupCount}>{g.tasks.length}</Text>
                    </View>
                    {g.tasks.map(t => <TaskCard key={t.id} task={t} />)}
                  </View>
                ))}
              </>
            )}

            {/* État vide */}
            {filteredTasks.length === 0 && todayTasks.length === 0 && !isLoading && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateEmoji}>📋</Text>
                <Text style={styles.emptyStateText}>{t('tasks.empty') || 'Aucune tâche pour le moment'}</Text>
                <TouchableOpacity style={styles.filterAddBtn} onPress={() => setCreateModalVisible(true)}>
                  <Text style={styles.filterAddBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={{ height: 80 }} />
          </>
        )}
      </ScrollView>

      {/* ══════════════════════════════════════════════════════
          DIALOG ACTIONS RAPIDES (clic sur une tâche)
          ══════════════════════════════════════════════════════ */}
      <Modal visible={quickActionsVisible} animationType="fade" transparent onRequestClose={() => setQuickActionsVisible(false)}>
        <TouchableOpacity style={styles.quickOverlay} activeOpacity={1} onPress={() => setQuickActionsVisible(false)}>
          <View style={styles.quickDialog} onStartShouldSetResponder={() => true}>
            {/* Titre de la tâche */}
            {selectedTask && (
              <>
                <Text style={styles.quickTaskTitle} numberOfLines={2}>{selectedTask.title}</Text>
                <View style={styles.quickDivider} />

                {/* Assigné à */}
                <View style={styles.quickAssignRow}>
                  <Text style={styles.quickAssignLabel}>{t('tasks.assignedTo')}</Text>
                  {selectedTask.assignedTo ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <AvatarCircle name={getMemberName(selectedTask.assignedTo)} size={24} color={selectedTask.assignedTo === user?.id ? '#7c3aed' : '#6b7280'} />
                      <Text style={styles.quickAssignName}>{getMemberName(selectedTask.assignedTo)}</Text>
                    </View>
                  ) : (
                    <Text style={[styles.quickAssignName, { color: '#9ca3af' }]}>{t('tasks.unassigned')}</Text>
                  )}
                </View>

                <View style={styles.quickDivider} />

                {/* Boutons actions — icônes uniquement */}
                <View style={styles.quickActions}>
                  {/* ✅ Valider */}
                  <TouchableOpacity style={[styles.quickBtn, { backgroundColor: '#10b981' }]}
                    onPress={() => completeMutation.mutate({ taskId: selectedTask.id })}>
                    <Text style={styles.quickBtnIcon}>✅</Text>
                    <Text style={styles.quickBtnLabel}>{t('common.validate')}</Text>
                  </TouchableOpacity>

                  {/* ✏️ Modifier */}
                  <TouchableOpacity style={[styles.quickBtn, { backgroundColor: '#3b82f6' }]} onPress={handleEditClick}>
                    <Text style={styles.quickBtnIcon}>✏️</Text>
                    <Text style={styles.quickBtnLabel}>{t('common.edit')}</Text>
                  </TouchableOpacity>

                  {/* ⏰ Reporter */}
                  <TouchableOpacity style={[styles.quickBtn, { backgroundColor: '#f59e0b' }]}
                    onPress={() => setShowPostponePicker(true)}>
                    <Text style={styles.quickBtnIcon}>⏰</Text>
                    <Text style={styles.quickBtnLabel}>Reporter</Text>
                  </TouchableOpacity>

                  {/* 👤 S'attribuer */}
                  <TouchableOpacity style={[styles.quickBtn, { backgroundColor: selectedTask.assignedTo === user?.id ? '#7c3aed' : '#6b7280' }]}
                    onPress={handleAssignToMe}>
                    {user ? (
                      <AvatarCircle name={user.name || 'Moi'} size={26} color="transparent" />
                    ) : <Text style={styles.quickBtnIcon}>👤</Text>}
                    <Text style={styles.quickBtnLabel}>{selectedTask.assignedTo === user?.id ? 'Me retirer' : 'M\'attribuer'}</Text>
                  </TouchableOpacity>

                  {/* 🗑 Supprimer */}
                  <TouchableOpacity style={[styles.quickBtn, { backgroundColor: '#ef4444' }]} onPress={handleDeleteTask}>
                    <Text style={styles.quickBtnIcon}>🗑</Text>
                    <Text style={styles.quickBtnLabel}>{t('common.delete')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ══════════════════════════════════════════════════════
          MODAL — Créer une tâche
          ══════════════════════════════════════════════════════ */}
      <Modal visible={createModalVisible} animationType="slide" transparent onRequestClose={() => setCreateModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('tasks.newTask') || 'Nouvelle tâche'}</Text>
              {/* Boutons icônes uniquement */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={[styles.iconBtn, { backgroundColor: '#f3f4f6' }]} onPress={() => { setCreateModalVisible(false); setFormData(emptyForm); }}>
                  <Text style={styles.iconBtnText}>✕</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.iconBtn, { backgroundColor: '#7c3aed' }]} onPress={handleCreateTask} disabled={createMutation.isPending}>
                  <Text style={[styles.iconBtnText, { color: '#fff' }]}>{createMutation.isPending ? '…' : '✓'}</Text>
                </TouchableOpacity>
              </View>
            </View>
            {renderTaskForm(formData, setFormData, false)}
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
              <Text style={styles.modalTitle}>{t('tasks.editTask') || 'Modifier'}</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={[styles.iconBtn, { backgroundColor: '#ef4444' }]} onPress={handleDeleteTask}>
                  <Text style={[styles.iconBtnText, { color: '#fff' }]}>🗑</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.iconBtn, { backgroundColor: '#f3f4f6' }]} onPress={() => setEditModalVisible(false)}>
                  <Text style={styles.iconBtnText}>✕</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.iconBtn, { backgroundColor: '#7c3aed' }]} onPress={handleUpdateTask} disabled={updateMutation.isPending}>
                  <Text style={[styles.iconBtnText, { color: '#fff' }]}>{updateMutation.isPending ? '…' : '✓'}</Text>
                </TouchableOpacity>
              </View>
            </View>
            {renderTaskForm(editFormData, setEditFormData, true)}
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════
          PICKERS
          ══════════════════════════════════════════════════════ */}

      {/* Date */}
      {showDatePicker && (
        <DateTimePicker
          value={(pickerTarget === 'edit' ? editFormData.dueDate : formData.dueDate) || new Date()}
          mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, d) => { setShowDatePicker(false); if (d) { if (pickerTarget === 'edit') setEditFormData(p => ({ ...p, dueDate: d })); else setFormData(p => ({ ...p, dueDate: d })); setShowTimePicker(true); } }}
        />
      )}
      {showTimePicker && (
        <DateTimePicker
          value={(pickerTarget === 'edit' ? editFormData.dueDate : formData.dueDate) || new Date()}
          mode="time" is24Hour display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, d) => { setShowTimePicker(false); if (d) { if (pickerTarget === 'edit') setEditFormData(p => ({ ...p, dueDate: d })); else setFormData(p => ({ ...p, dueDate: d })); } }}
        />
      )}

      {/* Assigner à */}
      <Modal visible={showAssignPicker} animationType="fade" transparent onRequestClose={() => setShowAssignPicker(false)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowAssignPicker(false)}>
          <View style={styles.pickerModal} onStartShouldSetResponder={() => true}>
            <Text style={styles.pickerTitle}>{t('tasks.assignTo') || 'Assigner à'}</Text>
            <TouchableOpacity style={styles.pickerOption} onPress={() => { if (pickerTarget === 'edit') setEditFormData(p => ({ ...p, assignedTo: undefined })); else setFormData(p => ({ ...p, assignedTo: undefined })); setShowAssignPicker(false); }}>
              <Text style={styles.pickerOptionText}>{t('tasks.noOne')}</Text>
            </TouchableOpacity>
            {members?.filter(m => m.status === 'active').map(m => (
              <TouchableOpacity key={m.id} style={styles.pickerOption} onPress={() => { if (pickerTarget === 'edit') setEditFormData(p => ({ ...p, assignedTo: m.id })); else setFormData(p => ({ ...p, assignedTo: m.id })); setShowAssignPicker(false); }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <AvatarCircle name={m.name || '?'} size={28} color={m.id === user?.id ? '#7c3aed' : '#6b7280'} />
                  <Text style={styles.pickerOptionText}>{m.name || `Membre ${m.id}`}{m.id === user?.id ? ' (moi)' : ''}</Text>
                </View>
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
            {(['none', 'daily', 'weekly', 'monthly', 'yearly'] as Recurrence[]).map(r => (
              <TouchableOpacity key={r} style={styles.pickerOption} onPress={() => { if (pickerTarget === 'edit') setEditFormData(p => ({ ...p, recurrence: r })); else setFormData(p => ({ ...p, recurrence: r })); setShowRecurrencePicker(false); }}>
                <Text style={styles.pickerOptionText}>{getRecurrenceLabel(r)}</Text>
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
            {(['urgent', 'high', 'medium', 'low'] as Priority[]).map(p => (
              <TouchableOpacity key={p} style={styles.pickerOption} onPress={() => { if (pickerTarget === 'edit') setEditFormData(d => ({ ...d, priority: p })); else setFormData(d => ({ ...d, priority: p })); setShowPriorityPicker(false); }}>
                <Text style={styles.pickerOptionText}>{getPriorityEmoji(p)} {getPriorityLabel(p)}</Text>
                <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(p) }]} />
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
            {[{ label: '+ 1 jour', days: 1 }, { label: '+ 2 jours', days: 2 }, { label: '+ 3 jours', days: 3 }, { label: '+ 1 semaine', days: 7 }, { label: '+ 2 semaines', days: 14 }, { label: '+ 1 mois', days: 30 }].map(({ label, days }) => (
              <TouchableOpacity key={days} style={styles.pickerOption} onPress={() => { if (selectedTask) postponeMutation.mutate({ taskId: selectedTask.id, days }); }}>
                <Text style={styles.pickerOptionText}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
function getStyles(isDark: boolean) {
  const bg = isDark ? '#111827' : '#f9fafb';
  const card = isDark ? '#1f2937' : '#ffffff';
  const text = isDark ? '#f9fafb' : '#111827';
  const subtext = isDark ? '#9ca3af' : '#6b7280';
  const border = isDark ? '#374151' : '#e5e7eb';
  const inputBg = isDark ? '#111827' : '#f3f4f6';

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: bg },

    pageTitleContainer: { backgroundColor: card, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: border, alignItems: 'center' },
    pageTitle: { fontSize: 22, fontWeight: 'bold', color: text },

    filterContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: card, paddingHorizontal: 10, paddingVertical: 8, gap: 6, borderBottomWidth: 1, borderBottomColor: border },
    filterTab: { flex: 1, paddingVertical: 8, paddingHorizontal: 4, borderRadius: 8, backgroundColor: isDark ? '#374151' : '#f3f4f6', alignItems: 'center' },
    filterTabActive: { backgroundColor: '#7c3aed' },
    filterText: { fontSize: 12, color: subtext, fontWeight: '600', textAlign: 'center' },
    filterTextActive: { color: '#fff', fontWeight: '700' },
    filterAddBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' },
    filterAddBtnText: { color: '#fff', fontSize: 22, fontWeight: '300', lineHeight: 26 },

    content: { flex: 1 },

    // Sections
    sectionToday: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 10, marginTop: 10, marginBottom: 4, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#7c3aed' },
    sectionUpcoming: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 10, marginTop: 10, marginBottom: 4, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: card, borderWidth: 1, borderColor: border },
    sectionTodayIcon: { fontSize: 16, marginRight: 8 },
    sectionTodayTitle: { fontSize: 14, fontWeight: 'bold', color: '#fff', flex: 1 },
    sectionRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sectionBadge: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
    sectionBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    sectionEmpty: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
    sectionChevron: { color: '#fff', fontSize: 12 },

    dateGroupHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 14, marginTop: 6 },
    dateGroupLabel: { fontSize: 12, fontWeight: '700', color: '#7c3aed', flex: 1, textTransform: 'capitalize' },
    dateGroupCount: { fontSize: 12, color: subtext },

    // Carte tâche
    taskCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: card, borderRadius: 12, marginHorizontal: 10, marginBottom: 8, overflow: 'hidden', borderWidth: 1, borderColor: border },
    priorityBar: { width: 4, alignSelf: 'stretch' },
    taskCheckbox: { padding: 12 },
    checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' },
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
    pointsText: { fontSize: 11, color: '#7c3aed', fontWeight: '600' },

    // Avatar zone
    avatarZone: { padding: 10 },
    avatarEmpty: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
    avatarEmptyText: { fontSize: 16, color: subtext },

    // État vide
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
    loadingText: { color: subtext, marginTop: 12 },
    emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
    emptyStateEmoji: { fontSize: 48, marginBottom: 12 },
    emptyStateText: { fontSize: 16, color: subtext, textAlign: 'center', marginBottom: 20 },

    // Dialog actions rapides
    quickOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    quickDialog: { backgroundColor: card, borderRadius: 20, padding: 20, width: '88%', maxWidth: 380 },
    quickTaskTitle: { fontSize: 17, fontWeight: 'bold', color: text, marginBottom: 12 },
    quickDivider: { height: 1, backgroundColor: border, marginVertical: 10 },
    quickAssignRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    quickAssignLabel: { fontSize: 13, color: subtext },
    quickAssignName: { fontSize: 14, fontWeight: '600', color: text },
    quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 4 },
    quickBtn: { alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, minWidth: 70 },
    quickBtnIcon: { fontSize: 22, marginBottom: 4 },
    quickBtnLabel: { fontSize: 11, color: '#fff', fontWeight: '600' },

    // Modaux
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: card, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%' },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderBottomWidth: 1, borderBottomColor: border },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: text, flex: 1 },
    modalBody: { paddingHorizontal: 18, paddingTop: 12, maxHeight: 520 },

    // Boutons icônes header modal
    iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    iconBtnText: { fontSize: 16, fontWeight: 'bold', color: '#374151' },

    // Formulaire
    formGroup: { marginBottom: 14 },
    label: { fontSize: 13, fontWeight: '600', color: text, marginBottom: 5 },
    input: { backgroundColor: inputBg, borderRadius: 10, padding: 11, fontSize: 15, color: text, borderWidth: 1, borderColor: border },
    textArea: { height: 76, textAlignVertical: 'top' },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    pickerButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: inputBg, borderRadius: 10, padding: 11, borderWidth: 1, borderColor: border },
    pickerButtonText: { fontSize: 15, color: text, flex: 1 },
    pickerArrow: { fontSize: 13, color: subtext },
    priorityDot: { width: 12, height: 12, borderRadius: 6 },

    // Pickers modaux
    pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    pickerModal: { backgroundColor: card, borderRadius: 16, padding: 18, width: '85%', maxHeight: '70%' },
    pickerTitle: { fontSize: 17, fontWeight: 'bold', color: text, marginBottom: 12 },
    pickerOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 6, borderRadius: 8, marginBottom: 2 },
    pickerOptionText: { fontSize: 16, color: text }});
}
