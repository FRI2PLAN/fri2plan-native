/**
 * ShoppingMealsScreen - Onglet fusionne "Courses & Repas"
 * Sous-onglets : Courses | Repas
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import ShoppingScreen from './ShoppingScreen';
import MealsScreen from './MealsScreen';

type MainTab = 'shopping' | 'meals';

export default function ShoppingMealsScreen() {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<MainTab>('shopping');
  const s = getStyles(isDark);

  return (
    <View style={s.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Titre de page centre */}
      <View style={s.pageTitleContainer}>
        <Text style={s.pageTitle}>
          {activeTab === 'shopping'
            ? (t('tabs.shopping') || 'Courses')
            : (t('tabs.meals') || 'Repas')}
        </Text>
      </View>

      {/* Selecteur Courses / Repas */}
      <View style={s.mainTabBar}>
        <TouchableOpacity
          style={[s.mainTab, activeTab === 'shopping' && s.mainTabActive]}
          onPress={() => setActiveTab('shopping')}
        >
          <Text style={[s.mainTabText, activeTab === 'shopping' && s.mainTabTextActive]}>
            {t('tabs.shopping') || 'Courses'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.mainTab, activeTab === 'meals' && s.mainTabActive]}
          onPress={() => setActiveTab('meals')}
        >
          <Text style={[s.mainTabText, activeTab === 'meals' && s.mainTabTextActive]}>
            {t('tabs.meals') || 'Repas'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[s.content, activeTab !== 'shopping' && s.hidden]}>
        <ShoppingScreen embedded />
      </View>
      <View style={[s.content, activeTab !== 'meals' && s.hidden]}>
        <MealsScreen embedded />
      </View>
    </View>
  );
}

function getStyles(isDark: boolean) {
  const bg = isDark ? '#111827' : '#f9fafb';
  const card = isDark ? '#1f2937' : '#ffffff';
  const border = isDark ? '#374151' : '#e5e7eb';

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
      color: isDark ? '#ffffff' : '#1f2937',
      textAlign: 'center',
    },
    mainTabBar: {
      flexDirection: 'row',
      backgroundColor: card,
      borderBottomWidth: 2,
      borderBottomColor: '#7c3aed',
      paddingHorizontal: 12,
      paddingVertical: 6,
      gap: 8,
    },
    mainTab: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: 'center',
      backgroundColor: isDark ? '#374151' : '#f3f4f6',
    },
    mainTabActive: { backgroundColor: '#7c3aed' },
    mainTabText: {
      fontSize: 15,
      fontWeight: '600',
      color: isDark ? '#9ca3af' : '#6b7280',
    },
    mainTabTextActive: { color: '#ffffff' },
    content: { flex: 1 },
    hidden: { display: 'none' },
  });
}
