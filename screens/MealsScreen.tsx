import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView,
  RefreshControl, Modal, TextInput, Alert, ActivityIndicator,
  Image, FlatList, Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../contexts/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { trpc } from '../lib/trpc';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { fr, de, enUS } from 'date-fns/locale';

// ─── Types ───────────────────────────────────────────────────────────────────
type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
type MealsTab = 'week' | 'history' | 'settings';

const MEAL_ICONS: Record<MealType, string> = {
  breakfast: '☀️', lunch: '🥗', dinner: '🍽️', snack: '🍎',
};
const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const DEFAULT_LABELS: Record<MealType, string> = {
  breakfast: 'Petit-déjeuner', lunch: 'Déjeuner', dinner: 'Dîner', snack: 'Collation',
};
const DEFAULT_TIMES: Record<MealType, string> = {
  breakfast: '08:00', lunch: '12:00', dinner: '19:00', snack: '16:00',
};

interface Meal {
  id: number;
  name: string;
  mealType: MealType;
  date: string;
  servings?: number;
  notes?: string;
  ingredients?: string;
  imageUrl?: string;
  isFavorite?: number;
}

interface RecipeSuggestion {
  id: string;
  name: string;
  category: string;
  area: string;
  thumb: string;
  ingredients: string[];
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function MealsScreen({ embedded = false }: { embedded?: boolean } = {}) {
  const { isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const s = getStyles(isDark);
  const utils = trpc.useUtils();

  const [mealsTab, setMealsTab] = useState<MealsTab>('week');
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [refreshing, setRefreshing] = useState(false);

  // Dialog ajout / modification
  const [addModal, setAddModal] = useState(false);
  const [editMeal, setEditMeal] = useState<Meal | null>(null);
  const [preselectedDate, setPreselectedDate] = useState<string | null>(null);

  // Formulaire repas
  const emptyForm = { name: '', mealType: 'dinner' as MealType, date: new Date(), servings: 4, notes: '', ingredients: '' };
  const [form, setForm] = useState({ ...emptyForm });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [mealTypeModal, setMealTypeModal] = useState(false);

  // Recherche de recettes
  const [recipeSearch, setRecipeSearch] = useState('');
  const [recipeSuggestions, setRecipeSuggestions] = useState<RecipeSuggestion[]>([]);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [recipeModal, setRecipeModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeSuggestion | null>(null);

  // Paramètres
  const [defaultServings, setDefaultServings] = useState(4);
  const [customLabels, setCustomLabels] = useState({ ...DEFAULT_LABELS });
  const [customTimes, setCustomTimes] = useState({ ...DEFAULT_TIMES });

  const getLocale = () => i18n.language === 'de' ? de : i18n.language === 'en' ? enUS : fr;

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i)), [currentWeekStart]);
  const startDate = format(currentWeekStart, 'yyyy-MM-dd HH:mm:ss');
  const endDate = format(addDays(currentWeekStart, 6), 'yyyy-MM-dd') + ' 23:59:59';

  const { data: meals = [], refetch: refetchMeals } = trpc.meals.list.useQuery({ familyId: 1, startDate, endDate });
  const { data: history = [], refetch: refetchHistory } = trpc.meals.history.useQuery({ familyId: 1, limit: 100 });

  const invalidateMeals = () => { utils.meals.list.invalidate(); utils.meals.history.invalidate(); };

  const createMut = trpc.meals.create.useMutation({
    onSuccess: () => { invalidateMeals(); setAddModal(false); setForm({ ...emptyForm }); setSelectedRecipe(null); },
    onError: (e) => Alert.alert('Erreur', e.message),
  });
  const updateMut = trpc.meals.update.useMutation({
    onSuccess: () => { invalidateMeals(); setEditMeal(null); },
    onError: (e) => Alert.alert('Erreur', e.message),
  });
  const deleteMut = trpc.meals.delete.useMutation({
    onSuccess: () => invalidateMeals(),
    onError: (e) => Alert.alert('Erreur', e.message),
  });
  const favoriteMut = trpc.meals.toggleFavorite.useMutation({
    onSuccess: () => invalidateMeals(),
  });

