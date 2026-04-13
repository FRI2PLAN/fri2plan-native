/**
 * RepasScreen — Page autonome Repas (anciennement onglet Cuisine > Repas)
 * Réutilise MealsScreen en mode standalone avec sa propre barre d'actions.
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import MealsScreen from './MealsScreen';

type MealsSubTab = 'week' | 'history' | 'settings';

interface RepasScreenProps {
  onNavigate?: (screen: string | number) => void;
  onPrevious?: () => void;
  onNext?: () => void;
}

export default function RepasScreen({ onNavigate }: RepasScreenProps) {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const s = getStyles(isDark);

  const [mealsTab, setMealsTab] = useState<MealsSubTab>('week');
  const [mealsTrigger, setMealsTrigger] = useState(0);

  return (
    <View style={s.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Titre de page */}
      <View style={s.pageTitleContainer}>
        <Text style={s.pageTitle}>🍽️ {t('tabs.meals') || 'Repas'}</Text>
      </View>

      {/* Barre d'actions */}
      <View style={s.actionBar}>
        <TouchableOpacity
          style={[s.actionBtn, mealsTab === 'week' && s.actionBtnActive]}
          onPress={() => setMealsTab('week')}
        >
          <Text style={[s.actionBtnText, mealsTab === 'week' && s.actionBtnTextActive]}>
            {t('meals.week') || 'Semaine'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.actionBtn, mealsTab === 'history' && s.actionBtnActive]}
          onPress={() => setMealsTab('history')}
        >
          <Text style={[s.actionBtnText, mealsTab === 'history' && s.actionBtnTextActive]}>
            {t('meals.history') || 'Historique'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.actionBtn, mealsTab === 'settings' && s.actionBtnActive]}
          onPress={() => setMealsTab('settings')}
        >
          <Text style={[s.actionBtnText, mealsTab === 'settings' && s.actionBtnTextActive]}>
            ⚙️
          </Text>
        </TouchableOpacity>
        <View style={s.actionSpacer} />
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => setMealsTrigger(c => c + 1)}
        >
          <Text style={s.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Contenu */}
      <View style={s.content}>
        <MealsScreen
          embedded
          externalTab={mealsTab}
          onTabChange={setMealsTab}
          triggerCreate={mealsTrigger}
        />
      </View>
    </View>
  );
}

function getStyles(isDark: boolean) {
  const bg = isDark ? '#111827' : '#f9fafb';
  const card = isDark ? '#1f2937' : '#ffffff';
  const border = isDark ? '#374151' : '#e5e7eb';
  const text = isDark ? '#f9fafb' : '#111827';
  const subtext = isDark ? '#9ca3af' : '#6b7280';

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: bg },
    pageTitleContainer: {
      backgroundColor: card,
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: border,
    },
    pageTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: text,
      textAlign: 'center',
    },
    actionBar: {
      flexDirection: 'row',
      backgroundColor: card,
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 8,
      borderBottomWidth: 1,
      borderBottomColor: border,
      alignItems: 'center',
    },
    actionBtn: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 8,
      backgroundColor: isDark ? '#374151' : '#f3f4f6',
    },
    actionBtnActive: { backgroundColor: '#7c3aed' },
    actionBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: subtext,
    },
    actionBtnTextActive: { color: '#ffffff' },
    actionSpacer: { flex: 1 },
    addBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#7c3aed',
      alignItems: 'center',
      justifyContent: 'center',
    },
    addBtnText: {
      color: '#fff',
      fontSize: 22,
      fontWeight: '700',
      lineHeight: 26,
    },
    content: { flex: 1 },
  });
}
