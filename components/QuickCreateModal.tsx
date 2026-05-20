/**
 * QuickCreateModal — modal de saisie rapide accessible depuis le bouton +
 * Ouvre un formulaire léger par-dessus la page courante, sans navigation.
 * Types supportés : event | task | note | expense | request
 */
import React, { useState, useMemo, useEffect } from 'react';
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
  { value: 'Alimentation', label: '🛒 Alimentation' },
  { value: 'Transport', label: '🚗 Transport' },
  { value: 'Loisirs', label: '😊 Loisirs' },
  { value: 'Santé', label: '❤️ Santé' },
  { value: 'Éducation', label: '🎓 Éducation' },
  { value: 'Logement', label: '🏠 Logement' },
  { value: 'Vêtements', label: '👕 Vêtements' },
  { value: 'Autre', label: '💼 Autre' },
];

const INCOME_CATEGORIES = [
  { value: 'Salaire', label: '💼 Salaire' },
  { value: 'Allocation', label: '🏦 Allocation' },
  { value: 'Cadeau', label: '🎁 Cadeau' },
  { value: 'Autre', label: '💰 Autre' },
];

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

const RECURRENCES = [
  { value: 'none', label: '🚫 Aucune' },
  { value: 'daily', label: '📅 Quotidienne' },
  { value: 'weekly', label: '📆 Hebdomadaire' },
  { value: 'monthly', label: '🗓️ Mensuelle' },
  { value: 'yearly', label: '🎉 Annuelle' },
] as const;

