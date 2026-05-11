/**
 * QuickCreateModal — modal de saisie rapide accessible depuis le bouton +
 * Ouvre un formulaire léger par-dessus la page courante, sans navigation.
 * Types supportés : event | task | note | expense | request
 */
import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, ScrollView,
  StyleSheet, ActivityIndicator, Switch, Alert, Platform, KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { trpc } from '../lib/trpc';
import { useTheme } from '../contexts/ThemeContext';
import { useFamily } from '../contexts/FamilyContext';
import { useAuth } from '../contexts/AuthContext';

export type QuickCreateType = 'event' | 'task' | 'note' | 'expense' | 'request';

interface QuickCreateModalProps {
  visible: boolean;
  type: QuickCreateType;
  onClose: () => void;
}

// ── Constantes ───────────────────────────────────────────────────────────────
const EVENT_CATEGORIES = [
  { value: 'meal', label: 'Repas', icon: '🍽️', color: '#f59e0b' },
  { value: 'birthday', label: 'Anniversaire', icon: '🎂', color: '#ec4899' },
  { value: 'work', label: 'Travail', icon: '💼', color: '#3b82f6' },
  { value: 'personal', label: 'Personnel', icon: '❤️', color: '#ef4444' },
  { value: 'sport', label: 'Sport', icon: '⚽', color: '#10b981' },
  { value: 'other', label: 'Autre', icon: '📅', color: '#6b7280' },
];

const EXPENSE_CATEGORIES = [
  { value: 'Alimentation', emoji: '🛒', color: '#10b981' },
  { value: 'Transport', emoji: '🚗', color: '#3b82f6' },
  { value: 'Loisirs', emoji: '😊', color: '#f59e0b' },
  { value: 'Santé', emoji: '❤️', color: '#ef4444' },
  { value: 'Éducation', emoji: '🎓', color: '#8b5cf6' },
  { value: 'Logement', emoji: '🏠', color: '#6b7280' },
  { value: 'Vêtements', emoji: '👕', color: '#ec4899' },
  { value: 'Autre', emoji: '💼', color: '#64748b' },
];

const INCOME_CATEGORIES = ['Salaire', 'Allocation', 'Cadeau', 'Autre'];

const REQUEST_TYPES = [
  { value: 'outing', label: 'Sortie', emoji: '✈️', color: '#3b82f6' },
  { value: 'purchase', label: 'Achat', emoji: '🛍️', color: '#10b981' },
  { value: 'permission', label: 'Permission', emoji: '🔒', color: '#8b5cf6' },
  { value: 'other', label: 'Autre', emoji: '❓', color: '#6b7280' },
] as const;

const PRIORITIES = [
  { value: 'urgent', label: '🔴 Urgent', color: '#ef4444' },
  { value: 'high', label: '🟠 Haute', color: '#f97316' },
  { value: 'medium', label: '🟡 Moyenne', color: '#eab308' },
  { value: 'low', label: '🟢 Basse', color: '#22c55e' },
] as const;

