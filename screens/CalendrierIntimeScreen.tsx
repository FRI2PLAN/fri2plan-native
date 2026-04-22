import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert, Modal, TextInput,
  KeyboardAvoidingView, Platform, Pressable, Switch
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { trpc } from '../lib/trpc';

interface CalendrierIntimeScreenProps {
  onNavigate?: (screen: string) => void;
  onPrevious?: () => void;
  onNext?: () => void;
}

const getMoodOptions = (t: (k: string) => string) => [
  { value: 'great',    label: t('intimate.moodGreat'),    emoji: '😄' },
  { value: 'good',     label: t('intimate.moodGood'),     emoji: '🙂' },
  { value: 'neutral',  label: t('intimate.moodNeutral'),  emoji: '😐' },
  { value: 'bad',      label: t('intimate.moodBad'),      emoji: '😔' },
  { value: 'terrible', label: t('intimate.moodTerrible'), emoji: '😢' },
];

const getFlowOptions = (t: (k: string) => string) => [
  { value: 'light',  label: t('intimate.flowLight'),  emoji: '💧' },
  { value: 'medium', label: t('intimate.flowMedium'), emoji: '💧💧' },
  { value: 'heavy',  label: t('intimate.flowHeavy'),  emoji: '💧💧💧' },
];

const getSymptomOptions = (t: (k: string) => string) => [
  t('intimate.symptomCramps'),
  t('intimate.symptomHeadache'),
  t('intimate.symptomFatigue'),
  t('intimate.symptomBloating'),
  t('intimate.symptomNausea'),
  t('intimate.symptomBackPain'),
  t('intimate.symptomMoodSwings'),
  t('intimate.symptomAcne'),
];

const PHASE_COLORS = {
  menstruation: '#ec4899',
  follicular:   '#f9a8d4',
  fertility:    '#86efac',
  ovulation:    '#4ade80',
  luteal:       '#93c5fd',
};