const REMINDER_OPTIONS = [
  { value: '0', label: 'Aucun' },
  { value: '5', label: '5 minutes' },
  { value: '15', label: '15 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '60', label: '1 heure' },
  { value: '120', label: '2 heures' },
  { value: '1440', label: '1 jour' },
  { value: '10080', label: '1 semaine' },
] as const;

// ── Composant Dropdown générique ─────────────────────────────────────────────
interface DropdownProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  isDark: boolean;
  styles: any;
}
function Dropdown({ label, value, options, onChange, isDark, styles }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.dropdown} onPress={() => setOpen(v => !v)}>
        <Text style={styles.dropdownText}>{selected?.label ?? value}</Text>
        <Text style={{ color: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }}>▼</Text>
      </TouchableOpacity>
      {open && (
        <View style={styles.dropdownMenu}>
          {options.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.dropdownOption, opt.value === value && styles.dropdownOptionActive]}
              onPress={() => { onChange(opt.value); setOpen(false); }}
            >
              <Text style={[styles.dropdownOptionText, opt.value === value && { color: '#7c3aed', fontWeight: '700' }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function QuickCreateModal({ visible, type, onClose }: QuickCreateModalProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { user } = useAuth();
  const { activeFamilyId: ctxFamilyId } = useFamily();
  const styles = getStyles(isDark);

  // ── Settings utilisateur (rappel par défaut) ──
  const { data: userSettings } = (trpc.settings as any).get?.useQuery?.(undefined, { enabled: visible }) || { data: null };
  const defaultReminderStr = String((userSettings as any)?.eventReminderMinutes ?? 15);

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
    { enabled: visible && !!activeFamilyId && (type === 'task' || type === 'expense' || type === 'event') }
  );

  // ── Budget catégories custom ──
  const { data: customCats = [] } = trpc.budget.listCategories.useQuery(
    { familyId: activeFamilyId },
    { enabled: visible && type === 'expense' && !!activeFamilyId }
  );
  // ── États communs ──
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // ── Événement ──
  const [eventCategory, setEventCategory] = useState('other');
  const [eventDate, setEventDate] = useState(new Date());
  const [eventEndDate, setEventEndDate] = useState(new Date()); // pour multi-jours
  const [isAllDay, setIsAllDay] = useState(false);
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [startTime, setStartTime] = useState(() => { const d = new Date(); d.setHours(9, 0, 0, 0); return d; });
  const [endTime, setEndTime] = useState(() => { const d = new Date(); d.setHours(10, 0, 0, 0); return d; });
  const [showEventDatePicker, setShowEventDatePicker] = useState(false);
  const [showEventEndDatePicker, setShowEventEndDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [eventPrivate, setEventPrivate] = useState(false);
  const [eventReminder, setEventReminder] = useState('15');
  // ── Time picker modal iOS robuste ──
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [timePickerTarget, setTimePickerTarget] = useState<'start' | 'end'>('start');
  const [tempTimeValue, setTempTimeValue] = useState(new Date());
  // ── Date picker modal iOS robuste ──
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [datePickerTarget, setDatePickerTarget] = useState<'event' | 'eventEnd' | 'task' | 'expense' | 'request'>('event');
  const [tempDateValue, setTempDateValue] = useState(new Date());

  // ── Tâche ──
  const [taskPriority, setTaskPriority] = useState<'urgent' | 'high' | 'medium' | 'low'>('medium');
  const [taskAssignedTo, setTaskAssignedTo] = useState<number | undefined>(undefined);
  const [taskDueDate, setTaskDueDate] = useState<Date | undefined>(undefined);
  const [showTaskDatePicker, setShowTaskDatePicker] = useState(false);
  const [taskPrivate, setTaskPrivate] = useState(false);
  const [taskRecurrence, setTaskRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('none');

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

  // ── Sync rappel depuis settings ──
  useEffect(() => {
    if (userSettings) setEventReminder(defaultReminderStr);
  }, [defaultReminderStr]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Reset & fermeture ──
  const handleClose = () => {
    setTitle(''); setDescription('');
    setEventCategory('other'); setEventDate(new Date()); setEventEndDate(new Date());
    setIsAllDay(false); setIsMultiDay(false);
    const s = new Date(); s.setHours(9, 0, 0, 0); setStartTime(s);
    const e = new Date(); e.setHours(10, 0, 0, 0); setEndTime(e);
    setEventPrivate(false); setEventReminder(defaultReminderStr);
    setTaskPriority('medium'); setTaskAssignedTo(undefined); setTaskDueDate(undefined);
    setTaskPrivate(false); setTaskRecurrence('none');
    setNotePrivate(false);
    setExpenseType('expense'); setExpenseAmount(''); setExpenseCategory('');
    setExpenseDate(new Date()); setExpensePrivate(false);
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
        const startDateStr = format(eventDate, 'yyyy-MM-dd');
        let startDateTime: Date;
        let endDateTime: Date;

        if (isAllDay) {
          // Jour entier : 00:00 → 23:59
          startDateTime = new Date(`${startDateStr}T00:00:00`);
          const endDateStr = isMultiDay ? format(eventEndDate, 'yyyy-MM-dd') : startDateStr;
          endDateTime = new Date(`${endDateStr}T23:59:00`);
        } else {
          startDateTime = new Date(`${startDateStr}T${format(startTime, 'HH:mm')}:00`);
          const endDateStr = isMultiDay ? format(eventEndDate, 'yyyy-MM-dd') : startDateStr;
          endDateTime = new Date(`${endDateStr}T${format(endTime, 'HH:mm')}:00`);
        }

        const durationMinutes = Math.max(1, Math.round((endDateTime.getTime() - startDateTime.getTime()) / 60000));
        createEvent.mutate({
          title: title.trim(),
          description: description.trim() || undefined,
          startDate: format(startDateTime, 'yyyy-MM-dd HH:mm:ss'),
          endDate: format(endDateTime, 'yyyy-MM-dd HH:mm:ss'),
          durationMinutes,
          category: eventCategory,
          reminderMinutes: parseInt(eventReminder),
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
          recurrence: taskRecurrence,
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
    event: `📅 ${t('calendar.addEvent')}`,
    task: `✅ ${t('tasks.addTask')}`,
    note: `📝 ${t('notes.newNote')}`,
    expense: `💰 ${t('budget.addExpense')}`,
    request: `🙋 ${t('requests.newRequest')}`,
  };

  // ── Membres pour dropdown ──
  const activeMembers = (members as any[]).filter((m: any) => m.status === 'active');
  const memberOptions = [
    { value: '0', label: `👤 ${t('tasks.unassigned')}` },
    ...activeMembers.map((m: any) => ({ value: String(m.id), label: m.name || 'Membre' })),
  ];

  // ── Rendu formulaire ──
  const renderForm = () => {
    switch (type) {
      case 'event':
        return (
          <>
            <Text style={styles.label}>{t('common.title')} *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder={t('calendar.addEvent')}
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
            />
            <Text style={styles.label}>{t('common.description')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={2}
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
            />
            <Dropdown
              label={t('calendar.category')}
              value={eventCategory}
              options={EVENT_CATEGORIES.map(c => ({ value: c.value, label: `${c.icon} ${c.label}` }))}
              onChange={setEventCategory}
              isDark={isDark}
              styles={styles}
            />

            {/* Options jour entier + multi-jours */}
            <View style={styles.switchRow}>
              <Text style={styles.label}>🌅 {t('calendar.allDay')}</Text>
              <Switch
                value={isAllDay}
                onValueChange={setIsAllDay}
                trackColor={{ false: '#d1d5db', true: '#7c3aed' }}
                thumbColor={isAllDay ? '#fff' : '#f3f4f6'}
              />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.label}>📆 {t('calendar.multiDay') || 'Plusieurs jours'}</Text>
              <Switch
                value={isMultiDay}
                onValueChange={setIsMultiDay}
                trackColor={{ false: '#d1d5db', true: '#7c3aed' }}
                thumbColor={isMultiDay ? '#fff' : '#f3f4f6'}
              />
            </View>

            {/* Date de début */}
            <Text style={styles.label}>Date {isMultiDay ? 'de début' : ''}</Text>
            <TouchableOpacity style={styles.dateBtn} onPress={() => {
              if (Platform.OS === 'ios') { setDatePickerTarget('event'); setTempDateValue(eventDate); setShowDatePickerModal(true); }
              else setShowEventDatePicker(true);
            }}>
              <Text style={styles.dateBtnText}>📅 {format(eventDate, 'dd/MM/yyyy')}</Text>
            </TouchableOpacity>
            {Platform.OS === 'android' && showEventDatePicker && (
              <DateTimePicker
                value={eventDate}
                mode="date"
                display="default"
                onChange={(_, d) => { setShowEventDatePicker(false); if (d) setEventDate(d); }}
              />
            )}

            {/* Date de fin (multi-jours) */}
            {isMultiDay && (
              <>
                <Text style={styles.label}>{t('calendar.endDate') || 'Date de fin'}</Text>
                <TouchableOpacity style={styles.dateBtn} onPress={() => {
                  if (Platform.OS === 'ios') { setDatePickerTarget('eventEnd'); setTempDateValue(eventEndDate); setShowDatePickerModal(true); }
                  else setShowEventEndDatePicker(true);
                }}>
                  <Text style={styles.dateBtnText}>📅 {format(eventEndDate, 'dd/MM/yyyy')}</Text>
                </TouchableOpacity>
                {Platform.OS === 'android' && showEventEndDatePicker && (
                  <DateTimePicker
                    value={eventEndDate}
                    mode="date"
                    display="default"
                    minimumDate={eventDate}
                    onChange={(_, d) => { setShowEventEndDatePicker(false); if (d) setEventEndDate(d); }}
                  />
                )}
              </>
            )}

            {/* Heures (seulement si pas jour entier) */}
            {!isAllDay && (
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>{t('calendar.startTime')}</Text>
                  <TouchableOpacity
                    style={styles.dateBtn}
                    onPress={() => {
                      setTempTimeValue(startTime);
                      setTimePickerTarget('start');
                      if (Platform.OS === 'ios') {
                        setShowTimePickerModal(true);
                      } else {
                        setShowStartTimePicker(true);
                      }
                    }}
                  >
                    <Text style={styles.dateBtnText}>🕐 {format(startTime, 'HH:mm')}</Text>
                  </TouchableOpacity>
                  {Platform.OS === 'android' && showStartTimePicker && (
                    <DateTimePicker
                      value={startTime}
                      mode="time"
                      is24Hour
                      display="default"
                      onChange={(_, d) => {
                        setShowStartTimePicker(false);
                        if (d) {
                          setStartTime(d);
                          // Heure de fin auto = début + 1h si fin <= début
                          if (endTime <= d) {
                            const newEnd = new Date(d.getTime() + 60 * 60 * 1000);
                            setEndTime(newEnd);
                          }
                        }
                      }}
                    />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>{t('calendar.endTime')}</Text>
                  <TouchableOpacity
                    style={styles.dateBtn}
                    onPress={() => {
                      setTempTimeValue(endTime);
                      setTimePickerTarget('end');
                      if (Platform.OS === 'ios') {
                        setShowTimePickerModal(true);
                      } else {
                        setShowEndTimePicker(true);
                      }
                    }}
                  >
                    <Text style={styles.dateBtnText}>🕐 {format(endTime, 'HH:mm')}</Text>
                  </TouchableOpacity>
                  {Platform.OS === 'android' && showEndTimePicker && (
                    <DateTimePicker
                      value={endTime}
                      mode="time"
                      is24Hour
                      display="default"
                      onChange={(_, d) => { setShowEndTimePicker(false); if (d) setEndTime(d); }}
                    />
                  )}
                </View>
              </View>
            )}

            {/* Rappel */}
            <Dropdown
              label={`🔔 ${t('calendar.reminder')}`}
              value={eventReminder}
              options={REMINDER_OPTIONS as unknown as { value: string; label: string }[]}
              onChange={setEventReminder}
              isDark={isDark}
              styles={styles}
            />

            <View style={styles.switchRow}>
              <Text style={styles.label}>🔒 {t('common.private')}</Text>
              <Switch
                value={eventPrivate}
                onValueChange={setEventPrivate}
                trackColor={{ false: '#d1d5db', true: '#7c3aed' }}
                thumbColor={eventPrivate ? '#fff' : '#f3f4f6'}
              />
            </View>
          </>
        );

      case 'task':
        return (
          <>
            <Text style={styles.label}>{t('common.title')} *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder={t('tasks.titlePlaceholder')}
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
            />
                        <Text style={styles.label}>{t('common.description')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={2}
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
            />
            {/* Priorité — dropdown */}
            <Dropdown
              label={t('tasks.priority')}
              value={taskPriority}
              options={PRIORITIES as unknown as { value: string; label: string }[]}
              onChange={(v) => setTaskPriority(v as any)}
              isDark={isDark}
              styles={styles}
            />

            {/* Assigner à — dropdown */}
            {activeMembers.length > 0 && (
              <Dropdown
                label={t('tasks.assignedTo')}
                value={taskAssignedTo ? String(taskAssignedTo) : '0'}
                options={memberOptions}
                onChange={(v) => setTaskAssignedTo(v === '0' ? undefined : parseInt(v))}
                isDark={isDark}
                styles={styles}
              />
            )}

            {/* Récurrence — dropdown */}
            <Dropdown
              label={t('tasks.recurrence')}
              value={taskRecurrence}
              options={RECURRENCES as unknown as { value: string; label: string }[]}
              onChange={(v) => setTaskRecurrence(v as any)}
              isDark={isDark}
              styles={styles}
            />

            <Text style={styles.label}>{t('tasks.dueDate')}</Text>
            <TouchableOpacity style={styles.dateBtn} onPress={() => {
              if (Platform.OS === 'ios') { setDatePickerTarget('task'); setTempDateValue(taskDueDate || new Date()); setShowDatePickerModal(true); }
              else setShowTaskDatePicker(true);
            }}>
              <Text style={styles.dateBtnText}>📅 {taskDueDate ? format(taskDueDate, 'dd/MM/yyyy') : t('tasks.chooseDate')}</Text>
            </TouchableOpacity>
            {Platform.OS === 'android' && showTaskDatePicker && (
              <DateTimePicker
                value={taskDueDate || new Date()}
                mode="date"
                display="default"
                onChange={(_, d) => { setShowTaskDatePicker(false); if (d) setTaskDueDate(d); }}
              />
            )}

            <View style={styles.switchRow}>
              <Text style={styles.label}>🔒 {t('common.private')}</Text>
              <Switch
                value={taskPrivate}
                onValueChange={setTaskPrivate}
                trackColor={{ false: '#d1d5db', true: '#7c3aed' }}
                thumbColor={taskPrivate ? '#fff' : '#f3f4f6'}
              />
            </View>
          </>
        );

      case 'note':
        return (
          <>
            <Text style={styles.label}>{t('common.title')} *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder={t('notes.titlePlaceholder')}
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
            />
            <Text style={styles.label}>{t('notes.content')}</Text>
            <TextInput
              style={[styles.input, { minHeight: 100, textAlignVertical: 'top' }]}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              placeholder={t('notes.contentPlaceholder')}
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
            />
            <View style={styles.switchRow}>
              <Text style={styles.label}>🔒 {t('common.private')}</Text>
              <Switch
                value={notePrivate}
                onValueChange={setNotePrivate}
                trackColor={{ false: '#d1d5db', true: '#7c3aed' }}
                thumbColor={notePrivate ? '#fff' : '#f3f4f6'}
              />
            </View>
          </>
        );

      case 'expense':
        return (
          <>
            <Text style={styles.label}>{t('budget.expense')}</Text>
            <View style={[styles.row, { marginBottom: 12 }]}>
              <TouchableOpacity
                onPress={() => setExpenseType('expense')}
                style={[styles.typeBtn, expenseType === 'expense' && styles.typeBtnExpense]}
              >
                <Text style={[styles.typeBtnText, expenseType === 'expense' && { color: '#fff' }]}>📉 Dépense</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setExpenseType('income')}
                style={[styles.typeBtn, { marginRight: 0 }, expenseType === 'income' && styles.typeBtnIncome]}
              >
                <Text style={[styles.typeBtnText, expenseType === 'income' && { color: '#fff' }]}>📈 Revenu</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.label}>{t('common.description')}</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder={t('budget.descriptionPlaceholder')}
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
            />
            <Text style={styles.label}>{t('budget.amount')} (CHF) *</Text>
            <TextInput
              style={styles.input}
              value={expenseAmount}
              onChangeText={setExpenseAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
            />
            <Dropdown
              label={`${t('budget.category')} *`}
              value={expenseCategory || ''}
              options={expenseType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES}
              onChange={setExpenseCategory}
              isDark={isDark}
              styles={styles}
            />
            <Text style={styles.label}>{t('budget.date')}</Text>
            <TouchableOpacity style={styles.dateBtn} onPress={() => {
              if (Platform.OS === 'ios') { setDatePickerTarget('expense'); setTempDateValue(expenseDate); setShowDatePickerModal(true); }
              else setShowExpenseDatePicker(true);
            }}>
              <Text style={styles.dateBtnText}>📅 {format(expenseDate, 'dd/MM/yyyy')}</Text>
            </TouchableOpacity>
            {Platform.OS === 'android' && showExpenseDatePicker && (
              <DateTimePicker
                value={expenseDate}
                mode="date"
                display="default"
                onChange={(_, d) => { setShowExpenseDatePicker(false); if (d) setExpenseDate(d); }}
              />
            )}
            <View style={styles.switchRow}>
              <Text style={styles.label}>🔒 {t('common.private')}</Text>
              <Switch
                value={expensePrivate}
                onValueChange={setExpensePrivate}
                trackColor={{ false: '#d1d5db', true: '#7c3aed' }}
                thumbColor={expensePrivate ? '#fff' : '#f3f4f6'}
              />
            </View>
          </>
        );

      case 'request':
        return (
          <>
            <Text style={styles.label}>{t('requests.type')}</Text>
            <View style={[styles.row, { flexWrap: 'wrap', marginBottom: 12 }]}>
              {REQUEST_TYPES.map(rt => (
                <TouchableOpacity
                  key={rt.value}
                  onPress={() => setRequestType(rt.value)}
                  style={[styles.chip, requestType === rt.value && { backgroundColor: rt.color + '33', borderColor: rt.color }]}
                >
                  <Text style={styles.chipText}>{rt.emoji} {rt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>{t('common.title')} *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder={t('requests.titlePlaceholder')}
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
            />
            <Text style={styles.label}>{t('common.description')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={2}
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
            />
            {(requestType === 'outing' || requestType === 'permission') && (
              <>
                <Text style={styles.label}>{t('requests.requestedDate')} *</Text>
                <TouchableOpacity style={styles.dateBtn} onPress={() => {
                  if (Platform.OS === 'ios') { setDatePickerTarget('request'); setTempDateValue(requestDate || new Date()); setShowDatePickerModal(true); }
                  else setShowRequestDatePicker(true);
                }}>
                  <Text style={styles.dateBtnText}>📅 {requestDate ? format(requestDate, 'dd/MM/yyyy') : t('requests.selectDate')}</Text>
                </TouchableOpacity>
                {Platform.OS === 'android' && showRequestDatePicker && (
                  <DateTimePicker
                    value={requestDate || new Date()}
                    mode="date"
                    display="default"
                    onChange={(_, d) => { setShowRequestDatePicker(false); if (d) setRequestDate(d); }}
                  />
                )}
              </>
            )}
          </>
        );
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
        keyboardVerticalOffset={0}
      >
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
          <ScrollView
            style={styles.form}
            contentContainerStyle={styles.formContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
            bounces={false}
          >
            {renderForm()}
            <View style={{ height: 24 }} />
          </ScrollView>
          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
              <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={isPending}>
              {isPending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.submitBtnText}>{t('common.create')}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
      {/* ── Modal Date Picker iOS robuste ── */}
      {Platform.OS === 'ios' && (
        <Modal visible={showDatePickerModal} transparent animationType="fade" onRequestClose={() => setShowDatePickerModal(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ backgroundColor: isDark ? '#1f2937' : '#ffffff', borderRadius: 16, padding: 20, width: 320, alignItems: 'center' }}>
              <Text style={{ color: isDark ? '#f9fafb' : '#111827', fontSize: 16, fontWeight: '600', marginBottom: 12 }}>{t('tasks.chooseDate')}</Text>
              <DateTimePicker
                value={tempDateValue}
                mode="date"
                display="spinner"
                onChange={(_, d) => { if (d) setTempDateValue(d); }}
                textColor={isDark ? '#f9fafb' : '#111827'}
                style={{ width: 280 }}
              />
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                <TouchableOpacity
                  onPress={() => setShowDatePickerModal(false)}
                  style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: isDark ? '#374151' : '#e5e7eb', alignItems: 'center' }}
                >
                  <Text style={{ color: isDark ? '#f9fafb' : '#374151', fontWeight: '600' }}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    if (datePickerTarget === 'event') setEventDate(tempDateValue);
                    else if (datePickerTarget === 'eventEnd') setEventEndDate(tempDateValue);
                    else if (datePickerTarget === 'task') setTaskDueDate(tempDateValue);
                    else if (datePickerTarget === 'expense') setExpenseDate(tempDateValue);
                    else if (datePickerTarget === 'request') setRequestDate(tempDateValue);
                    setShowDatePickerModal(false);
                  }}
                  style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#7c3aed', alignItems: 'center' }}
                >
                  <Text style={{ color: '#ffffff', fontWeight: '600' }}>{t('common.confirm') || 'Confirmer'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
      {/* ── Modal Time Picker iOS robuste ── */}
      {Platform.OS === 'ios' && (
        <Modal visible={showTimePickerModal} transparent animationType="fade" onRequestClose={() => setShowTimePickerModal(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ backgroundColor: isDark ? '#1f2937' : '#ffffff', borderRadius: 16, padding: 20, width: 300, alignItems: 'center' }}>
              <Text style={{ color: isDark ? '#f9fafb' : '#111827', fontSize: 16, fontWeight: '600', marginBottom: 12 }}>
                {timePickerTarget === 'start' ? t('calendar.startTime') : t('calendar.endTime')}
              </Text>
              <DateTimePicker
                value={tempTimeValue}
                mode="time"
                is24Hour
                display="spinner"
                onChange={(_, d) => { if (d) setTempTimeValue(d); }}
                textColor={isDark ? '#f9fafb' : '#111827'}
              />
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                <TouchableOpacity
                  onPress={() => setShowTimePickerModal(false)}
                  style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: isDark ? '#374151' : '#e5e7eb', alignItems: 'center' }}
                >
                  <Text style={{ color: isDark ? '#f9fafb' : '#374151', fontWeight: '600' }}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    if (timePickerTarget === 'start') {
                      setStartTime(tempTimeValue);
                      // Heure de fin auto = début + 1h si fin <= début
                      if (endTime <= tempTimeValue) {
                        setEndTime(new Date(tempTimeValue.getTime() + 60 * 60 * 1000));
                      }
                    } else {
                      setEndTime(tempTimeValue);
                    }
                    setShowTimePickerModal(false);
                  }}
                  style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#10b981', alignItems: 'center' }}
                >
                  <Text style={{ color: '#ffffff', fontWeight: '600' }}>{t('common.confirm') || 'Confirmer'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </Modal>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
function getStyles(isDark: boolean) {
  return StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'transparent' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
    sheet: {
      backgroundColor: isDark ? '#1f2937' : '#fff',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '92%',
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
    form: { paddingHorizontal: 20, paddingTop: 12, flexShrink: 1 },
    formContent: { paddingBottom: 8 },
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
    // Dropdown
    dropdown: {
      backgroundColor: isDark ? '#111827' : '#fff',
      borderWidth: 1.5, borderColor: isDark ? '#fff' : '#374151',
      borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    },
    dropdownText: { fontSize: 14, color: isDark ? '#f9fafb' : '#1f2937', flex: 1 },
    dropdownMenu: {
      backgroundColor: isDark ? '#1f2937' : '#fff',
      borderWidth: 1.5, borderColor: isDark ? '#4b5563' : '#d1d5db',
      borderRadius: 10, marginTop: 4, overflow: 'hidden',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15, shadowRadius: 4, elevation: 4,
    },
    dropdownOption: {
      paddingHorizontal: 14, paddingVertical: 11,
      borderBottomWidth: 1, borderBottomColor: isDark ? '#374151' : '#f3f4f6',
    },
    dropdownOptionActive: { backgroundColor: isDark ? '#312e81' : '#ede9fe' },
    dropdownOptionText: { fontSize: 14, color: isDark ? '#f9fafb' : '#1f2937' },
    // Actions
    actions: {
      flexDirection: 'row', paddingHorizontal: 20, paddingTop: 12,
      paddingBottom: Platform.OS === 'ios' ? 32 : 16, gap: 12,
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
