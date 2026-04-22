/**
 * MealsScreen — Onglet Repas
 * Connecté à la BD via tRPC (routes meals.*)
 * - Vue semaine avec navigation ◀/▶
 * - Historique + Favoris
 * - Paramètres : heures par type, portions, labels (AsyncStorage)
 * - Import recette depuis URL (trpc.meals.importFromUrl)
 * - Recherche TheMealDB (5 suggestions max)
 * - Ajout ingrédients aux courses (trpc.shopping.addItemsMerged)
 */
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, Modal,
  StyleSheet, ScrollView, Alert, ActivityIndicator, Switch, Image, Share} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { trpc } from '../lib/trpc';
import { useFamily } from '../contexts/FamilyContext';
import {
  format, addDays, startOfWeek, endOfWeek, isSameDay, parseISO, addWeeks, subWeeks} from 'date-fns';
import { fr, de, enUS } from 'date-fns/locale';

// ─── Types ────────────────────────────────────────────────────────────────────
type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
type MealsTab = 'week' | 'history' | 'settings';

interface Meal {
  id: number;
  name: string;
  date: string;
  mealType: MealType;
  servings?: number;
  notes?: string;
  imageUrl?: string;
  sourceUrl?: string;
  isFavorite?: boolean | number;
  isCompleted?: boolean | number;
  assignedTo?: number;
  familyId?: number;
}

// Spoonacular remplace TheMealDB pour le support multilingue FR/EN/DE
interface SpoonacularResult {
  id: number;
  title: string;
  image: string;
  imageType: string;
}

const SPOONACULAR_API_KEY = 'b52af068607649b1b2503e9fb8b25888';

const DEFAULT_TIMES: Record<MealType, string> = {
  breakfast: '08:00',
  lunch: '12:00',
  dinner: '19:00',
  snack: '16:00'};

// Labels traduits via t() dans le composant — DEFAULT_LABELS est un fallback statique
const DEFAULT_LABELS: Record<MealType, string> = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner',
  dinner: 'Dîner',
  snack: 'Collation'};

// Helper pour obtenir les labels traduits (utilisé dans le composant)
const getMealLabels = (t: (key: string) => string): Record<MealType, string> => ({
  breakfast: t('meals.breakfast'),
  lunch: t('meals.lunch'),
  dinner: t('meals.dinner'),
  snack: t('meals.snack') || 'Collation',
});

const MEAL_EMOJIS: Record<MealType, string> = {
  breakfast: '☀️',
  lunch: '🥗',
  dinner: '🍽️',
  snack: '🍎'};