  const mealsByDay = useMemo(() => {
    const map: Record<string, Meal[]> = {};
    for (const day of weekDays) {
      const key = format(day, 'yyyy-MM-dd');
      map[key] = (meals as Meal[]).filter(m => m.date.startsWith(key));
    }
    return map;
  }, [meals, weekDays]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchMeals(), refetchHistory()]);
    setRefreshing(false);
  };

  const openAddModal = (date?: string) => {
    const d = date ? new Date(date) : new Date();
    setForm({ ...emptyForm, date: d, servings: defaultServings });
    setPreselectedDate(date || null);
    setSelectedRecipe(null);
    setAddModal(true);
  };

  const openEditModal = (meal: Meal) => {
    setEditMeal(meal);
    setForm({
      name: meal.name,
      mealType: meal.mealType,
      date: new Date(meal.date.replace(' ', 'T')),
      servings: meal.servings || 4,
      notes: meal.notes || '',
      ingredients: meal.ingredients || '',
    });
    setAddModal(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) { Alert.alert('Erreur', 'Le nom est requis'); return; }
    const dateStr = format(form.date, 'yyyy-MM-dd HH:mm:ss');
    const payload = {
      name: form.name,
      mealType: form.mealType,
      date: dateStr,
      servings: form.servings,
      notes: form.notes || undefined,
      ingredients: form.ingredients || undefined,
    };
    if (editMeal) {
      updateMut.mutate({ mealId: editMeal.id, ...payload });
    } else {
      createMut.mutate({ familyId: 1, ...payload });
    }
  };

  const handleDelete = (meal: Meal) => {
    Alert.alert('Supprimer ?', `"${meal.name}"`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteMut.mutate({ mealId: meal.id }) },
    ]);
  };

  // ── Recherche de recettes TheMealDB ──────────────────────────────────────
  const searchRecipes = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) { setRecipeSuggestions([]); return; }
    setRecipeLoading(true);
    try {
      const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`);
      const data = await res.json();
      const rawMeals = (data.meals || []).slice(0, 5);
      const suggestions: RecipeSuggestion[] = rawMeals.map((m: any) => {
        const ingredients: string[] = [];
        for (let i = 1; i <= 20; i++) {
          const ing = (m[`strIngredient${i}`] || '').trim();
          const meas = (m[`strMeasure${i}`] || '').trim();
          if (ing) ingredients.push(meas ? `${meas} ${ing}` : ing);
        }
        return { id: m.idMeal, name: m.strMeal, category: m.strCategory, area: m.strArea, thumb: m.strMealThumb, ingredients };
      });
      setRecipeSuggestions(suggestions);
    } catch {
      Alert.alert('Erreur', 'Impossible de rechercher des recettes');
    } finally {
      setRecipeLoading(false);
    }
  }, []);

  const importRecipe = (recipe: RecipeSuggestion) => {
    setSelectedRecipe(recipe);
    setForm(p => ({
      ...p,
      name: recipe.name,
      ingredients: recipe.ingredients.join(', '),
    }));
    setRecipeModal(false);
    setRecipeSuggestions([]);
    setRecipeSearch('');
  };

  // ── Composant carte repas ─────────────────────────────────────────────────
  const MealCard = ({ meal }: { meal: Meal }) => (
    <View style={s.mealCard}>
      {meal.imageUrl ? (
        <Image source={{ uri: meal.imageUrl }} style={s.mealThumb} />
      ) : (
        <Text style={s.mealIcon}>{MEAL_ICONS[meal.mealType] || '🍽️'}</Text>
      )}
      <View style={{ flex: 1 }}>
        <Text style={s.mealName} numberOfLines={1}>{meal.name}</Text>
        <Text style={s.mealMeta}>{customLabels[meal.mealType] || meal.mealType} · {meal.servings || 4} pers.</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        <TouchableOpacity onPress={() => favoriteMut.mutate({ mealId: meal.id, isFavorite: !meal.isFavorite })} style={s.mealActionBtn}>
          <Text style={{ fontSize: 18 }}>{meal.isFavorite ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => openEditModal(meal)} style={s.mealActionBtn}>
          <Text style={{ fontSize: 16 }}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(meal)} style={s.mealActionBtn}>
          <Text style={{ fontSize: 16 }}>🗑</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Vue Semaine ───────────────────────────────────────────────────────────
  const WeekView = () => (
    <View>
      {/* Navigation semaine */}
      <View style={s.weekNav}>
        <TouchableOpacity onPress={() => setCurrentWeekStart(d => addDays(d, -7))} style={s.weekNavBtn}>
          <Text style={s.weekNavText}>◀</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))} style={s.weekTitleBtn}>
          <Text style={s.weekTitle}>
            {format(currentWeekStart, 'd MMM', { locale: getLocale() })} – {format(addDays(currentWeekStart, 6), 'd MMM yyyy', { locale: getLocale() })}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setCurrentWeekStart(d => addDays(d, 7))} style={s.weekNavBtn}>
          <Text style={s.weekNavText}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* Jours */}
      {weekDays.map(day => {
        const key = format(day, 'yyyy-MM-dd');
        const dayMeals = mealsByDay[key] || [];
        const isToday = isSameDay(day, new Date());
        return (
          <View key={key} style={[s.daySection, isToday && s.daySectionToday]}>
            <View style={s.dayHeader}>
              <Text style={[s.dayLabel, isToday && s.dayLabelToday]}>
                {format(day, 'EEEE d MMM', { locale: getLocale() })}
              </Text>
              <TouchableOpacity onPress={() => openAddModal(key)} style={s.addDayBtn}>
                <Text style={s.addDayBtnText}>+</Text>
              </TouchableOpacity>
            </View>
            {dayMeals.length === 0 ? (
              <TouchableOpacity onPress={() => openAddModal(key)} style={s.emptyDay}>
                <Text style={s.emptyDayText}>Appuyer pour ajouter un repas</Text>
              </TouchableOpacity>
            ) : (
              dayMeals.map((meal: Meal) => <MealCard key={meal.id} meal={meal} />)
            )}
          </View>
        );
      })}
    </View>
  );

  // ── Vue Historique ────────────────────────────────────────────────────────
  const HistoryView = () => {
    const favorites = (history as Meal[]).filter(m => m.isFavorite);
    const recent = (history as Meal[]).filter(m => !m.isFavorite);
    return (
      <View>
        {favorites.length > 0 && (
          <>
            <Text style={s.sectionTitle}>❤️ Favoris</Text>
            {favorites.map((meal: Meal) => (
              <View key={meal.id} style={s.historyCard}>
                <Text style={s.historyIcon}>{MEAL_ICONS[meal.mealType] || '🍽️'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.historyName} numberOfLines={1}>{meal.name}</Text>
                  <Text style={s.historyMeta}>{format(new Date(meal.date.replace(' ', 'T')), 'dd MMM yyyy', { locale: getLocale() })}</Text>
                </View>
                <TouchableOpacity onPress={() => { openAddModal(); setForm(p => ({ ...p, name: meal.name, mealType: meal.mealType, ingredients: meal.ingredients || '', notes: meal.notes || '' })); }} style={[s.mealActionBtn, { backgroundColor: '#ede9fe' }]}>
                  <Text style={{ fontSize: 14 }}>↩️</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => favoriteMut.mutate({ mealId: meal.id, isFavorite: false })} style={s.mealActionBtn}>
                  <Text style={{ fontSize: 18 }}>❤️</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
        {recent.length > 0 && (
          <>
            <Text style={s.sectionTitle}>🕐 Récents</Text>
            {recent.slice(0, 30).map((meal: Meal) => (
              <View key={meal.id} style={s.historyCard}>
                <Text style={s.historyIcon}>{MEAL_ICONS[meal.mealType] || '🍽️'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.historyName} numberOfLines={1}>{meal.name}</Text>
                  <Text style={s.historyMeta}>{format(new Date(meal.date.replace(' ', 'T')), 'dd MMM yyyy', { locale: getLocale() })}</Text>
                </View>
                <TouchableOpacity onPress={() => { openAddModal(); setForm(p => ({ ...p, name: meal.name, mealType: meal.mealType, ingredients: meal.ingredients || '', notes: meal.notes || '' })); }} style={[s.mealActionBtn, { backgroundColor: '#ede9fe' }]}>
                  <Text style={{ fontSize: 14 }}>↩️</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => favoriteMut.mutate({ mealId: meal.id, isFavorite: true })} style={s.mealActionBtn}>
                  <Text style={{ fontSize: 18 }}>🤍</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
        {favorites.length === 0 && recent.length === 0 && (
          <View style={s.emptyState}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🍽️</Text>
            <Text style={s.emptyText}>Aucun repas dans l'historique</Text>
          </View>
        )}
      </View>
    );
  };

  // ── Vue Paramètres ────────────────────────────────────────────────────────
  const SettingsView = () => (
    <View>
      <Text style={s.sectionTitle}>⚙️ Paramètres repas</Text>
      <View style={s.settingsCard}>
        <Text style={s.label}>Portions par défaut</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 }}>
          <TouchableOpacity style={s.counterBtn} onPress={() => setDefaultServings(p => Math.max(1, p - 1))}>
            <Text style={s.counterBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={s.counterValue}>{defaultServings}</Text>
          <TouchableOpacity style={s.counterBtn} onPress={() => setDefaultServings(p => p + 1)}>
            <Text style={s.counterBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text style={s.sectionTitle}>Libellés des repas</Text>
      {MEAL_TYPES.map(type => (
        <View key={type} style={s.settingsCard}>
          <Text style={s.label}>{MEAL_ICONS[type]} {DEFAULT_LABELS[type]}</Text>
          <TextInput
            style={[s.input, { marginTop: 6 }]}
            value={customLabels[type]}
            onChangeText={v => setCustomLabels(p => ({ ...p, [type]: v }))}
            placeholder={DEFAULT_LABELS[type]}
            placeholderTextColor="#9ca3af"
          />
        </View>
      ))}
    </View>
  );

  const content = (
    <>

      {/* Titre */}
      <View style={s.titleBar}>
        <Text style={s.title}>{t('tabs.meals') || 'Repas'}</Text>
      </View>

      {/* Bouton Ajouter */}
      <View style={s.newBtnContainer}>
        <TouchableOpacity style={s.newBtn} onPress={() => openAddModal()}>
          <Text style={s.newBtnText}>+ Ajouter un repas</Text>
        </TouchableOpacity>
      </View>

      {/* Onglets */}
      <View style={s.tabs}>
        {([
          { key: 'week', label: '📅 Semaine' },
          { key: 'history', label: '🕐 Historique' },
          { key: 'settings', label: '⚙️ Paramètres' },
        ] as { key: MealsTab; label: string }[]).map(({ key, label }) => (
          <TouchableOpacity key={key} style={[s.tab, mealsTab === key && s.tabActive]} onPress={() => setMealsTab(key)}>
            <Text style={[s.tabText, mealsTab === key && s.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7c3aed']} />}
        keyboardShouldPersistTaps="handled"
      >
        {mealsTab === 'week' && <WeekView />}
        {mealsTab === 'history' && <HistoryView />}
        {mealsTab === 'settings' && <SettingsView />}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* ══ MODAL Ajout / Modification repas ══ */}
      <Modal visible={addModal} animationType="slide" transparent onRequestClose={() => { setAddModal(false); setEditMeal(null); }}>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editMeal ? 'Modifier le repas' : 'Nouveau repas'}</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={[s.iconBtn, { backgroundColor: '#f3f4f6' }]} onPress={() => { setAddModal(false); setEditMeal(null); setSelectedRecipe(null); }}>
                  <Text style={s.iconBtnText}>✕</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.iconBtn, { backgroundColor: '#7c3aed' }]} onPress={handleSubmit} disabled={createMut.isPending || updateMut.isPending}>
                  <Text style={[s.iconBtnText, { color: '#fff' }]}>{(createMut.isPending || updateMut.isPending) ? '…' : '✓'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={{ padding: 16 }} keyboardShouldPersistTaps="handled">
              {/* Bouton recherche recette */}
              {!editMeal && (
                <TouchableOpacity style={s.recipeSearchBtn} onPress={() => setRecipeModal(true)}>
                  <Text style={s.recipeSearchBtnText}>🔍 Chercher une recette</Text>
                </TouchableOpacity>
              )}

              {/* Recette importée */}
              {selectedRecipe && (
                <View style={s.importedRecipe}>
                  <Image source={{ uri: selectedRecipe.thumb }} style={s.importedThumb} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.importedName} numberOfLines={2}>{selectedRecipe.name}</Text>
                    <Text style={s.importedMeta}>{selectedRecipe.category} · {selectedRecipe.area}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedRecipe(null)}>
                    <Text style={{ fontSize: 18, color: '#9ca3af' }}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Nom */}
              <View style={s.formGroup}>
                <Text style={s.label}>Nom *</Text>
                <TextInput style={s.input} placeholder="Nom du repas" placeholderTextColor="#9ca3af" value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} />
              </View>

              {/* Type de repas */}
              <View style={s.formGroup}>
                <Text style={s.label}>Type</Text>
                <TouchableOpacity style={s.pickerBtn} onPress={() => setMealTypeModal(true)}>
                  <Text style={s.pickerBtnText}>{MEAL_ICONS[form.mealType]} {customLabels[form.mealType]}</Text>
                  <Text style={{ color: '#9ca3af' }}>▼</Text>
                </TouchableOpacity>
              </View>

              {/* Date */}
              <View style={s.formGroup}>
                <Text style={s.label}>Date</Text>
                <TouchableOpacity style={s.pickerBtn} onPress={() => setShowDatePicker(true)}>
                  <Text style={s.pickerBtnText}>📅 {format(form.date, 'EEEE d MMMM yyyy', { locale: getLocale() })}</Text>
                  <Text style={{ color: '#9ca3af' }}>▼</Text>
                </TouchableOpacity>
              </View>

              {/* Heure */}
              <View style={s.formGroup}>
                <Text style={s.label}>Heure</Text>
                <TouchableOpacity style={s.pickerBtn} onPress={() => setShowTimePicker(true)}>
                  <Text style={s.pickerBtnText}>🕐 {format(form.date, 'HH:mm')}</Text>
                  <Text style={{ color: '#9ca3af' }}>▼</Text>
                </TouchableOpacity>
              </View>

              {/* Portions */}
              <View style={s.formGroup}>
                <Text style={s.label}>Portions</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
                  <TouchableOpacity style={s.counterBtn} onPress={() => setForm(p => ({ ...p, servings: Math.max(1, p.servings - 1) }))}>
                    <Text style={s.counterBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={s.counterValue}>{form.servings}</Text>
                  <TouchableOpacity style={s.counterBtn} onPress={() => setForm(p => ({ ...p, servings: p.servings + 1 }))}>
                    <Text style={s.counterBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Ingrédients */}
              <View style={s.formGroup}>
                <Text style={s.label}>Ingrédients</Text>
                <TextInput
                  style={[s.input, { height: 80, textAlignVertical: 'top' }]}
                  placeholder="Ingrédients (séparés par des virgules)..."
                  placeholderTextColor="#9ca3af"
                  value={form.ingredients}
                  onChangeText={v => setForm(p => ({ ...p, ingredients: v }))}
                  multiline
                />
              </View>

              {/* Notes */}
              <View style={s.formGroup}>
                <Text style={s.label}>Notes</Text>
                <TextInput
                  style={[s.input, { height: 60, textAlignVertical: 'top' }]}
                  placeholder="Notes..."
                  placeholderTextColor="#9ca3af"
                  value={form.notes}
                  onChangeText={v => setForm(p => ({ ...p, notes: v }))}
                  multiline
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ══ MODAL Recherche recettes ══ */}
      <Modal visible={recipeModal} animationType="slide" transparent onRequestClose={() => setRecipeModal(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { maxHeight: '85%' }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>🔍 Rechercher une recette</Text>
              <TouchableOpacity style={[s.iconBtn, { backgroundColor: '#f3f4f6' }]} onPress={() => { setRecipeModal(false); setRecipeSuggestions([]); setRecipeSearch(''); }}>
                <Text style={s.iconBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <TextInput
                  style={[s.input, { flex: 1 }]}
                  placeholder="Ex: chicken, pasta, beef..."
                  placeholderTextColor="#9ca3af"
                  value={recipeSearch}
                  onChangeText={setRecipeSearch}
                  onSubmitEditing={() => searchRecipes(recipeSearch)}
                  returnKeyType="search"
                  autoFocus
                />
                <TouchableOpacity style={s.addBtn} onPress={() => searchRecipes(recipeSearch)} disabled={recipeLoading}>
                  {recipeLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontSize: 16 }}>🔍</Text>}
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>
                Recherche en anglais recommandée (ex: "chicken", "pasta", "beef", "salmon")
              </Text>

              <ScrollView style={{ maxHeight: 400 }} keyboardShouldPersistTaps="handled">
                {recipeSuggestions.length === 0 && !recipeLoading && recipeSearch.length >= 2 && (
                  <View style={s.emptyState}>
                    <Text style={s.emptyText}>Aucune recette trouvée pour "{recipeSearch}"</Text>
                  </View>
                )}
                {recipeSuggestions.map(recipe => (
                  <TouchableOpacity key={recipe.id} style={s.recipeCard} onPress={() => importRecipe(recipe)}>
                    <Image source={{ uri: recipe.thumb }} style={s.recipeThumb} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.recipeName} numberOfLines={2}>{recipe.name}</Text>
                      <Text style={s.recipeMeta}>{recipe.category} · {recipe.area}</Text>
                      <Text style={s.recipeIngCount}>{recipe.ingredients.length} ingrédients</Text>
                    </View>
                    <View style={[s.importBtn]}>
                      <Text style={s.importBtnText}>Importer</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══ MODAL Type de repas ══ */}
      <Modal visible={mealTypeModal} animationType="fade" transparent onRequestClose={() => setMealTypeModal(false)}>
        <TouchableOpacity style={s.pickerOverlay} activeOpacity={1} onPress={() => setMealTypeModal(false)}>
          <View style={s.pickerModal}>
            <Text style={s.pickerTitle}>Type de repas</Text>
            {MEAL_TYPES.map(type => (
              <TouchableOpacity key={type} style={s.pickerOption} onPress={() => { setForm(p => ({ ...p, mealType: type })); setMealTypeModal(false); }}>
                <Text style={s.pickerOptionText}>{MEAL_ICONS[type]} {customLabels[type]}</Text>
                {form.mealType === type && <Text style={{ color: '#7c3aed', fontWeight: 'bold' }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* DateTimePicker */}
      {showDatePicker && (
        <DateTimePicker
          value={form.date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, d) => { setShowDatePicker(false); if (d) setForm(p => { const nd = new Date(d); nd.setHours(p.date.getHours(), p.date.getMinutes()); return { ...p, date: nd }; }); }}
        />
      )}
      {showTimePicker && (
        <DateTimePicker
          value={form.date}
          mode="time"
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, d) => { setShowTimePicker(false); if (d) setForm(p => { const nd = new Date(p.date); nd.setHours(d.getHours(), d.getMinutes()); return { ...p, date: nd }; }); }}
        />
      )}
    </>
  );

  if (embedded) return content;
  return (
    <SafeAreaView style={s.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {content}
    </SafeAreaView>
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
    titleBar: { backgroundColor: card, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: border, alignItems: 'center' },
    title: { fontSize: 22, fontWeight: 'bold', color: text },
    newBtnContainer: { padding: 10, backgroundColor: card, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: border },
    newBtn: { backgroundColor: '#7c3aed', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
    newBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
    tabs: { flexDirection: 'row', backgroundColor: card, paddingHorizontal: 10, paddingVertical: 8, gap: 6, borderBottomWidth: 1, borderBottomColor: border },
    tab: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: isDark ? '#374151' : '#f3f4f6', alignItems: 'center' },
    tabActive: { backgroundColor: '#7c3aed' },
    tabText: { fontSize: 11, color: subtext, fontWeight: '500' },
    tabTextActive: { color: '#fff', fontWeight: '700' },
    content: { flex: 1, paddingHorizontal: 10, paddingTop: 8 },
    emptyState: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 32 },
    emptyText: { fontSize: 15, color: subtext, textAlign: 'center', marginBottom: 16 },

    // Semaine
    weekNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    weekNavBtn: { padding: 10, borderRadius: 8, backgroundColor: card, borderWidth: 1, borderColor: border },
    weekNavText: { fontSize: 18, color: '#7c3aed' },
    weekTitleBtn: { flex: 1, alignItems: 'center', paddingVertical: 8 },
    weekTitle: { fontSize: 14, fontWeight: '600', color: text },
    daySection: { backgroundColor: card, borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: border },
    daySectionToday: { borderColor: '#7c3aed', borderWidth: 2 },
    dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    dayLabel: { fontSize: 14, fontWeight: '600', color: text, textTransform: 'capitalize' },
    dayLabelToday: { color: '#7c3aed' },
    addDayBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' },
    addDayBtnText: { color: '#fff', fontSize: 20, lineHeight: 26 },
    emptyDay: { paddingVertical: 12, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: border, borderStyle: 'dashed' },
    emptyDayText: { fontSize: 13, color: subtext },

    // Carte repas
    mealCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#111827' : '#f9fafb', borderRadius: 10, padding: 8, marginBottom: 6, gap: 8 },
    mealIcon: { fontSize: 24, width: 36, textAlign: 'center' },
    mealThumb: { width: 36, height: 36, borderRadius: 8 },
    mealName: { fontSize: 14, fontWeight: '600', color: text },
    mealMeta: { fontSize: 12, color: subtext },
    mealActionBtn: { padding: 6, borderRadius: 8, backgroundColor: isDark ? '#374151' : '#f3f4f6' },

    // Historique
    sectionTitle: { fontSize: 16, fontWeight: '700', color: text, marginBottom: 8, marginTop: 4 },
    historyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: card, borderRadius: 10, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: border, gap: 8 },
    historyIcon: { fontSize: 22, width: 30, textAlign: 'center' },
    historyName: { fontSize: 14, fontWeight: '600', color: text },
    historyMeta: { fontSize: 12, color: subtext },

    // Paramètres
    settingsCard: { backgroundColor: card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: border },
    counterBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' },
    counterBtnText: { color: '#fff', fontSize: 20, fontWeight: 'bold', lineHeight: 24 },
    counterValue: { fontSize: 20, fontWeight: 'bold', color: text, minWidth: 30, textAlign: 'center' },

    // Modaux
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: card, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 30, maxHeight: '92%' },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderBottomWidth: 1, borderBottomColor: border },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: text, flex: 1 },
    iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    iconBtnText: { fontSize: 16, fontWeight: 'bold', color: '#374151' },

    // Formulaire
    formGroup: { marginBottom: 14 },
    label: { fontSize: 13, fontWeight: '600', color: text, marginBottom: 5 },
    input: { backgroundColor: inputBg, borderRadius: 10, padding: 11, fontSize: 15, color: text, borderWidth: 1, borderColor: border },
    pickerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: inputBg, borderRadius: 10, padding: 11, borderWidth: 1, borderColor: border },
    pickerBtnText: { fontSize: 15, color: text, flex: 1 },
    addBtn: { backgroundColor: '#7c3aed', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },

    // Recherche recette
    recipeSearchBtn: { backgroundColor: '#ede9fe', borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: '#c4b5fd' },
    recipeSearchBtnText: { fontSize: 15, color: '#7c3aed', fontWeight: '600' },
    importedRecipe: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f3ff', borderRadius: 10, padding: 10, marginBottom: 14, gap: 10, borderWidth: 1, borderColor: '#c4b5fd' },
    importedThumb: { width: 50, height: 50, borderRadius: 8 },
    importedName: { fontSize: 14, fontWeight: '600', color: '#5b21b6' },
    importedMeta: { fontSize: 12, color: '#7c3aed' },
    recipeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#374151' : '#f9fafb', borderRadius: 12, padding: 10, marginBottom: 8, gap: 10, borderWidth: 1, borderColor: border },
    recipeThumb: { width: 60, height: 60, borderRadius: 10 },
    recipeName: { fontSize: 14, fontWeight: '600', color: text },
    recipeMeta: { fontSize: 12, color: subtext },
    recipeIngCount: { fontSize: 11, color: '#7c3aed', marginTop: 2 },
    importBtn: { backgroundColor: '#7c3aed', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
    importBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },

    // Picker modal
    pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    pickerModal: { backgroundColor: card, borderRadius: 16, padding: 18, width: '85%' },
    pickerTitle: { fontSize: 17, fontWeight: 'bold', color: text, marginBottom: 12 },
    pickerOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 6, borderRadius: 8, marginBottom: 2 },
    pickerOptionText: { fontSize: 15, color: text },
  });
}