// ── Composant principal ───────────────────────────────────────────────────────
export default function QuickCreateModal({ visible, type, onClose }: QuickCreateModalProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { user } = useAuth();
  const { activeFamilyId: ctxFamilyId } = useFamily();
  const styles = getStyles(isDark);

  // ── Famille ──
  const { data: families = [] } = trpc.family.list.useQuery(undefined, { enabled: visible });
  const activeFamily = useMemo(() => {
    if (!(families as any[]).length) return undefined;
    if (ctxFamilyId) {
      const found = (families as any[]).find((f: any) => f.id === ctxFamilyId);
      if (found) return found;
    }
    return (families as any[])[0];
  }, [families, ctxFamilyId]);
  const activeFamilyId = activeFamily?.id ?? 0;

  const { data: members = [] } = trpc.family.members.useQuery(
    { familyId: activeFamilyId },
    { enabled: visible && !!activeFamilyId && (type === 'task' || type === 'expense') }
  );

  // ── Budget catégories custom ──
  const { data: customCats = [] } = trpc.budget.listCategories.useQuery(
    { familyId: activeFamilyId },
    { enabled: visible && type === 'expense' && !!activeFamilyId }
  );
  const allExpenseCats = useMemo(() => {
    const dbCats = (customCats as any[]).map((c: any) => ({ value: c.name, emoji: c.icon || '💼', color: c.color || '#64748b' }));
    const custom = dbCats.filter((d: any) => !EXPENSE_CATEGORIES.find(e => e.value === d.value));
    return [...EXPENSE_CATEGORIES, ...custom];
  }, [customCats]);

  // ── États communs ──
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // ── Événement ──
  const [eventCategory, setEventCategory] = useState('other');
  const [eventDate, setEventDate] = useState(new Date());
  const [startTime, setStartTime] = useState(() => { const d = new Date(); d.setHours(9, 0, 0, 0); return d; });
  const [endTime, setEndTime] = useState(() => { const d = new Date(); d.setHours(10, 0, 0, 0); return d; });
  const [showEventDatePicker, setShowEventDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [eventPrivate, setEventPrivate] = useState(false);

  // ── Tâche ──
  const [taskPriority, setTaskPriority] = useState<'urgent' | 'high' | 'medium' | 'low'>('medium');
  const [taskAssignedTo, setTaskAssignedTo] = useState<number | undefined>(undefined);
  const [taskDueDate, setTaskDueDate] = useState<Date | undefined>(undefined);
  const [showTaskDatePicker, setShowTaskDatePicker] = useState(false);
  const [taskPrivate, setTaskPrivate] = useState(false);

  // ── Note ──
  const [notePrivate, setNotePrivate] = useState(false);

  // ── Dépense ──
  const [expenseType, setExpenseType] = useState<'expense' | 'income'>('expense');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [showExpenseDatePicker, setShowExpenseDatePicker] = useState(false);
  const [expenseDate, setExpenseDate] = useState(new Date());
  const [expensePrivate, setExpensePrivate] = useState(false);

  // ── Requête ──
  const [requestType, setRequestType] = useState<'outing' | 'purchase' | 'permission' | 'other'>('outing');
  const [requestDate, setRequestDate] = useState<Date | undefined>(undefined);
  const [showRequestDatePicker, setShowRequestDatePicker] = useState(false);

  // ── Mutations ──
  const utils = trpc.useUtils();

  const createEvent = trpc.events.create.useMutation({
    onSuccess: () => { utils.events.list.invalidate(); handleClose(); },
    onError: (e) => Alert.alert('Erreur', e.message),
  });

  const createTask = trpc.tasks.create.useMutation({
    onSuccess: () => { utils.tasks.list.invalidate(); handleClose(); },
    onError: (e) => Alert.alert('Erreur', e.message),
  });

  const createNote = trpc.notes.create.useMutation({
    onSuccess: () => { utils.notes.list.invalidate(); handleClose(); },
    onError: (e) => Alert.alert('Erreur', e.message),
  });

  const createTx = trpc.budget.createTransaction.useMutation({
    onSuccess: () => { utils.budget.invalidate(); handleClose(); },
    onError: (e) => Alert.alert('Erreur', e.message),
  });

  const createRequest = trpc.requests.create.useMutation({
    onSuccess: () => { utils.requests.list.invalidate(); handleClose(); },
    onError: (e) => Alert.alert('Erreur', e.message),
  });

  const isPending = createEvent.isPending || createTask.isPending || createNote.isPending || createTx.isPending || createRequest.isPending;

  // ── Reset & fermeture ──
  const handleClose = () => {
    setTitle(''); setDescription('');
    setEventCategory('other'); setEventDate(new Date());
    const s = new Date(); s.setHours(9, 0, 0, 0); setStartTime(s);
    const e = new Date(); e.setHours(10, 0, 0, 0); setEndTime(e);
    setEventPrivate(false);
    setTaskPriority('medium'); setTaskAssignedTo(undefined); setTaskDueDate(undefined); setTaskPrivate(false);
    setNotePrivate(false);
    setExpenseType('expense'); setExpenseAmount(''); setExpenseCategory(''); setExpenseDate(new Date()); setExpensePrivate(false);
    setRequestType('outing'); setRequestDate(undefined);
    onClose();
  };

  // ── Soumission ──
  const handleSubmit = () => {
    if (!title.trim() && type !== 'expense') {
      Alert.alert('Erreur', 'Le titre est requis');
      return;
    }

    switch (type) {
      case 'event': {
        const dateStr = format(eventDate, 'yyyy-MM-dd');
        const startDateTime = new Date(`${dateStr}T${format(startTime, 'HH:mm')}:00`);
        const endDateTime = new Date(`${dateStr}T${format(endTime, 'HH:mm')}:00`);
        const durationMinutes = Math.max(1, Math.round((endDateTime.getTime() - startDateTime.getTime()) / 60000));
        createEvent.mutate({
          title: title.trim(),
          description: description.trim() || undefined,
          startDate: format(startDateTime, 'yyyy-MM-dd HH:mm:ss'),
          endDate: format(endDateTime, 'yyyy-MM-dd HH:mm:ss'),
          durationMinutes,
          category: eventCategory,
          reminderMinutes: 15,
          isPrivate: eventPrivate ? 1 : 0,
        });
        break;
      }
      case 'task': {
        createTask.mutate({
          title: title.trim(),
          description: description.trim() || undefined,
          assignedTo: taskAssignedTo,
          dueDate: taskDueDate,
          recurrence: 'none',
          points: 10,
          priority: taskPriority,
          isPrivate: taskPrivate ? 1 : 0,
        });
        break;
      }
      case 'note': {
        createNote.mutate({
          title: title.trim(),
          content: description.trim() || undefined,
          isPrivate: notePrivate,
        });
        break;
      }
      case 'expense': {
        const amount = parseFloat(expenseAmount);
        if (isNaN(amount) || amount <= 0) { Alert.alert('Erreur', 'Montant invalide'); return; }
        if (!expenseCategory) { Alert.alert('Erreur', 'Catégorie requise'); return; }
        createTx.mutate({
          familyId: activeFamilyId,
          type: expenseType,
          amount: Math.round(amount * 100),
          category: expenseCategory,
          description: title.trim() || undefined,
          date: expenseDate,
          isPrivate: expensePrivate ? 1 : 0,
        });
        break;
      }
      case 'request': {
        if ((requestType === 'outing' || requestType === 'permission') && !requestDate) {
          Alert.alert('Erreur', 'Date requise pour ce type de requête');
          return;
        }
        createRequest.mutate({
          type: requestType,
          title: title.trim(),
          description: description.trim() || undefined,
          requestedDate: requestDate,
        });
        break;
      }
    }
  };

  // ── Titres ──
  const TITLES: Record<QuickCreateType, string> = {
    event: '📅 Nouvel événement',
    task: '✅ Nouvelle tâche',
    note: '📝 Nouvelle note',
    expense: '💰 Nouvelle dépense',
    request: '🙋 Nouvelle requête',
  };

  // ── Rendu formulaire ──
  const renderForm = () => {
    switch (type) {
      case 'event':
        return (
          <>
            <Text style={styles.label}>Titre *</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Titre de l'événement" placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'} />
            <Text style={styles.label}>Description</Text>
            <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} multiline numberOfLines={2} placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'} />
            <Text style={styles.label}>Catégorie</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {EVENT_CATEGORIES.map(cat => (
                <TouchableOpacity key={cat.value} onPress={() => setEventCategory(cat.value)}
                  style={[styles.chip, eventCategory === cat.value && { backgroundColor: cat.color + '33', borderColor: cat.color }]}>
                  <Text style={styles.chipText}>{cat.icon} {cat.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.label}>Date</Text>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowEventDatePicker(true)}>
              <Text style={styles.dateBtnText}>📅 {format(eventDate, 'dd/MM/yyyy')}</Text>
            </TouchableOpacity>
            {showEventDatePicker && (
              <DateTimePicker value={eventDate} mode="date" display="default"
                onChange={(_, d) => { setShowEventDatePicker(false); if (d) setEventDate(d); }} />
            )}
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>Début</Text>
                <TouchableOpacity style={styles.dateBtn} onPress={() => setShowStartTimePicker(true)}>
                  <Text style={styles.dateBtnText}>🕐 {format(startTime, 'HH:mm')}</Text>
                </TouchableOpacity>
                {showStartTimePicker && (
                  <DateTimePicker value={startTime} mode="time" is24Hour display="default"
                    onChange={(_, d) => { setShowStartTimePicker(false); if (d) setStartTime(d); }} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Fin</Text>
                <TouchableOpacity style={styles.dateBtn} onPress={() => setShowEndTimePicker(true)}>
                  <Text style={styles.dateBtnText}>🕐 {format(endTime, 'HH:mm')}</Text>
                </TouchableOpacity>
                {showEndTimePicker && (
                  <DateTimePicker value={endTime} mode="time" is24Hour display="default"
                    onChange={(_, d) => { setShowEndTimePicker(false); if (d) setEndTime(d); }} />
                )}
              </View>
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.label}>🔒 Privé</Text>
              <Switch value={eventPrivate} onValueChange={setEventPrivate} trackColor={{ false: '#d1d5db', true: '#7c3aed' }} thumbColor={eventPrivate ? '#fff' : '#f3f4f6'} />
            </View>
          </>
        );

      case 'task':
        return (
          <>
            <Text style={styles.label}>Titre *</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Titre de la tâche" placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'} />
            <Text style={styles.label}>Description</Text>
            <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} multiline numberOfLines={2} placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'} />
            <Text style={styles.label}>Priorité</Text>
            <View style={styles.row}>
              {PRIORITIES.map(p => (
                <TouchableOpacity key={p.value} onPress={() => setTaskPriority(p.value)}
                  style={[styles.chip, taskPriority === p.value && { backgroundColor: p.color + '33', borderColor: p.color }]}>
                  <Text style={styles.chipText}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Assigner à</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <TouchableOpacity onPress={() => setTaskAssignedTo(undefined)}
                style={[styles.chip, !taskAssignedTo && styles.chipActive]}>
                <Text style={styles.chipText}>👤 Personne</Text>
              </TouchableOpacity>
              {(members as any[]).filter((m: any) => m.status === 'active').map((m: any) => (
                <TouchableOpacity key={m.id} onPress={() => setTaskAssignedTo(m.id)}
                  style={[styles.chip, taskAssignedTo === m.id && styles.chipActive]}>
                  <Text style={styles.chipText}>{m.avatarValue || m.name?.charAt(0) || '?'} {m.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.label}>Échéance</Text>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowTaskDatePicker(true)}>
              <Text style={styles.dateBtnText}>📅 {taskDueDate ? format(taskDueDate, 'dd/MM/yyyy') : 'Choisir une date'}</Text>
            </TouchableOpacity>
            {showTaskDatePicker && (
              <DateTimePicker value={taskDueDate || new Date()} mode="date" display="default"
                onChange={(_, d) => { setShowTaskDatePicker(false); if (d) setTaskDueDate(d); }} />
            )}
            <View style={styles.switchRow}>
              <Text style={styles.label}>🔒 Privé</Text>
              <Switch value={taskPrivate} onValueChange={setTaskPrivate} trackColor={{ false: '#d1d5db', true: '#7c3aed' }} thumbColor={taskPrivate ? '#fff' : '#f3f4f6'} />
            </View>
          </>
        );

      case 'note':
        return (
          <>
            <Text style={styles.label}>Titre *</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Titre de la note" placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'} />
            <Text style={styles.label}>Contenu</Text>
            <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} multiline numberOfLines={4} placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'} />
            <View style={styles.switchRow}>
              <Text style={styles.label}>🔒 Privé</Text>
              <Switch value={notePrivate} onValueChange={setNotePrivate} trackColor={{ false: '#d1d5db', true: '#7c3aed' }} thumbColor={notePrivate ? '#fff' : '#f3f4f6'} />
            </View>
          </>
        );

      case 'expense':
        return (
          <>
            <Text style={styles.label}>Description</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Description (optionnel)" placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'} />
            <Text style={styles.label}>Type</Text>
            <View style={[styles.row, { marginBottom: 12 }]}>
              <TouchableOpacity onPress={() => setExpenseType('expense')}
                style={[styles.typeBtn, expenseType === 'expense' && styles.typeBtnExpense]}>
                <Text style={[styles.typeBtnText, expenseType === 'expense' && { color: '#fff' }]}>📉 Dépense</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setExpenseType('income')}
                style={[styles.typeBtn, expenseType === 'income' && styles.typeBtnIncome]}>
                <Text style={[styles.typeBtnText, expenseType === 'income' && { color: '#fff' }]}>📈 Revenu</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.label}>Montant *</Text>
            <TextInput style={styles.input} value={expenseAmount} onChangeText={setExpenseAmount}
              placeholder="0.00" keyboardType="decimal-pad" placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'} />
            <Text style={styles.label}>Catégorie *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {(expenseType === 'income'
                ? INCOME_CATEGORIES.map(v => ({ value: v, emoji: '💵', color: '#10b981' }))
                : allExpenseCats
              ).map((cat: any) => (
                <TouchableOpacity key={cat.value} onPress={() => setExpenseCategory(cat.value)}
                  style={[styles.chip, expenseCategory === cat.value && styles.chipActive]}>
                  <Text style={styles.chipText}>{cat.emoji} {cat.value}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.label}>Date</Text>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowExpenseDatePicker(true)}>
              <Text style={styles.dateBtnText}>📅 {format(expenseDate, 'dd/MM/yyyy')}</Text>
            </TouchableOpacity>
            {showExpenseDatePicker && (
              <DateTimePicker value={expenseDate} mode="date" display="default"
                onChange={(_, d) => { setShowExpenseDatePicker(false); if (d) setExpenseDate(d); }} />
            )}
            <View style={styles.switchRow}>
              <Text style={styles.label}>🔒 Privé</Text>
              <Switch value={expensePrivate} onValueChange={setExpensePrivate} trackColor={{ false: '#d1d5db', true: '#7c3aed' }} thumbColor={expensePrivate ? '#fff' : '#f3f4f6'} />
            </View>
          </>
        );

      case 'request':
        return (
          <>
            <Text style={styles.label}>Type</Text>
            <View style={[styles.row, { flexWrap: 'wrap', marginBottom: 12 }]}>
              {REQUEST_TYPES.map(rt => (
                <TouchableOpacity key={rt.value} onPress={() => setRequestType(rt.value)}
                  style={[styles.chip, requestType === rt.value && { backgroundColor: rt.color + '33', borderColor: rt.color }]}>
                  <Text style={styles.chipText}>{rt.emoji} {rt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Titre *</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Titre de la requête" placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'} />
            <Text style={styles.label}>Description</Text>
            <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} multiline numberOfLines={2} placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'} />
            {(requestType === 'outing' || requestType === 'permission') && (
              <>
                <Text style={styles.label}>Date *</Text>
                <TouchableOpacity style={styles.dateBtn} onPress={() => setShowRequestDatePicker(true)}>
                  <Text style={styles.dateBtnText}>📅 {requestDate ? format(requestDate, 'dd/MM/yyyy') : 'Choisir une date'}</Text>
                </TouchableOpacity>
                {showRequestDatePicker && (
                  <DateTimePicker value={requestDate || new Date()} mode="date" display="default"
                    onChange={(_, d) => { setShowRequestDatePicker(false); if (d) setRequestDate(d); }} />
                )}
              </>
            )}
          </>
        );
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{TITLES[type]}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
          {/* Formulaire */}
          <ScrollView style={styles.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {renderForm()}
            <View style={{ height: 20 }} />
          </ScrollView>
          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
              <Text style={styles.cancelBtnText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={isPending}>
              {isPending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.submitBtnText}>Créer</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
function getStyles(isDark: boolean) {
  return StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
    sheet: {
      backgroundColor: isDark ? '#1f2937' : '#fff',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '90%',
      paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    },
    handle: {
      width: 40, height: 4, backgroundColor: '#d1d5db', borderRadius: 2,
      alignSelf: 'center', marginTop: 12, marginBottom: 4,
    },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 20, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: isDark ? '#374151' : '#f3f4f6',
    },
    headerTitle: { fontSize: 17, fontWeight: '700', color: isDark ? '#f9fafb' : '#1f2937' },
    closeBtn: { padding: 4 },
    closeBtnText: { fontSize: 18, color: '#6b7280' },
    form: { paddingHorizontal: 20, paddingTop: 12 },
    label: { fontSize: 13, fontWeight: '600', color: isDark ? '#d1d5db' : '#374151', marginBottom: 6, marginTop: 10 },
    input: {
      backgroundColor: isDark ? '#111827' : '#fff',
      borderWidth: 1.5, borderColor: isDark ? '#fff' : '#374151',
      borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
      fontSize: 15, color: isDark ? '#f9fafb' : '#1f2937',
    },
    textArea: { minHeight: 72, textAlignVertical: 'top' },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
      borderWidth: 1.5, borderColor: isDark ? '#4b5563' : '#d1d5db',
      backgroundColor: isDark ? '#111827' : '#f9fafb', marginRight: 6, marginBottom: 4,
    },
    chipActive: { backgroundColor: '#7c3aed33', borderColor: '#7c3aed' },
    chipText: { fontSize: 13, color: isDark ? '#f9fafb' : '#374151' },
    dateBtn: {
      backgroundColor: isDark ? '#111827' : '#f9fafb',
      borderWidth: 1.5, borderColor: isDark ? '#fff' : '#374151',
      borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 4,
    },
    dateBtnText: { fontSize: 14, color: isDark ? '#f9fafb' : '#374151' },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
    typeBtn: {
      flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5,
      borderColor: isDark ? '#4b5563' : '#d1d5db', alignItems: 'center', marginRight: 8,
    },
    typeBtnExpense: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
    typeBtnIncome: { backgroundColor: '#10b981', borderColor: '#10b981' },
    typeBtnText: { fontSize: 14, fontWeight: '600', color: isDark ? '#f9fafb' : '#374151' },
    actions: {
      flexDirection: 'row', paddingHorizontal: 20, paddingTop: 12, gap: 12,
      borderTopWidth: 1, borderTopColor: isDark ? '#374151' : '#f3f4f6',
    },
    cancelBtn: {
      flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5,
      borderColor: isDark ? '#4b5563' : '#d1d5db', alignItems: 'center',
    },
    cancelBtnText: { fontSize: 15, fontWeight: '600', color: isDark ? '#d1d5db' : '#6b7280' },
    submitBtn: {
      flex: 2, paddingVertical: 13, borderRadius: 12,
      backgroundColor: '#7c3aed', alignItems: 'center',
    },
    submitBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  });
}