export default function CalendrierIntimeScreen({ onNavigate, onPrevious, onNext }: CalendrierIntimeScreenProps) {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const MOOD_OPTIONS = getMoodOptions(t);
  const FLOW_OPTIONS = getFlowOptions(t);
  const SYMPTOM_OPTIONS = getSymptomOptions(t);
  const styles = getStyles(isDark);

  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'settings'>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [newCycleOpen, setNewCycleOpen] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string>('');
  const [selectedFlow, setSelectedFlow] = useState<string>('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [cycleNotes, setCycleNotes] = useState('');
  const [cycleDate, setCycleDate] = useState(new Date().toISOString().slice(0, 10));
  const [settingsCycleDuration, setSettingsCycleDuration] = useState('28');
  const [settingsPeriodDuration, setSettingsPeriodDuration] = useState('5');

  const utils = trpc.useUtils();

  const { data: settings, isLoading: settingsLoading } = trpc.menstrual.getSettings.useQuery();
  const { data: cycles = [], isLoading: cyclesLoading } = trpc.menstrual.getCycles.useQuery(
    { limit: 12 }, { enabled: !!(settings as any)?.isEnabled }
  );

  const toggleMutation = trpc.menstrual.toggleFeature.useMutation({
    onSuccess: () => utils.menstrual.getSettings.invalidate(),
    onError: (e: any) => Alert.alert(t('common.error'), e.message || t('common.error'))
  });

  const updateSettingsMutation = trpc.menstrual.updateSettings.useMutation({
    onSuccess: () => {
      utils.menstrual.getSettings.invalidate();
      Alert.alert('✅', t('intimate.settingsSaved'));
    },
    onError: (e: any) => Alert.alert(t('common.error'), e.message || t('common.error'))
  });

  const createCycleMutation = trpc.menstrual.createCycle.useMutation({
    onSuccess: () => {
      utils.menstrual.getCycles.invalidate();
      utils.menstrual.getSettings.invalidate();
      setNewCycleOpen(false);
      setSelectedMood(''); setSelectedFlow(''); setSelectedSymptoms([]); setCycleNotes('');
      Alert.alert('✅', t('intimate.newCycleSuccess'));
    },
    onError: (e: any) => Alert.alert(t('common.error'), e.message || t('common.error'))
  });

  const deleteCycleMutation = trpc.menstrual.deleteCycle.useMutation({
    onSuccess: () => { utils.menstrual.getCycles.invalidate(); Alert.alert('✅', t('intimate.deleteSuccess')); },
    onError: (e: any) => Alert.alert(t('common.error'), e.message || t('common.error'))
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      utils.menstrual.getSettings.invalidate(),
      utils.menstrual.getCycles.invalidate(),
    ]);
    setRefreshing(false);
  };

  const handleToggleFeature = (value: boolean) => {
    toggleMutation.mutate({ enabled: value });
  };

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate({
      cycleDuration: parseInt(settingsCycleDuration) || 28,
      periodDuration: parseInt(settingsPeriodDuration) || 5,
    });
  };

  const handleCreateCycle = () => {
    createCycleMutation.mutate({
      startDate: new Date(cycleDate),
      mood: selectedMood as any || undefined,
      flowIntensity: selectedFlow as any || undefined,
      symptoms: selectedSymptoms.length > 0 ? selectedSymptoms.join(', ') : undefined,
      notes: cycleNotes.trim() || undefined,
    });
  };

  const handleDeleteCycle = (cycleId: number) => {
    Alert.alert('Supprimer', t('intimate.deleteConfirm'), [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteCycleMutation.mutate({ cycleId }) }
    ]);
  };

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms(prev =>
      prev.includes(symptom) ? prev.filter(s => s !== symptom) : [...prev, symptom]
    );
  };

  // Calculs du cycle actuel
  const currentCycleInfo = useMemo(() => {
    const s = settings as any;
    if (!s?.lastPeriodDate) return null;
    const cycleDuration = s.cycleDuration || 28;
    const periodDuration = s.periodDuration || 5;
    const lastPeriod = new Date(s.lastPeriodDate);
    const today = new Date();
    const dayOfCycle = Math.floor((today.getTime() - lastPeriod.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const ovulationDay = Math.round(cycleDuration / 2);
    const fertilityStart = ovulationDay - 5;
    const fertilityEnd = ovulationDay + 1;
    const nextPeriodDate = new Date(lastPeriod.getTime() + cycleDuration * 24 * 60 * 60 * 1000);
    const daysUntilNext = Math.ceil((nextPeriodDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let phase: string;
    let phaseColor: string;
    let phaseEmoji: string;
    if (dayOfCycle <= periodDuration) {
      phase = t('intimate.phaseMenstruation'); phaseColor = PHASE_COLORS.menstruation; phaseEmoji = '🩸';
    } else if (dayOfCycle < fertilityStart) {
      phase = t('intimate.phaseFollicular'); phaseColor = PHASE_COLORS.follicular; phaseEmoji = '🌱';
    } else if (dayOfCycle <= fertilityEnd) {
      phase = t('intimate.phaseFertility'); phaseColor = PHASE_COLORS.fertility; phaseEmoji = '🌸';
    } else if (dayOfCycle === ovulationDay) {
      phase = t('intimate.phaseOvulation'); phaseColor = PHASE_COLORS.ovulation; phaseEmoji = '🌟';
    } else {
      phase = t('intimate.phaseLuteal'); phaseColor = PHASE_COLORS.luteal; phaseEmoji = '🌙';
    }

    return { dayOfCycle, cycleDuration, periodDuration, phase, phaseColor, phaseEmoji, nextPeriodDate, daysUntilNext, ovulationDay, fertilityStart, fertilityEnd };
  }, [settings]);

  const isEnabled = !!(settings as any)?.isEnabled;

  // Initialiser les settings depuis les données
  React.useEffect(() => {
    const s = settings as any;
    if (s) {
      setSettingsCycleDuration(String(s.cycleDuration || 28));
      setSettingsPeriodDuration(String(s.periodDuration || 5));
    }
  }, [settings]);

  if (settingsLoading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Titre */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>🌸 Calendrier Intime</Text>
      </View>

      {/* Si désactivé : écran d'activation */}
      {!isEnabled ? (
        <ScrollView contentContainerStyle={styles.activationContainer}>
          <Text style={styles.activationEmoji}>🌸</Text>
          <Text style={styles.activationTitle}>{t('intimate.activationTitle')}</Text>
          <Text style={styles.activationDesc}>
            Suivez votre cycle menstruel, prédisez vos prochaines règles et identifiez votre fenêtre de fertilité.
            Cette fonctionnalité est 100% privée — seule vous pouvez y accéder.
          </Text>
          <View style={styles.activationFeatures}>
            {['🩸 Suivi du cycle', '📅 Prédictions', '🌸 Fenêtre fertile', '😊 Humeur & symptômes', '📊 Historique'].map(f => (
              <View key={f} style={styles.activationFeatureRow}>
                <Text style={styles.activationFeatureText}>{f}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.activateBtn} onPress={() => handleToggleFeature(true)} disabled={toggleMutation.isLoading}>
            <Text style={styles.activateBtnText}>{toggleMutation.isLoading ? '...' : t('intimate.activateBtn')}</Text>
          </TouchableOpacity>
          <Text style={styles.activationNote}>{t('intimate.medicalNote')}</Text>
        </ScrollView>
      ) : (
        <>
          {/* Onglets */}
          <View style={styles.tabsRow}>
            {[
              { key: 'overview', label: t('intimate.tabOverview') },
              { key: 'history', label: t('intimate.tabHistory') },
              { key: 'settings', label: t('intimate.tabSettings') },
            ].map(tab => (
              <TouchableOpacity key={tab.key} style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]} onPress={() => setActiveTab(tab.key as any)}>
                <Text style={[styles.tabBtnText, activeTab === tab.key && styles.tabBtnTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={styles.content} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>

            {/* VUE D'ENSEMBLE */}
            {activeTab === 'overview' && (
              <>
                <TouchableOpacity style={styles.newCycleBtn} onPress={() => setNewCycleOpen(true)}>
                  <Text style={styles.newCycleBtnText}>{t('intimate.newCycleBtn')}</Text>
                </TouchableOpacity>

                {currentCycleInfo ? (
                  <>
                    {/* Carte phase actuelle */}
                    <View style={[styles.phaseCard, { borderLeftColor: currentCycleInfo.phaseColor }]}>
                      <View style={styles.phaseCardTop}>
                        <Text style={styles.phaseEmoji}>{currentCycleInfo.phaseEmoji}</Text>
                        <View style={styles.phaseCardBody}>
                          <Text style={[styles.phaseName, { color: currentCycleInfo.phaseColor }]}>{currentCycleInfo.phase}</Text>
                          <Text style={styles.phaseDay}>Jour {currentCycleInfo.dayOfCycle} sur {currentCycleInfo.cycleDuration}</Text>
                        </View>
                      </View>
                      {/* Barre de progression */}
                      <View style={styles.cycleProgressBar}>
                        <View style={[styles.cycleProgressFill, { width: `${Math.min((currentCycleInfo.dayOfCycle / currentCycleInfo.cycleDuration) * 100, 100)}%` as any, backgroundColor: currentCycleInfo.phaseColor }]} />
                      </View>
                    </View>

                    {/* Prochaines dates */}
                    <View style={styles.datesRow}>
                      <View style={styles.dateCard}>
                        <Text style={styles.dateCardEmoji}>🩸</Text>
                        <Text style={styles.dateCardLabel}>{t('intimate.nextPeriod')}</Text>
                        <Text style={styles.dateCardValue}>
                          {currentCycleInfo.daysUntilNext > 0
                            ? `Dans ${currentCycleInfo.daysUntilNext} j.`
                            : currentCycleInfo.daysUntilNext === 0 ? "Aujourd'hui" : `Il y a ${Math.abs(currentCycleInfo.daysUntilNext)} j.`}
                        </Text>
                        <Text style={styles.dateCardDate}>{currentCycleInfo.nextPeriodDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</Text>
                      </View>
                      <View style={styles.dateCard}>
                        <Text style={styles.dateCardEmoji}>🌸</Text>
                        <Text style={styles.dateCardLabel}>{t('intimate.fertilityWindow')}</Text>
                        <Text style={styles.dateCardValue}>J.{currentCycleInfo.fertilityStart}–J.{currentCycleInfo.fertilityEnd}</Text>
                        <Text style={styles.dateCardDate}>Ovulation J.{currentCycleInfo.ovulationDay}</Text>
                      </View>
                    </View>

                    {/* Phases du cycle */}
                    <View style={styles.phasesCard}>
                      <Text style={styles.sectionTitle}>{t('intimate.cyclePhases')}</Text>
                      {[
                        { name: t('intimate.phaseMenstruation'),     start: 1, end: currentCycleInfo.periodDuration, color: PHASE_COLORS.menstruation, emoji: '🩸' },
                        { name: t('intimate.phaseFollicular'), start: currentCycleInfo.periodDuration + 1, end: currentCycleInfo.fertilityStart - 1, color: PHASE_COLORS.follicular, emoji: '🌱' },
                        { name: t('intimate.phaseFertility'),    start: currentCycleInfo.fertilityStart, end: currentCycleInfo.fertilityEnd, color: PHASE_COLORS.fertility, emoji: '🌸' },
                        { name: t('intimate.phaseLuteal'),      start: currentCycleInfo.fertilityEnd + 1, end: currentCycleInfo.cycleDuration, color: PHASE_COLORS.luteal, emoji: '🌙' },
                      ].map(phase => (
                        <View key={phase.name} style={[styles.phaseRow, currentCycleInfo.phase === phase.name && styles.phaseRowActive]}>
                          <Text style={styles.phaseRowEmoji}>{phase.emoji}</Text>
                          <View style={styles.phaseRowBody}>
                            <Text style={[styles.phaseRowName, { color: phase.color }]}>{phase.name}</Text>
                            <Text style={styles.phaseRowDays}>Jours {phase.start}–{phase.end}</Text>
                          </View>
                          {currentCycleInfo.phase === phase.name && (
                            <View style={[styles.currentBadge, { backgroundColor: phase.color }]}>
                              <Text style={styles.currentBadgeText}>{t('intimate.current')}</Text>
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  </>
                ) : (
                  <View style={styles.empty}>
                    <Text style={styles.emptyEmoji}>🌸</Text>
                    <Text style={styles.emptyText}>{t('intimate.noCycle')}</Text>
                    <Text style={styles.emptySubtext}>{t('intimate.noCycleHint')}</Text>
                  </View>
                )}
              </>
            )}

            {/* HISTORIQUE */}
            {activeTab === 'history' && (
              <>
                <Text style={styles.sectionTitle}>{(cycles as any[]).length} cycle(s) enregistré(s)</Text>
                {cyclesLoading ? (
                  <Text style={styles.loadingText}>{t('common.loading')}</Text>
                ) : (cycles as any[]).length === 0 ? (
                  <View style={styles.empty}>
                    <Text style={styles.emptyEmoji}>📜</Text>
                    <Text style={styles.emptyText}>{t('intimate.noHistory')}</Text>
                  </View>
                ) : (
                  (cycles as any[]).map((cycle: any, index: number) => (
                    <View key={cycle.id} style={styles.cycleCard}>
                      <View style={styles.cycleCardTop}>
                        <View>
                          <Text style={styles.cycleCardTitle}>Cycle #{(cycles as any[]).length - index}</Text>
                          <Text style={styles.cycleCardDate}>
                            Début : {new Date(cycle.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </Text>
                          {cycle.cycleLength && <Text style={styles.cycleCardLength}>Durée : {cycle.cycleLength} jours</Text>}
                        </View>
                        <View style={styles.cycleCardRight}>
                          {cycle.status && (
                            <View style={[styles.statusBadge, { backgroundColor: cycle.status === 'regular' ? '#d1fae5' : cycle.status === 'early' ? '#fef3c7' : '#fee2e2' }]}>
                              <Text style={[styles.statusBadgeText, { color: cycle.status === 'regular' ? '#065f46' : cycle.status === 'early' ? '#92400e' : '#991b1b' }]}>
                                {cycle.status === 'regular' ? t('intimate.statusRegular') : cycle.status === 'early' ? t('intimate.statusEarly') : t('intimate.statusLate')}
                              </Text>
                            </View>
                          )}
                          <TouchableOpacity onPress={() => handleDeleteCycle(cycle.id)} style={styles.deleteBtn}>
                            <Text style={styles.deleteBtnText}>🗑️</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                      {(cycle.mood || cycle.flowIntensity || cycle.symptoms) && (
                        <View style={styles.cycleCardDetails}>
                          {cycle.mood && <Text style={styles.cycleCardDetail}>{MOOD_OPTIONS.find(m => m.value === cycle.mood)?.emoji} {MOOD_OPTIONS.find(m => m.value === cycle.mood)?.label}</Text>}
                          {cycle.flowIntensity && <Text style={styles.cycleCardDetail}>{FLOW_OPTIONS.find(f => f.value === cycle.flowIntensity)?.emoji} {FLOW_OPTIONS.find(f => f.value === cycle.flowIntensity)?.label}</Text>}
                          {cycle.symptoms && <Text style={styles.cycleCardDetail}>🩹 {cycle.symptoms}</Text>}
                        </View>
                      )}
                      {cycle.notes && <Text style={styles.cycleCardNotes}>{cycle.notes}</Text>}
                    </View>
                  ))
                )}
              </>
            )}

            {/* PARAMÈTRES */}
            {activeTab === 'settings' && (
              <>
                <View style={styles.settingsCard}>
                  <View style={styles.settingsRow}>
                    <Text style={styles.settingsLabel}>{t('intimate.featureEnabled')}</Text>
                    <Switch value={isEnabled} onValueChange={handleToggleFeature} trackColor={{ true: '#7c3aed' }} />
                  </View>
                </View>
                <View style={styles.settingsCard}>
                  <Text style={styles.settingsCardTitle}>{t('intimate.cycleDurationLabel')}</Text>
                  <Text style={styles.settingsHint}>{t('intimate.cycleDurationHint')}</Text>
                  <TextInput
                    style={styles.settingsInput}
                    value={settingsCycleDuration}
                    onChangeText={setSettingsCycleDuration}
                    keyboardType="numeric"
                    placeholder="28"
                    placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
                  />
                </View>
                <View style={styles.settingsCard}>
                  <Text style={styles.settingsCardTitle}>{t('intimate.periodDurationLabel')}</Text>
                  <Text style={styles.settingsHint}>{t('intimate.periodDurationHint')}</Text>
                  <TextInput
                    style={styles.settingsInput}
                    value={settingsPeriodDuration}
                    onChangeText={setSettingsPeriodDuration}
                    keyboardType="numeric"
                    placeholder="5"
                    placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
                  />
                </View>
                <TouchableOpacity style={styles.saveSettingsBtn} onPress={handleSaveSettings} disabled={updateSettingsMutation.isLoading}>
                  <Text style={styles.saveSettingsBtnText}>{updateSettingsMutation.isLoading ? '...' : t('intimate.saveSettings')}</Text>
                </TouchableOpacity>
                <Text style={styles.medicalNote}>⚠️ Ces informations sont à titre indicatif uniquement et ne constituent pas un avis médical. Consultez un professionnel de santé pour tout suivi médical.</Text>
              </>
            )}
          </ScrollView>
        </>
      )}

      {/* Modal nouveau cycle */}
      <Modal visible={newCycleOpen} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setNewCycleOpen(false)} />
          <ScrollView style={styles.modalContent} contentContainerStyle={{ paddingBottom: 40 }}>
            <Text style={styles.modalTitle}>{t('intimate.modalTitle')}</Text>
            <Text style={styles.fieldLabel}>{t('intimate.dateLabel')}</Text>
            <TextInput
              style={styles.input}
              value={cycleDate}
              onChangeText={setCycleDate}
              {...{placeholder: t('intimate.datePlaceholder')}}
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
            />
            <Text style={styles.fieldLabel}>{t('intimate.moodLabel')}</Text>
            <View style={styles.optionsRow}>
              {MOOD_OPTIONS.map(opt => (
                <TouchableOpacity key={opt.value} style={[styles.optionBtn, selectedMood === opt.value && styles.optionBtnActive]} onPress={() => setSelectedMood(selectedMood === opt.value ? '' : opt.value)}>
                  <Text style={styles.optionEmoji}>{opt.emoji}</Text>
                  <Text style={[styles.optionLabel, selectedMood === opt.value && styles.optionLabelActive]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.fieldLabel}>{t('intimate.flowLabel')}</Text>
            <View style={styles.optionsRow}>
              {FLOW_OPTIONS.map(opt => (
                <TouchableOpacity key={opt.value} style={[styles.optionBtn, selectedFlow === opt.value && styles.optionBtnActive]} onPress={() => setSelectedFlow(selectedFlow === opt.value ? '' : opt.value)}>
                  <Text style={styles.optionEmoji}>{opt.emoji}</Text>
                  <Text style={[styles.optionLabel, selectedFlow === opt.value && styles.optionLabelActive]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.fieldLabel}>{t('intimate.symptomsLabel')}</Text>
            <View style={styles.symptomsGrid}>
              {SYMPTOM_OPTIONS.map(symptom => (
                <TouchableOpacity key={symptom} style={[styles.symptomChip, selectedSymptoms.includes(symptom) && styles.symptomChipActive]} onPress={() => toggleSymptom(symptom)}>
                  <Text style={[styles.symptomChipText, selectedSymptoms.includes(symptom) && styles.symptomChipTextActive]}>{symptom}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.fieldLabel}>{t('intimate.notesLabel')}</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              value={cycleNotes}
              onChangeText={setCycleNotes}
              {...{placeholder: t('intimate.notesPlaceholder')}}
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setNewCycleOpen(false)}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleCreateCycle} disabled={createCycleMutation.isLoading}>
                <Text style={styles.saveBtnText}>{createCycleMutation.isLoading ? '...' : t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const getStyles = (isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDark ? '#111827' : '#f9fafb' },
  header: { alignItems: 'center', paddingTop: 16, paddingBottom: 8 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: isDark ? '#fff' : '#111827', textAlign: 'center' },
  loadingText: { textAlign: 'center', color: isDark ? '#9ca3af' : '#6b7280', marginTop: 40 },
  activationContainer: { padding: 24, alignItems: 'center' },
  activationEmoji: { fontSize: 64, marginBottom: 16 },
  activationTitle: { fontSize: 22, fontWeight: '800', color: isDark ? '#fff' : '#111827', marginBottom: 12, textAlign: 'center' },
  activationDesc: { fontSize: 14, color: isDark ? '#9ca3af' : '#6b7280', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  activationFeatures: { width: '100%', marginBottom: 24 },
  activationFeatureRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: isDark ? '#374151' : '#e5e7eb' },
  activationFeatureText: { fontSize: 15, color: isDark ? '#d1d5db' : '#374151' },
  activateBtn: { backgroundColor: '#ec4899', borderRadius: 14, padding: 16, width: '100%', alignItems: 'center', marginBottom: 16 },
  activateBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  activationNote: { fontSize: 12, color: isDark ? '#9ca3af' : '#6b7280', textAlign: 'center', fontStyle: 'italic' },
  tabsRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 20, backgroundColor: isDark ? '#1f2937' : '#fff', borderWidth: 1, borderColor: isDark ? '#374151' : '#e5e7eb', alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#ec4899', borderColor: '#ec4899' },
  tabBtnText: { fontSize: 11, fontWeight: '600', color: isDark ? '#d1d5db' : '#374151' },
  tabBtnTextActive: { color: '#fff' },
  content: { flex: 1 },
  newCycleBtn: { backgroundColor: '#ec4899', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 16 },
  newCycleBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  phaseCard: { backgroundColor: isDark ? '#1f2937' : '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  phaseCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  phaseEmoji: { fontSize: 36, marginRight: 12 },
  phaseCardBody: { flex: 1 },
  phaseName: { fontSize: 18, fontWeight: '800' },
  phaseDay: { fontSize: 13, color: isDark ? '#9ca3af' : '#6b7280', marginTop: 2 },
  cycleProgressBar: { height: 8, backgroundColor: isDark ? '#374151' : '#e5e7eb', borderRadius: 4, overflow: 'hidden' },
  cycleProgressFill: { height: 8, borderRadius: 4 },
  datesRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  dateCard: { flex: 1, backgroundColor: isDark ? '#1f2937' : '#fff', borderRadius: 14, padding: 14, alignItems: 'center' },
  dateCardEmoji: { fontSize: 24, marginBottom: 4 },
  dateCardLabel: { fontSize: 11, color: isDark ? '#9ca3af' : '#6b7280', textAlign: 'center', marginBottom: 4 },
  dateCardValue: { fontSize: 16, fontWeight: '800', color: isDark ? '#fff' : '#111827' },
  dateCardDate: { fontSize: 12, color: isDark ? '#9ca3af' : '#6b7280', marginTop: 2 },
  phasesCard: { backgroundColor: isDark ? '#1f2937' : '#fff', borderRadius: 16, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: isDark ? '#d1d5db' : '#374151', marginBottom: 12 },
  phaseRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: isDark ? '#374151' : '#f3f4f6' },
  phaseRowActive: { backgroundColor: isDark ? '#374151' : '#f9fafb', borderRadius: 8, paddingHorizontal: 8 },
  phaseRowEmoji: { fontSize: 20, marginRight: 10 },
  phaseRowBody: { flex: 1 },
  phaseRowName: { fontSize: 14, fontWeight: '600' },
  phaseRowDays: { fontSize: 12, color: isDark ? '#9ca3af' : '#6b7280' },
  currentBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  currentBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  cycleCard: { backgroundColor: isDark ? '#1f2937' : '#fff', borderRadius: 14, padding: 14, marginBottom: 10 },
  cycleCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cycleCardTitle: { fontSize: 15, fontWeight: '700', color: isDark ? '#fff' : '#111827' },
  cycleCardDate: { fontSize: 13, color: isDark ? '#d1d5db' : '#374151', marginTop: 2 },
  cycleCardLength: { fontSize: 12, color: isDark ? '#9ca3af' : '#6b7280', marginTop: 2 },
  cycleCardRight: { alignItems: 'flex-end', gap: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },
  deleteBtn: { padding: 4 },
  deleteBtnText: { fontSize: 16 },
  cycleCardDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  cycleCardDetail: { fontSize: 12, color: isDark ? '#9ca3af' : '#6b7280' },
  cycleCardNotes: { fontSize: 12, color: isDark ? '#9ca3af' : '#6b7280', marginTop: 6, fontStyle: 'italic' },
  settingsCard: { backgroundColor: isDark ? '#1f2937' : '#fff', borderRadius: 14, padding: 16, marginBottom: 12 },
  settingsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingsLabel: { fontSize: 15, fontWeight: '600', color: isDark ? '#fff' : '#111827' },
  settingsCardTitle: { fontSize: 15, fontWeight: '700', color: isDark ? '#fff' : '#111827', marginBottom: 4 },
  settingsHint: { fontSize: 12, color: isDark ? '#9ca3af' : '#6b7280', marginBottom: 8 },
  settingsInput: { backgroundColor: isDark ? '#374151' : '#f9fafb', borderRadius: 10, padding: 12, fontSize: 15, color: isDark ? '#fff' : '#111827', borderWidth: 1, borderColor: isDark ? '#4b5563' : '#e5e7eb' },
  saveSettingsBtn: { backgroundColor: '#7c3aed', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 12 },
  saveSettingsBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  medicalNote: { fontSize: 12, color: isDark ? '#9ca3af' : '#6b7280', textAlign: 'center', fontStyle: 'italic', lineHeight: 18 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: isDark ? '#d1d5db' : '#374151', marginBottom: 6 },
  emptySubtext: { fontSize: 13, color: isDark ? '#9ca3af' : '#6b7280', textAlign: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: isDark ? '#1f2937' : '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: isDark ? '#fff' : '#111827', marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: isDark ? '#d1d5db' : '#374151', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: isDark ? '#374151' : '#f9fafb', borderRadius: 10, padding: 12, fontSize: 15, color: isDark ? '#fff' : '#111827', borderWidth: 1, borderColor: isDark ? '#4b5563' : '#e5e7eb' },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionBtn: { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: isDark ? '#374151' : '#f3f4f6', borderWidth: 2, borderColor: 'transparent' },
  optionBtnActive: { borderColor: '#ec4899', backgroundColor: isDark ? '#4b1535' : '#fce7f3' },
  optionEmoji: { fontSize: 20, marginBottom: 2 },
  optionLabel: { fontSize: 11, color: isDark ? '#9ca3af' : '#6b7280' },
  optionLabelActive: { color: '#ec4899', fontWeight: '600' },
  symptomsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  symptomChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: isDark ? '#374151' : '#f3f4f6', borderWidth: 1, borderColor: isDark ? '#4b5563' : '#e5e7eb' },
  symptomChipActive: { backgroundColor: isDark ? '#4b1535' : '#fce7f3', borderColor: '#ec4899' },
  symptomChipText: { fontSize: 12, color: isDark ? '#9ca3af' : '#6b7280' },
  symptomChipTextActive: { color: '#ec4899', fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: isDark ? '#374151' : '#f3f4f6', alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: isDark ? '#d1d5db' : '#374151' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#ec4899', alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
