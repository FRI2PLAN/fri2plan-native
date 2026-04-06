/**
 * ShoppingMealsScreen - Onglet fusionne Cuisine
 * Titre: Cuisine | Selecteur: Courses / Repas
 * Barre Courses: Actives | Historique | +
 * Barre Repas:   Semaine | Historique | ⚙️ | +
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import ShoppingScreen from './ShoppingScreen';
import MealsScreen from './MealsScreen';

type MainTab = 'shopping' | 'meals';
type ShoppingSubTab = 'lists' | 'history';
type MealsSubTab = 'week' | 'history' | 'settings';

export default function ShoppingMealsScreen() {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const s = getStyles(isDark);

  // Onglet principal
  const [activeTab, setActiveTab] = useState<MainTab>('shopping');

  // Sous-onglets
  const [shoppingTab, setShoppingTab] = useState<ShoppingSubTab>('lists');
  const [mealsTab, setMealsTab] = useState<MealsSubTab>('week');

  // Compteurs pour declencher openCreate dans les sous-composants
  const [shoppingTrigger, setShoppingTrigger] = useState(0);
  const [mealsTrigger, setMealsTrigger] = useState(0);

  return (
    <View style={s.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Titre de page centre */}
      <View style={s.pageTitleContainer}>
        <Text style={s.pageTitle}>
          🛒 {t('tabs.cuisine') || 'Cuisine'}
        </Text>
      </View>

      {/* Selecteur Courses / Repas - une seule ligne */}
      <View style={s.mainTabBar}>
        <TouchableOpacity
          style={[s.mainTab, activeTab === 'shopping' && s.mainTabActive]}
          onPress={() => setActiveTab('shopping')}
        >
          <Text style={[s.mainTabText, activeTab === 'shopping' && s.mainTabTextActive]}>
            🛒 {t('tabs.shopping') || 'Courses'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.mainTab, activeTab === 'meals' && s.mainTabActive]}
          onPress={() => setActiveTab('meals')}
        >
          <Text style={[s.mainTabText, activeTab === 'meals' && s.mainTabTextActive]}>
            🍽️ {t('tabs.meals') || 'Repas'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Barre d actions contextuelle */}
      {activeTab === 'shopping' ? (
        <View style={s.actionBar}>
          <TouchableOpacity
            style={[s.actionBtn, shoppingTab === 'lists' && s.actionBtnActive]}
            onPress={() => setShoppingTab('lists')}
          >
            <Text style={[s.actionBtnText, shoppingTab === 'lists' && s.actionBtnTextActive]}>
              {t('shopping.activeLists') || 'Actives'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.actionBtn, shoppingTab === 'history' && s.actionBtnActive]}
            onPress={() => setShoppingTab('history')}
          >
            <Text style={[s.actionBtnText, shoppingTab === 'history' && s.actionBtnTextActive]}>
              {t('shopping.history') || 'Historique'}
            </Text>
          </TouchableOpacity>
          <View style={s.actionSpacer} />
          <TouchableOpacity
            style={s.addBtn}
            onPress={() => setShoppingTrigger(c => c + 1)}
          >
            <Text style={s.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      ) : (
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
      )}

      {/* Contenu */}
      <View style={[s.content, activeTab !== 'shopping' && s.hidden]}>
        <ShoppingScreen
          embedded
          externalTab={shoppingTab}
          onTabChange={setShoppingTab}
          triggerCreate={shoppingTrigger}
        />
      </View>
      <View style={[s.content, activeTab !== 'meals' && s.hidden]}>
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

    // Titre de page
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

    // Selecteur Courses / Repas
    mainTabBar: {
      flexDirection: 'row',
      backgroundColor: card,
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 8,
      borderBottomWidth: 1,
      borderBottomColor: border,
    },
    mainTab: {
      flex: 1,
      paddingVertical: 9,
      borderRadius: 10,
      alignItems: 'center',
      backgroundColor: isDark ? '#374151' : '#f3f4f6',
    },
    mainTabActive: { backgroundColor: '#7c3aed' },
    mainTabText: {
      fontSize: 14,
      fontWeight: '600',
      color: subtext,
    },
    mainTabTextActive: { color: '#ffffff' },

    // Barre d actions contextuelle
    actionBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: card,
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 6,
      borderBottomWidth: 1,
      borderBottomColor: border,
    },
    actionBtn: {
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: isDark ? '#374151' : '#f3f4f6',
    },
    actionBtnActive: {
      backgroundColor: isDark ? '#4c1d95' : '#ede9fe',
    },
    actionBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: subtext,
    },
    actionBtnTextActive: {
      color: isDark ? '#c4b5fd' : '#7c3aed',
    },
    actionSpacer: { flex: 1 },
    addBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: '#7c3aed',
      alignItems: 'center',
      justifyContent: 'center',
    },
    addBtnText: {
      color: '#ffffff',
      fontSize: 22,
      fontWeight: '300',
      lineHeight: 26,
    },

    content: { flex: 1 },
    hidden: { display: 'none' },
  });
}