// ─── Composant principal ──────────────────────────────────────────────────────
export default function MealsScreen({
  embedded = false,
  externalTab,
  onTabChange,
  triggerCreate = 0,
}: {
  embedded?: boolean;
  externalTab?: 'week' | 'history' | 'settings';
  onTabChange?: (tab: 'week' | 'history' | 'settings') => void;
  triggerCreate?: number;
} = {}) {
  const { isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const s = getStyles(isDark);
  const utils = trpc.useUtils();

  // ─── Locale date-fns ───────────────────────────────────────────────────────
  const dateFnsLocale = i18n.language === 'de' ? de : i18n.language === 'en' ? enUS : fr;

  // ─── Famille ───────────────────────────────────────────────────────────────
  const { activeFamilyId: ctxFamilyId } = useFamily();
  const { data: families = [] } = trpc.family.list.useQuery();
  const activeFamily = ctxFamilyId ? (families as any[]).find((f: any) => f.id === ctxFamilyId) ?? families[0] : families[0];
  const familyId = activeFamily?.id;

  // ─── Membres ───────────────────────────────────────────────────────────────
  const { data: members = [] } = trpc.family.members.useQuery(
    { familyId: familyId! },
    { enabled: !!familyId }
  );

  // ─── Onglets ───────────────────────────────────────────────────────────────
  const [internalTab, setInternalTab] = useState<MealsTab>('week');
  const tab = externalTab ?? internalTab;
  const setTab = (t: MealsTab) => {
    setInternalTab(t);
    onTabChange?.(t);
  };
  const prevTriggerCreate = React.useRef(0);

  // ─── Déplacer un repas vers un autre jour ────────────────────────────────
  const [movingMeal, setMovingMeal] = useState<Meal | null>(null);
  const scrollOffsetRef = useRef(0);

  const moveMealToDay = useCallback(async (meal: Meal, targetDay: Date) => {
    if (isSameDay(parseISO(meal.date), targetDay)) return;
    const newDate = format(targetDay, "yyyy-MM-dd'T'HH:mm:ss");
    try {
      await updateMeal.mutateAsync({ mealId: meal.id, date: newDate });
      setMovingMeal(null);
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Impossible de déplacer le repas');
    }
  }, [updateMeal]);

  // ─── Semaine courante ──────────────────────────────────────────────────────
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  // ─── Repas de la semaine ───────────────────────────────────────────────────
  const { data: weekMeals = [], isLoading: mealsLoading } = trpc.meals.list.useQuery(
    { familyId: familyId!, startDate: format(weekStart, 'yyyy-MM-dd'), endDate: format(weekEnd, 'yyyy-MM-dd') + ' 23:59:59' },
    { enabled: !!familyId }
  );

  // ─── Historique ────────────────────────────────────────────────────────────
  const { data: historyMeals = [], isLoading: historyLoading } = trpc.meals.history.useQuery(
    { familyId: familyId!, limit: 50 },
    { enabled: !!familyId && tab === 'history' }
  );

  // ─── Favoris ───────────────────────────────────────────────────────────────
  const { data: favoriteMeals = [] } = trpc.meals.favorites.useQuery(
    { familyId: familyId! },
    { enabled: !!familyId && tab === 'history' }
  );

  // ─── Paramètres (AsyncStorage) ─────────────────────────────────────────────
  const [defaultServings, setDefaultServings] = useState(4);
  const mealLabels = getMealLabels(t);
  const [customLabels, setCustomLabels] = useState<Record<MealType, string>>({ ...mealLabels });
  const [customTimes, setCustomTimes] = useState<Record<MealType, string>>({ ...DEFAULT_TIMES });

  useEffect(() => {
    if (!familyId) return;
    const loadSettings = async () => {
      try {
        const [srv, lbl, tms] = await Promise.all([
          AsyncStorage.getItem(`mealSettings_${familyId}_servings`),
          AsyncStorage.getItem(`mealSettings_${familyId}_labels`),
          AsyncStorage.getItem(`mealSettings_${familyId}_times`),
        ]);
        if (srv) setDefaultServings(Number(srv));
        if (lbl) setCustomLabels(JSON.parse(lbl));
        if (tms) setCustomTimes(JSON.parse(tms));
      } catch {}
    };
    loadSettings();
  }, [familyId]);

  const saveSettings = useCallback(async () => {
    if (!familyId) return;
    await Promise.all([
      AsyncStorage.setItem(`mealSettings_${familyId}_servings`, String(defaultServings)),
      AsyncStorage.setItem(`mealSettings_${familyId}_labels`, JSON.stringify(customLabels)),
      AsyncStorage.setItem(`mealSettings_${familyId}_times`, JSON.stringify(customTimes)),
    ]);
    Alert.alert('✓', t('common.saved') || 'Paramètres sauvegardés');
  }, [familyId, defaultServings, customLabels, customTimes]);

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const createMeal = trpc.meals.create.useMutation({ onSuccess: () => utils.meals.list.invalidate() });
  const updateMeal = trpc.meals.update.useMutation({ onSuccess: () => { utils.meals.list.invalidate(); utils.meals.history.invalidate(); } });
  const deleteMeal = trpc.meals.delete.useMutation({ onSuccess: () => { utils.meals.list.invalidate(); utils.meals.history.invalidate(); } });
  const toggleFavorite = trpc.meals.toggleFavorite.useMutation({ onSuccess: () => { utils.meals.history.invalidate(); utils.meals.favorites.invalidate(); } });
  const importFromUrl = trpc.meals.importFromUrl.useMutation();
  const translateRecipeMutation = trpc.meals.translateRecipe.useMutation();
  const [translating, setTranslating] = useState(false);
  const addItemsMerged = trpc.shopping.addItemsMerged.useMutation();

  // ─── Listes de courses (pour ajouter ingrédients) ─────────────────────────
  const { data: shoppingLists = [] } = trpc.shopping.listsByFamily.useQuery(
    { familyId: familyId! },
    { enabled: !!familyId }
  );
  const activeLists = useMemo(() => shoppingLists.filter((l: any) => !l.isArchived), [shoppingLists]);

  // ─── Autocomplétion depuis l'historique ─────────────────────────────────────
  const [historySuggestions, setHistorySuggestions] = useState<string[]>([]);

  const filterHistorySuggestions = useCallback((query: string) => {
    if (query.length < 2) { setHistorySuggestions([]); return; }
    const q = query.toLowerCase();
    const allMeals = [
      ...(historyMeals as Meal[]),
      ...(favoriteMeals as Meal[]),
      ...(weekMeals as Meal[]),
    ];
    const seen = new Set<string>();
    const matches: string[] = [];
    for (const m of allMeals) {
      const name = m.name?.trim();
      if (name && name.toLowerCase().includes(q) && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        matches.push(name);
        if (matches.length >= 6) break;
      }
    }
    setHistorySuggestions(matches);
  }, [historyMeals, favoriteMeals, weekMeals]);

  // ─── Formulaire repas ──────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [form, setForm] = useState({
    name: '',
    mealType: 'dinner' as MealType,
    servings: defaultServings,
    notes: '',
    sourceUrl: '',
    imageUrl: '',
    ingredients: [] as string[]});

  const openCreate = (day?: Date) => {
    setEditingMeal(null);
    setSelectedDay(day || new Date());
    setForm({ name: '', mealType: 'dinner', servings: defaultServings, notes: '', sourceUrl: '', imageUrl: '', ingredients: [] });
    setShowForm(true);
    setRecipeSearch('');
    setRecipeSuggestions([]);
    setHistorySuggestions([]);
    setImportUrl('');
    setImportResult(null);
  };

  // Trigger create from parent action bar
  React.useEffect(() => {
    if (triggerCreate > 0 && triggerCreate !== prevTriggerCreate.current) {
      prevTriggerCreate.current = triggerCreate;
      openCreate();
    }
  }, [triggerCreate]);

  const shareMeal = async (meal: Meal) => {
    const lines: string[] = [];
    lines.push(`🍽️ ${meal.name}`);
    lines.push(`${customLabels[meal.mealType]} · ${meal.servings || 2} ${t('meals.servings') || 'pers.'}`);
    const notes = meal.notes || '';
    // Extraire les ingrédients depuis les notes si présents
    const ingredientMatch = notes.match(/Ingrédients\s*:\s*([\s\S]*?)(?:\n\n|Instructions|$)/i);
    if (ingredientMatch) {
      lines.push('');
      lines.push(`🥕 ${t('meals.ingredients') || 'Ingrédients'} :`);
      lines.push(ingredientMatch[1].trim());
    } else if (notes.trim()) {
      lines.push('');
      lines.push(notes.substring(0, 300));
    }
    if (meal.sourceUrl) {
      lines.push('');
      lines.push(`🔗 ${meal.sourceUrl}`);
    }
    const message = lines.join('\n');
    try {
      await Share.share({ message, title: meal.name });
    } catch (e) {
      // ignoré si l'utilisateur annule
    }
  };

  const openEdit = (meal: Meal) => {
    setEditingMeal(meal);
    setSelectedDay(parseISO(meal.date));
    setForm({
      name: meal.name,
      mealType: meal.mealType,
      servings: meal.servings || defaultServings,
      notes: meal.notes || '',
      sourceUrl: meal.sourceUrl || '',
      imageUrl: meal.imageUrl || '',
      ingredients: []});
    setShowForm(true);
    setRecipeSearch('');
    setRecipeSuggestions([]);
    setImportUrl('');
    setImportResult(null);
  };

  const saveMeal = async () => {
    if (!form.name.trim() || !familyId) return;
    const mealTime = customTimes[form.mealType] || DEFAULT_TIMES[form.mealType];
    const dateStr = format(selectedDay, 'yyyy-MM-dd') + 'T' + mealTime + ':00';

    // Construire les notes en incluant les ingrédients en tête si présents
    let finalNotes = form.notes || '';
    if (form.ingredients.length > 0) {
      const ingSection = `Ingrédients :\n${form.ingredients.map(i => `• ${i}`).join('\n')}`;
      // Si des notes manuelles existent et ne contiennent pas déjà une section ingrédients
      if (finalNotes && !finalNotes.toLowerCase().includes('ingrédient')) {
        finalNotes = ingSection + '\n\n' + finalNotes;
      } else if (!finalNotes) {
        finalNotes = ingSection;
      }
      // Si notes contient déjà une section ingrédients (import URL), on garde les notes telles quelles
    }

    if (editingMeal) {
      await updateMeal.mutateAsync({
        mealId: editingMeal.id,
        name: form.name.trim(),
        mealType: form.mealType,
        date: dateStr,
        servings: form.servings,
        notes: finalNotes || undefined,
        sourceUrl: form.sourceUrl || undefined,
        imageUrl: form.imageUrl || undefined});
    } else {
      await createMeal.mutateAsync({
        familyId,
        name: form.name.trim(),
        mealType: form.mealType,
        date: dateStr,
        servings: form.servings,
        notes: finalNotes || undefined,
        sourceUrl: form.sourceUrl || undefined,
        imageUrl: form.imageUrl || undefined});
    }
    setShowForm(false);
  };

  // ─── Recherche TheMealDB ───────────────────────────────────────────────────
  const [recipeSearch, setRecipeSearch] = useState('');
  const [recipeSuggestions, setRecipeSuggestions] = useState<SpoonacularResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const searchRecipes = useCallback(async (query: string) => {
    if (query.length < 2) { setRecipeSuggestions([]); return; }
    setSearchLoading(true);
    try {
      // Spoonacular supporte FR, EN, DE nativement via le paramètre 'language'
      const lang = i18n.language === 'de' ? 'de' : i18n.language === 'fr' ? 'fr' : 'en';
      const url = `https://api.spoonacular.com/recipes/complexSearch?query=${encodeURIComponent(query)}&language=${lang}&number=6&apiKey=${SPOONACULAR_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      setRecipeSuggestions((data.results || []).slice(0, 6));
    } catch {
      setRecipeSuggestions([]);
    } finally {
      setSearchLoading(false);
    }
  }, [i18n.language]);

  useEffect(() => {
    const timer = setTimeout(() => searchRecipes(recipeSearch), 500);
    return () => clearTimeout(timer);
  }, [recipeSearch]);

  const importFromSpoonacular = async (recipe: SpoonacularResult) => {
    // Récupérer les détails complets de la recette (ingrédients, instructions)
    setSearchLoading(true);
    let ingredients: string[] = [];
    let notes = '';
    try {
      // Toujours récupérer en anglais (base Spoonacular), on traduira ensuite
      const res = await fetch(`https://api.spoonacular.com/recipes/${recipe.id}/information?apiKey=${SPOONACULAR_API_KEY}`);
      const data = await res.json();
      ingredients = (data.extendedIngredients || []).map((ing: any) => {
        const amount = ing.amount ? `${ing.amount} ${ing.unit || ''}`.trim() : '';
        return amount ? `${amount} ${ing.name}` : ing.name;
      });
      notes = data.instructions ? data.instructions.replace(/<[^>]+>/g, '').substring(0, 1000) : '';
    } catch {
      // Fallback : juste le titre et l'image
      setForm(p => ({ ...p, name: recipe.title, imageUrl: recipe.image || '' }));
      setSearchLoading(false);
      setRecipeSuggestions([]);
      setRecipeSearch('');
      return;
    } finally {
      setSearchLoading(false);
    }
    // Traduire si la langue n'est pas l'anglais
    const userLang = i18n.language === 'de' ? 'de' : i18n.language === 'fr' ? 'fr' : 'en';
    if (userLang !== 'en' && (ingredients.length > 0 || notes)) {
      setTranslating(true);
      try {
        const translated = await translateRecipeMutation.mutateAsync({
          ingredients,
          instructions: notes,
          targetLang: userLang,
        });
        ingredients = translated.ingredients;
        notes = translated.instructions;
      } catch {
        // En cas d'erreur de traduction, garder les données originales
      } finally {
        setTranslating(false);
      }
    }
    setForm(p => ({
      ...p,
      name: recipe.title,
      ingredients,
      imageUrl: recipe.image || '',
      notes,
      sourceUrl: `https://spoonacular.com/recipes/${recipe.title.toLowerCase().replace(/\s+/g, '-')}-${recipe.id}`,
    }));
    setRecipeSuggestions([]);
    setRecipeSearch('');
  };

  // ─── Import depuis URL ─────────────────────────────────────────────────────
  const [importUrl, setImportUrl] = useState('');
  const [importResult, setImportResult] = useState<any>(null);
  const [importLoading, setImportLoading] = useState(false);

  const doImportFromUrl = async () => {
    if (!importUrl.trim()) return;
    setImportLoading(true);
    try {
      const result = await importFromUrl.mutateAsync({ url: importUrl.trim() });
      setImportResult(result);
      setForm(p => ({
        ...p,
        name: result.name || p.name,
        mealType: result.mealType || p.mealType,
        servings: result.servings || p.servings,
        notes: result.notes || p.notes,
        sourceUrl: importUrl.trim(),
        imageUrl: result.image || p.imageUrl,
        ingredients: result.ingredients || []}));
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Import impossible');
    } finally {
      setImportLoading(false);
    }
  };

  // ─── Ajout ingrédients aux courses ────────────────────────────────────────
  const [showAddToShopping, setShowAddToShopping] = useState(false);
  const [ingredientsToAdd, setIngredientsToAdd] = useState<string[]>([]);
  const [targetMealForShopping, setTargetMealForShopping] = useState<Meal | null>(null);

  const openAddToShopping = (meal: Meal) => {
    // Parser les ingrédients depuis les notes (toutes formes possibles)
    // Note: les ingrédients sont toujours stockés dans notes au format "Ingrédients :\n• ..."
    const notes = meal.notes || '';
    const lines = notes.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let ingLines: string[] = [];

    // 1. Format importé : section "Ingrédients" avec lignes en "• "
    const ingHeaderIdx = lines.findIndex(l =>
      l.toLowerCase().includes('ingrédient') || l.toLowerCase().includes('ingredient')
    );
    if (ingHeaderIdx >= 0) {
      const endIdx = lines.findIndex((l, i) =>
        i > ingHeaderIdx && (
          l.toLowerCase().includes('préparation') ||
          l.toLowerCase().includes('preparation') ||
          l.toLowerCase().includes('instruction') ||
          l.toLowerCase().includes('étape') ||
          l.toLowerCase().includes('temps')
        )
      );
      const section = lines.slice(ingHeaderIdx + 1, endIdx > 0 ? endIdx : undefined);
      ingLines = section
        .filter(l => l.startsWith('•') || l.startsWith('-') || l.startsWith('*') || /^\d+\./.test(l))
        .map(l => l.replace(/^[•\-\*]\s*/, '').replace(/^\d+\.\s*/, '').trim())
        .filter(l => l.length > 0);
    }

    // 2. Format manuel : toutes les lignes commençant par • - * ou numéro
    if (ingLines.length === 0) {
      ingLines = lines
        .filter(l => l.startsWith('•') || l.startsWith('-') || l.startsWith('*') || /^\d+\./.test(l))
        .map(l => l.replace(/^[•\-\*]\s*/, '').replace(/^\d+\.\s*/, '').trim())
        .filter(l => l.length > 0);
    }

    // 3. Fallback : toutes les lignes non vides (si pas de marqueurs)
    if (ingLines.length === 0 && lines.length > 0) {
      // Prendre toutes les lignes courtes (< 60 chars) qui ressemblent à des ingrédients
      ingLines = lines
        .filter(l => l.length < 60 && !l.endsWith(':') && !l.toLowerCase().includes('préparation'))
        .slice(0, 20);
    }

    setIngredientsToAdd(ingLines);
    setTargetMealForShopping(meal);
    setShowAddToShopping(true);
  };

  const doAddToShopping = async (listId: number) => {
    if (!ingredientsToAdd.length) return;
    await addItemsMerged.mutateAsync({
      listId,
      items: ingredientsToAdd.map(name => ({ name }))});
    setShowAddToShopping(false);
    Alert.alert('✓', `${ingredientsToAdd.length} ingrédient(s) ajouté(s) à la liste`);
  };

  const renderMealCard = (meal: Meal) => (
    <View key={meal.id} style={s.mealCard}>
      {meal.imageUrl ? (
        <Image
          source={{ uri: meal.imageUrl }}
          style={{ width: '100%', height: 120, borderRadius: 8, marginBottom: 8 }}
          resizeMode="cover"
        />
      ) : null}
      <View style={s.mealCardHeader}>
        <Text style={s.mealEmoji}>{MEAL_EMOJIS[meal.mealType]}</Text>
        <View style={s.mealCardInfo}>
          <Text style={s.mealName} numberOfLines={1}>{meal.name}</Text>
          <Text style={s.mealMeta}>{customLabels[meal.mealType]} · {meal.servings} pers.</Text>
        </View>
        <View style={s.mealCardActions}>
          <TouchableOpacity onPress={() => toggleFavorite.mutate({ mealId: meal.id, isFavorite: !meal.isFavorite })}>
            <Text style={s.mealActionBtn}>{meal.isFavorite ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => shareMeal(meal)}>
            <Text style={s.mealActionBtn}>📤</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openAddToShopping(meal)}>
            <Text style={s.mealActionBtn}>🛒</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => openEdit(meal)}
          >
            <Text style={s.mealActionBtn}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Alert.alert(t('common.delete') || 'Supprimer', meal.name, [
            { text: t('common.cancel') || 'Annuler', style: 'cancel' },
            { text: '🗑', style: 'destructive', onPress: () => deleteMeal.mutate({ mealId: meal.id }) },
          ])}>
            <Text style={s.mealActionBtn}>🗑</Text>
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity
        style={s.moveMealBtn}
        onPress={() => setMovingMeal(meal)}
      >
        <Text style={s.moveMealBtnText}>⋮ {t('meals.moveTo') || 'Déplacer vers...'}</Text>
      </TouchableOpacity>
    </View>
  );

  // ─── Vue semaine ─────────────────────────────────────────────────────────────
  const renderWeekView = () => (
    <View style={s.weekContainer}>
      {/* Navigation semaine */}
      <View style={s.weekNav}>
        <TouchableOpacity onPress={() => setWeekStart(w => subWeeks(w, 1))} style={s.weekNavBtn}>
          <Text style={s.weekNavBtnText}>◀</Text>
        </TouchableOpacity>
        <Text style={s.weekLabel}>
          {format(weekStart, 'd MMM', { locale: dateFnsLocale })} – {format(weekEnd, 'd MMM yyyy', { locale: dateFnsLocale })}
        </Text>
        <TouchableOpacity onPress={() => setWeekStart(w => addWeeks(w, 1))} style={s.weekNavBtn}>
          <Text style={s.weekNavBtnText}>▶</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        onScroll={e => { scrollOffsetRef.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
      >
        {weekDays.map(day => {
          const isToday = isSameDay(day, new Date());
          const dayMeals = (weekMeals as Meal[]).filter(m => {
            try { return isSameDay(parseISO(m.date), day); } catch { return false; }
          });
          return (
            <View
              key={day.toISOString()}
              style={[s.dayBlock, isToday && s.dayBlockToday]}
            >
              <View style={s.dayHeader}>
                <Text style={[s.dayName, isToday && s.dayNameToday]}>
                  {format(day, 'EEE d', { locale: dateFnsLocale })}
                </Text>
                <TouchableOpacity onPress={() => openCreate(day)} style={s.addDayBtn}>
                  <Text style={s.addDayBtnText}>+</Text>
                </TouchableOpacity>
              </View>
              {dayMeals.length === 0 ? (
                <Text style={s.noMealText}>{t('meals.noMeal') || 'Aucun repas'}</Text>
              ) : (
                dayMeals.map(renderMealCard)
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );

  // ─── Vue historique ────────────────────────────────────────────────────────
  const renderHistoryView = () => (
    <ScrollView contentContainerStyle={{ padding: 12 }}>
      {favoriteMeals.length > 0 && (
        <>
          <Text style={s.sectionTitle}>❤️ {t('meals.favorites') || 'Favoris'}</Text>
          {(favoriteMeals as Meal[]).map(renderMealCard)}
        </>
      )}
      <Text style={s.sectionTitle}>🕐 {t('meals.history') || 'Historique'}</Text>
      {historyLoading ? <ActivityIndicator color="#7c3aed" /> : (
        (historyMeals as Meal[]).length === 0
          ? <Text style={s.emptyText}>{t('meals.noHistory') || 'Aucun repas dans l\'historique'}</Text>
          : (historyMeals as Meal[]).map(m => (
            <View key={m.id}>
              {renderMealCard(m)}
              <TouchableOpacity style={s.reuseBtn} onPress={() => {
                setEditingMeal(null);
                setSelectedDay(new Date());
                // Extraire les ingrédients depuis les notes du repas historique
                const extractedIngredients: string[] = [];
                const notes = m.notes || '';
                const lines = notes.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
                const ingHeaderIdx = lines.findIndex((l: string) =>
                  l.toLowerCase().includes('ingrédient') || l.toLowerCase().includes('ingredient')
                );
                if (ingHeaderIdx >= 0) {
                  const endIdx = lines.findIndex((l: string, i: number) =>
                    i > ingHeaderIdx && (l.toLowerCase().includes('préparation') || l.toLowerCase().includes('preparation') || l.toLowerCase().includes('instruction'))
                  );
                  const section = lines.slice(ingHeaderIdx + 1, endIdx > 0 ? endIdx : undefined);
                  section.filter((l: string) => l.startsWith('•') || l.startsWith('-') || l.startsWith('*'))
                    .forEach((l: string) => extractedIngredients.push(l.replace(/^[•\-\*]\s*/, '').trim()));
                }
                setForm({
                  name: m.name,
                  mealType: m.mealType,
                  servings: m.servings || defaultServings,
                  notes: '',
                  sourceUrl: m.sourceUrl || '',
                  imageUrl: m.imageUrl || '',
                  ingredients: extractedIngredients
                });
                setShowForm(true);
                setRecipeSearch('');
                setRecipeSuggestions([]);
                setHistorySuggestions([]);
                setImportUrl('');
                setImportResult(null);
              }}>
                <Text style={s.reuseBtnText}>↩️ {t('meals.reuse') || 'Réutiliser'}</Text>
              </TouchableOpacity>
            </View>
          ))
      )}
    </ScrollView>
  );

  // ─── Vue paramètres ────────────────────────────────────────────────────────
  const renderSettingsView = () => (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={s.sectionTitle}>{t('meals.defaultServings') || 'Portions par défaut'}</Text>
      <View style={s.settingsRow}>
        <TouchableOpacity onPress={() => setDefaultServings(v => Math.max(1, v - 1))} style={s.counterBtn}>
          <Text style={s.counterBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={s.counterValue}>{defaultServings}</Text>
        <TouchableOpacity onPress={() => setDefaultServings(v => v + 1)} style={s.counterBtn}>
          <Text style={s.counterBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.sectionTitle}>{t('meals.mealTimes') || 'Heures des repas'}</Text>
      {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map(type => (
        <View key={type} style={s.settingsRow}>
          <Text style={s.settingsLabel}>{MEAL_EMOJIS[type]} {customLabels[type]}</Text>
          <TextInput
            style={[s.timeInput]}
            value={customTimes[type]}
            onChangeText={v => setCustomTimes(p => ({ ...p, [type]: v }))}
            placeholder="HH:MM"
            placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
            keyboardType="numbers-and-punctuation"
            maxLength={5}
          />
        </View>
      ))}

      <Text style={s.sectionTitle}>{t('meals.mealLabels') || 'Labels personnalisés'}</Text>
      {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map(type => (
        <View key={type} style={s.settingsRow}>
          <Text style={s.settingsLabel}>{MEAL_EMOJIS[type]}</Text>
          <TextInput
            style={[s.labelInput]}
            value={customLabels[type]}
            onChangeText={v => setCustomLabels(p => ({ ...p, [type]: v }))}
            placeholder={DEFAULT_LABELS[type]}
            placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
          />
        </View>
      ))}

      <TouchableOpacity style={s.saveSettingsBtn} onPress={saveSettings}>
        <Text style={s.saveSettingsBtnText}>✓ {t('common.save') || 'Sauvegarder'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // ─── Formulaire repas (modal) ──────────────────────────────────────────────
  const renderForm = () => (
    <Modal visible={showForm} transparent animationType="slide">
      <View style={s.overlay}>
        <ScrollView contentContainerStyle={s.formScroll}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>
              {editingMeal ? (t('meals.editMeal') || 'Modifier le repas') : (t('meals.newMeal') || 'Nouveau repas')}
            </Text>

            {/* Nom avec autocomplétion depuis l'historique */}
            <Text style={s.label}>{t('common.name') || 'Nom'}</Text>
            <TextInput
              style={s.input}
              value={form.name}
              onChangeText={n => {
                setForm(p => ({ ...p, name: n }));
                filterHistorySuggestions(n);
              }}
              placeholder={t('meals.mealName') || 'Nom du repas'}
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
            />
            {historySuggestions.length > 0 && (
              <View style={s.historySuggestions}>
                {historySuggestions.map((name, i) => (
                  <TouchableOpacity
                    key={i}
                    style={s.historySuggestionItem}
                    onPress={() => {
                      setForm(p => ({ ...p, name }));
                      setHistorySuggestions([]);
                    }}
                  >
                    <Text style={s.historySuggestionEmoji}>🕐</Text>
                    <Text style={s.historySuggestionText}>{name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Recherche Spoonacular — multilingue FR/EN/DE */}
            <Text style={s.label}>🔍 {t('meals.searchRecipe') || 'Rechercher une recette'}</Text>
            <TextInput
              style={s.input}
              value={recipeSearch}
              onChangeText={setRecipeSearch}
              placeholder={
                i18n.language === 'de' ? 'z.B. Apfelkuchen, Pasta...' :
                i18n.language === 'fr' ? 'Ex: tarte aux pommes, pasta...' :
                'E.g. apple pie, pasta...'
              }
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
            />
            <Text style={{ fontSize: 11, color: isDark ? '#6b7280' : '#9ca3af', marginBottom: 4, marginTop: -4 }}>
              {i18n.language === 'de' ? '🌐 Suche auf Deutsch, Englisch oder Französisch (Spoonacular)' :
               i18n.language === 'fr' ? '🌐 Recherche en français, anglais ou allemand (Spoonacular)' :
               '🌐 Search in English, French or German (Spoonacular)'}
            </Text>
            {searchLoading && <ActivityIndicator size="small" color="#7c3aed" />}
            {translating && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <ActivityIndicator size="small" color="#7c3aed" />
                <Text style={{ color: '#7c3aed', fontSize: 13 }}>
                  {i18n.language === 'de' ? 'Übersetzung...' : i18n.language === 'fr' ? 'Traduction en cours...' : 'Translating...'}
                </Text>
              </View>
            )}
            {recipeSuggestions.length > 0 && (
              <View style={s.suggestions}>
                {recipeSuggestions.map(r => (
                  <TouchableOpacity key={r.id} style={s.suggestionItem} onPress={() => importFromSpoonacular(r)}>
                    <View style={s.suggestionInfo}>
                      <Text style={s.suggestionName}>{r.title}</Text>
                      {r.image ? (
                        <Image source={{ uri: r.image }} style={{ width: 40, height: 40, borderRadius: 6, marginTop: 2 }} />
                      ) : null}
                    </View>
                    <Text style={s.importBtn}>⬇️</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Import depuis URL */}
            <Text style={s.label}>🔗 {t('meals.importUrl') || 'Importer depuis une URL'}</Text>
            <View style={s.importRow}>
              <TextInput
                style={[s.input, { flex: 1, marginBottom: 0 }]}
                value={importUrl}
                onChangeText={setImportUrl}
                placeholder={
                  i18n.language === 'de' ? 'marmiton.org, 750g.com, chefkoch.de, bbcgoodfood.com...' :
                  i18n.language === 'fr' ? 'marmiton.org, 750g.com, allrecipes.com, bbcgoodfood.com...' :
                  'marmiton.org, allrecipes.com, bbcgoodfood.com, chefkoch.de...'
                }
                placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
                autoCapitalize="none"
                keyboardType="url"
              />
              <TouchableOpacity style={s.importUrlBtn} onPress={doImportFromUrl} disabled={importLoading}>
                {importLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.importUrlBtnText}>⬇️</Text>}
              </TouchableOpacity>
            </View>
            {importResult && (
              <View style={s.importSuccess}>
                {form.imageUrl ? (
                  <Image
                    source={{ uri: form.imageUrl }}
                    style={{ width: '100%', height: 140, borderRadius: 8, marginBottom: 8 }}
                    resizeMode="cover"
                  />
                ) : null}
                <Text style={s.importSuccessText}>✓ {importResult.name} importé ({importResult.ingredients?.length || 0} ingrédients)</Text>
              </View>
            )}

            {/* Ingrédients importés */}
            {form.ingredients.length > 0 && (
              <View style={s.ingredientsList}>
                <Text style={s.label}>🥕 {t('meals.ingredients') || 'Ingrédients'} ({form.ingredients.length})</Text>
                {form.ingredients.slice(0, 5).map((ing, i) => (
                  <Text key={i} style={s.ingredientItem}>• {ing}</Text>
                ))}
                {form.ingredients.length > 5 && <Text style={s.ingredientItem}>... +{form.ingredients.length - 5}</Text>}
              </View>
            )}

            {/* Type de repas */}
            <Text style={s.label}>{t('meals.mealType') || 'Type'}</Text>
            <View style={s.typeSelector}>
              {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map(type => (
                <TouchableOpacity
                  key={type}
                  style={[s.typeBtn, form.mealType === type && s.typeBtnActive]}
                  onPress={() => setForm(p => ({ ...p, mealType: type }))}
                >
                  <Text style={s.typeEmoji}>{MEAL_EMOJIS[type]}</Text>
                  <Text style={[s.typeBtnText, form.mealType === type && s.typeBtnTextActive]}>
                    {customLabels[type]}
                  </Text>
                  <Text style={s.typeTime}>{customTimes[type]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Portions */}
            <Text style={s.label}>{t('meals.servings') || 'Portions'}</Text>
            <View style={s.settingsRow}>
              <TouchableOpacity onPress={() => setForm(p => ({ ...p, servings: Math.max(1, p.servings - 1) }))} style={s.counterBtn}>
                <Text style={s.counterBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={s.counterValue}>{form.servings}</Text>
              <TouchableOpacity onPress={() => setForm(p => ({ ...p, servings: p.servings + 1 }))} style={s.counterBtn}>
                <Text style={s.counterBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Notes */}
            <Text style={s.label}>{t('common.notes') || 'Notes'}</Text>
            <TextInput
              style={[s.input, { height: 80 }]}
              value={form.notes}
              onChangeText={n => setForm(p => ({ ...p, notes: n }))}
              placeholder={t('meals.notesPlaceholder') || 'Ingrédients, instructions...'}
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
              multiline
            />

            {/* Actions */}
            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowForm(false)}>
                <Text style={s.cancelBtnText}>✕</Text>
              </TouchableOpacity>
              {editingMeal && (
                <TouchableOpacity style={[s.cancelBtn, { backgroundColor: '#ef4444' }]} onPress={() => {
                  Alert.alert(t('common.delete') || 'Supprimer', editingMeal.name, [
                    { text: t('common.cancel') || 'Annuler', style: 'cancel' },
                    { text: '🗑', style: 'destructive', onPress: () => { deleteMeal.mutate({ mealId: editingMeal.id }); setShowForm(false); } },
                  ]);
                }}>
                  <Text style={s.saveBtnText}>🗑</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={s.saveBtn} onPress={saveMeal}>
                <Text style={s.saveBtnText}>✓</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  // ─── Modal ajout aux courses ───────────────────────────────────────────────
  const renderAddToShoppingModal = () => (
    <Modal visible={showAddToShopping} transparent animationType="slide">
      <View style={s.overlay}>
        <View style={s.modal}>
          <Text style={s.modalTitle}>🛒 {t('meals.addToShopping') || 'Ajouter aux courses'}</Text>
          {ingredientsToAdd.length === 0 ? (
            <Text style={s.emptyText}>{t('meals.noIngredients') || 'Aucun ingrédient trouvé dans les notes'}</Text>
          ) : (
            <>
              <Text style={s.label}>{ingredientsToAdd.length} ingrédient(s) :</Text>
              <ScrollView style={{ maxHeight: 150 }}>
                {ingredientsToAdd.map((ing, i) => <Text key={i} style={s.ingredientItem}>• {ing}</Text>)}
              </ScrollView>
              <Text style={[s.label, { marginTop: 12 }]}>{t('shopping.selectList') || 'Choisir une liste'} :</Text>
              {activeLists.length === 0 ? (
                <Text style={s.emptyText}>{t('shopping.noLists') || 'Aucune liste active'}</Text>
              ) : (
                activeLists.map((list: any) => (
                  <TouchableOpacity key={list.id} style={s.listChoiceBtn} onPress={() => doAddToShopping(list.id)}>
                    <Text style={s.listChoiceBtnText}>📋 {list.name}</Text>
                  </TouchableOpacity>
                ))
              )}
            </>
          )}
          <TouchableOpacity style={[s.cancelBtn, { alignSelf: 'flex-end', marginTop: 12 }]} onPress={() => setShowAddToShopping(false)}>
            <Text style={s.cancelBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // ─── Rendu principal ───────────────────────────────────────────────────────
  const content = (
    <View style={s.container}>

      {/* Contenu selon onglet */}
      <View style={{ flex: 1 }}>
        {tab === 'week' && (mealsLoading ? <ActivityIndicator style={{ marginTop: 40 }} color="#7c3aed" /> : renderWeekView())}
        {tab === 'history' && renderHistoryView()}
        {tab === 'settings' && renderSettingsView()}
      </View>

      {renderForm()}
      {renderAddToShoppingModal()}

      {/* Modal déplacer repas vers un autre jour */}
      <Modal visible={!!movingMeal} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>⋮ {t('meals.moveTo') || 'Déplacer vers...'}</Text>
            {movingMeal && (
              <Text style={[s.label, { textAlign: 'center', marginBottom: 12 }]}>{movingMeal.name}</Text>
            )}
            <ScrollView style={{ maxHeight: 320 }}>
              {weekDays.map(day => {
                const isCurrentDay = movingMeal ? isSameDay(parseISO(movingMeal.date), day) : false;
                return (
                  <TouchableOpacity
                    key={day.toISOString()}
                    style={[s.dayPickerBtn, isCurrentDay && s.dayPickerBtnCurrent]}
                    onPress={() => movingMeal && moveMealToDay(movingMeal, day)}
                    disabled={isCurrentDay}
                  >
                    <Text style={[s.dayPickerBtnText, isCurrentDay && { color: '#9ca3af' }]}>
                      {format(day, 'EEEE d MMMM', { locale: dateFnsLocale })}
                      {isCurrentDay ? '  (✓ actuel)' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={[s.cancelBtn, { marginTop: 12, alignSelf: 'center', paddingHorizontal: 24 }]} onPress={() => setMovingMeal(null)}>
              <Text style={s.cancelBtnText}>✕ {t('common.cancel') || 'Annuler'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );

  if (embedded) return content;
  return (
    <View style={s.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {content}
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
  const inputBg = isDark ? '#000000' : '#ffffff';
  const inputBorder = isDark ? '#ffffff' : '#d1d5db';

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: bg },
    titleBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 8 },
    title: { fontSize: 22, fontWeight: '700', color: text },
    createBtn: { backgroundColor: '#7c3aed', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
    createBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
    tabBar: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 4 },
    tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: isDark ? '#374151' : '#f3f4f6' },
    tabBtnActive: { backgroundColor: '#7c3aed' },
    tabBtnText: { fontSize: 13, fontWeight: '600', color: subtext },
    tabBtnTextActive: { color: '#fff' },
    // Semaine
    weekContainer: { flex: 1 },
    weekNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: border },
    weekNavBtn: { padding: 8 },
    weekNavBtnText: { fontSize: 18, color: '#7c3aed' },
    weekLabel: { fontSize: 14, fontWeight: '600', color: text },
    dayBlock: { borderBottomWidth: 1, borderBottomColor: border, padding: 10 },
    dayBlockToday: { borderLeftWidth: 3, borderLeftColor: '#7c3aed' },
    dayBlockDragOver: { backgroundColor: isDark ? '#2d1b69' : '#ede9fe', borderStyle: 'dashed', borderWidth: 2, borderColor: '#7c3aed' },
    dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    dayName: { fontSize: 14, fontWeight: '700', color: text, textTransform: 'capitalize' },
    dayNameToday: { color: '#7c3aed' },
    addDayBtn: { backgroundColor: '#7c3aed', borderRadius: 14, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
    addDayBtnText: { color: '#fff', fontSize: 18, fontWeight: '700', lineHeight: 22 },
    noMealText: { fontSize: 12, color: subtext, fontStyle: 'italic', paddingLeft: 4 },
    // Carte repas
    mealCard: { backgroundColor: card, borderRadius: 10, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: border },
    mealCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    mealEmoji: { fontSize: 22 },
    mealCardInfo: { flex: 1 },
    mealName: { fontSize: 14, fontWeight: '700', color: text },
    mealMeta: { fontSize: 12, color: subtext, marginTop: 2 },
    mealCardActions: { flexDirection: 'row', gap: 4 },
    mealActionBtn: { fontSize: 18, padding: 2 },
    moveMealBtn: { marginTop: 4, paddingVertical: 4, paddingHorizontal: 8, backgroundColor: isDark ? '#2d1b69' : '#ede9fe', borderRadius: 8, alignSelf: 'flex-start' },
    moveMealBtnText: { fontSize: 12, color: '#7c3aed', fontWeight: '600' },
    reuseBtn: { alignSelf: 'flex-end', marginBottom: 4 },
    reuseBtnText: { fontSize: 12, color: '#7c3aed' },
    // Historique
    sectionTitle: { fontSize: 16, fontWeight: '700', color: text, marginTop: 12, marginBottom: 8 },
    emptyText: { textAlign: 'center', color: subtext, marginTop: 20, fontSize: 14 },
    // Paramètres
    settingsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: border },
    settingsLabel: { fontSize: 15, color: text, flex: 1 },
    timeInput: { backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder, borderRadius: 8, padding: 8, color: text, width: 80, textAlign: 'center' },
    labelInput: { backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder, borderRadius: 8, padding: 8, color: text, flex: 1, maxWidth: 160 },
    counterBtn: { backgroundColor: isDark ? '#374151' : '#f3f4f6', borderRadius: 8, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    counterBtnText: { fontSize: 20, color: text, fontWeight: '700' },
    counterValue: { fontSize: 18, fontWeight: '700', color: text, minWidth: 40, textAlign: 'center' },
    saveSettingsBtn: { backgroundColor: '#7c3aed', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 20 },
    saveSettingsBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    // Formulaire
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' },
    formScroll: { flexGrow: 1, justifyContent: 'center', padding: 12 },
    modal: { backgroundColor: card, borderRadius: 16, padding: 20 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: text, marginBottom: 12 },
    label: { fontSize: 13, fontWeight: '600', color: subtext, marginBottom: 4, marginTop: 8 },
    input: { backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder, borderRadius: 10, padding: 12, color: text, fontSize: 15, marginBottom: 4 },
    typeSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
    typeBtn: { flex: 1, minWidth: '45%', backgroundColor: isDark ? '#374151' : '#f3f4f6', borderRadius: 10, padding: 10, alignItems: 'center' },
    typeBtnActive: { backgroundColor: '#7c3aed' },
    typeEmoji: { fontSize: 20 },
    typeBtnText: { fontSize: 12, fontWeight: '600', color: subtext, marginTop: 2 },
    typeBtnTextActive: { color: '#fff' },
    typeTime: { fontSize: 11, color: subtext, marginTop: 2 },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
    cancelBtn: { backgroundColor: isDark ? '#374151' : '#f3f4f6', borderRadius: 10, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    cancelBtnText: { color: text, fontSize: 18, fontWeight: '700' },
    saveBtn: { backgroundColor: '#7c3aed', borderRadius: 10, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    saveBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
    // Recherche recettes
    suggestions: { backgroundColor: card, borderWidth: 1, borderColor: border, borderRadius: 10, marginBottom: 4 },
    suggestionItem: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderBottomColor: border },
    suggestionInfo: { flex: 1 },
    suggestionName: { fontSize: 14, fontWeight: '600', color: text },
    suggestionMeta: { fontSize: 12, color: subtext },
    importBtn: { fontSize: 20 },
    // Import URL
    importRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 4 },
    importUrlBtn: { backgroundColor: '#7c3aed', borderRadius: 10, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    importUrlBtnText: { fontSize: 20 },
    importSuccess: { backgroundColor: isDark ? '#064e3b' : '#d1fae5', borderRadius: 8, padding: 8, marginBottom: 4 },
    importSuccessText: { color: isDark ? '#6ee7b7' : '#065f46', fontSize: 13 },
    // Ingrédients
    ingredientsList: { backgroundColor: isDark ? '#1f2937' : '#f9fafb', borderRadius: 10, padding: 10, marginBottom: 4 },
    ingredientItem: { fontSize: 13, color: text, marginBottom: 2 },
    // Ajout aux courses
    listChoiceBtn: { backgroundColor: isDark ? '#374151' : '#f3f4f6', borderRadius: 10, padding: 12, marginBottom: 8 },
    listChoiceBtnText: { fontSize: 15, color: text, fontWeight: '600' },
    // Sélecteur de jour (déplacer repas)
    dayPickerBtn: { backgroundColor: isDark ? '#374151' : '#f3f4f6', borderRadius: 10, padding: 14, marginBottom: 8 },
    dayPickerBtnCurrent: { backgroundColor: isDark ? '#1f2937' : '#e5e7eb', opacity: 0.6 },
    dayPickerBtnText: { fontSize: 15, color: text, fontWeight: '500', textTransform: 'capitalize' },
    // Autocomplétion historique
    historySuggestions: { backgroundColor: card, borderWidth: 1, borderColor: '#7c3aed', borderRadius: 10, marginBottom: 4, overflow: 'hidden' },
    historySuggestionItem: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderBottomColor: border, gap: 8 },
    historySuggestionEmoji: { fontSize: 14, color: '#7c3aed' },
    historySuggestionText: { fontSize: 14, color: text, flex: 1 },
  });
}
