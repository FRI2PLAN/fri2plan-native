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
  StyleSheet, ScrollView, Alert, ActivityIndicator, Switch, Image, Share, KeyboardAvoidingView, Platform, Pressable, Linking} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { trpc } from '../lib/trpc';
import { useFamily } from '../contexts/FamilyContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import PremiumOverlay from '../components/PremiumOverlay';
import { AddToShoppingModal } from '../components/AddToShoppingModal';
import {
  format, addDays, startOfWeek, endOfWeek, isSameDay, parseISO, addWeeks, subWeeks} from 'date-fns';
import { fr, de, enUS, es, it } from 'date-fns/locale';
import recipeCatalogData from '../data/fri2plan_recipes_500_multilingual.json';

// ─── Types ────────────────────────────────────────────────────────────────────
type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
type MealsTab = 'week' | 'history' | 'settings';
type DietaryStyle = 'omnivore' | 'vegetarian' | 'vegan' | 'pescatarian' | 'flexitarian';
type ProfileVisibility = 'family' | 'private';
type RecipeVisibility = 'family' | 'private';

interface MealPreferenceProfile {
  dietaryStyle: DietaryStyle;
  exclusions: string | string[];
  preferences: string | string[];
  notes?: string | null;
  visibility?: ProfileVisibility;
  disclaimerAcknowledgedAt?: string | null;
}

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

interface RecipeLibraryEntry {
  id: number;
  familyId: number;
  createdBy: number;
  title: string;
  description?: string | null;
  prepTimeMinutes?: number | null;
  cookTimeMinutes?: number | null;
  servings?: number | null;
  instructions?: string | null;
  sourceUrl?: string | null;
  visibility?: RecipeVisibility | null;
  tags?: string | null;
  creatorName?: string | null;
  ingredients?: Array<{ id?: number; name: string }>;
}

type CatalogLanguage = 'fr' | 'en' | 'de' | 'es' | 'it';

interface CatalogIngredient {
  name: string;
  quantity: number;
  unit: string;
  optional?: boolean;
}

interface CatalogTranslation {
  title: string;
  description: string;
  ingredients: CatalogIngredient[];
  instructions: string[];
  tags?: string[];
}

interface CatalogRecipe {
  id: string;
  servings_default: number;
  prep_time_min: number;
  cook_time_min: number;
  diet_code: string;
  tag_codes: string[];
  i18n: Record<CatalogLanguage, CatalogTranslation>;
}

type MenuSuggestionTarget = {
  day: Date;
  mealType: MealType;
};

const recipeCatalog = recipeCatalogData as { recipes: CatalogRecipe[] };
const CATALOG_LANGUAGES: CatalogLanguage[] = ['fr', 'en', 'de', 'es', 'it'];
const RECIPE_MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

const parseRecipeMealTypes = (tags?: string | null): MealType[] =>
  (tags || '')
    .split(',')
    .map(tag => tag.trim())
    .filter((tag): tag is MealType => RECIPE_MEAL_TYPES.includes(tag as MealType));

const getCatalogTranslation = (recipe: CatalogRecipe, language: string) => {
  const preferredLanguage = language.slice(0, 2) as CatalogLanguage;
  return recipe.i18n[CATALOG_LANGUAGES.includes(preferredLanguage) ? preferredLanguage : 'fr'] || recipe.i18n.fr;
};

const formatCatalogIngredient = (ingredient: CatalogIngredient) => {
  const quantity = Number.isFinite(ingredient.quantity) ? `${ingredient.quantity} ` : '';
  const unit = ingredient.unit ? `${ingredient.unit} ` : '';
  return `${quantity}${unit}${ingredient.name}`.trim();
};

const scaleCatalogIngredient = (ingredient: CatalogIngredient, ratio: number): CatalogIngredient => ({
  ...ingredient,
  quantity: Number.isFinite(ingredient.quantity)
    ? Math.round(ingredient.quantity * ratio * 100) / 100
    : ingredient.quantity,
});

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

const DIETARY_STYLES: DietaryStyle[] = ['omnivore', 'vegetarian', 'vegan', 'pescatarian', 'flexitarian'];

const DIETARY_STYLE_PRESENTATION: Record<DietaryStyle, { icon: string; hintKey: string }> = {
  omnivore: { icon: '🍗', hintKey: 'dietaryStyleHint_omnivore' },
  vegetarian: { icon: '🥬', hintKey: 'dietaryStyleHint_vegetarian' },
  vegan: { icon: '🌱', hintKey: 'dietaryStyleHint_vegan' },
  pescatarian: { icon: '🐟', hintKey: 'dietaryStyleHint_pescatarian' },
  flexitarian: { icon: '🥗', hintKey: 'dietaryStyleHint_flexitarian' },
};

const STANDARD_FOOD_SUGGESTION_KEYS = {
  exclusions: ['peanuts', 'gluten', 'dairy', 'pork', 'mushrooms', 'broccoli'],
  preferences: ['pasta', 'chicken', 'vegetables', 'rice', 'pizza', 'curry'],
} as const;

const parseFoodProfileItems = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
};

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
  const { requirePremium, hasPremium, isTrialActive } = useSubscription();
  const isFree = !hasPremium && !isTrialActive;

  // ─── Locale date-fns ───────────────────────────────────────────────────────
  const dateFnsLocale = i18n.language === 'de' ? de : i18n.language === 'en' ? enUS : i18n.language === 'es' ? es : i18n.language === 'it' ? it : fr;

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
  const plannedDaysCount = useMemo(() => new Set((weekMeals as Meal[]).map(meal => {
    try { return format(parseISO(meal.date), 'yyyy-MM-dd'); } catch { return ''; }
  }).filter(Boolean)).size, [weekMeals]);
  const weeklyMenuProgress = Math.min(Math.round((plannedDaysCount / 7) * 100), 100);

  // ─── Historique ────────────────────────────────────────────────────────────
  const { data: historyMeals = [], isLoading: historyLoading } = trpc.meals.history.useQuery(
    { familyId: familyId!, limit: 50 },
    { enabled: !!familyId }
  );

  // ─── Favoris ───────────────────────────────────────────────────────────────
  const { data: favoriteMeals = [] } = trpc.meals.favorites.useQuery(
    { familyId: familyId! },
    { enabled: !!familyId }
  );

  // ─── Paramètres (AsyncStorage) ─────────────────────────────────────────────
  const [defaultServings, setDefaultServings] = useState(4);
  const mealLabels = getMealLabels(t);
  const [customLabels, setCustomLabels] = useState<Record<MealType, string>>({ ...mealLabels });
  const [customTimes, setCustomTimes] = useState<Record<MealType, string>>({ ...DEFAULT_TIMES });
  const [showFoodPreferences, setShowFoodPreferences] = useState(false);
  const [foodProfile, setFoodProfile] = useState({
    dietaryStyle: 'omnivore' as DietaryStyle,
    exclusions: [] as string[],
    preferences: [] as string[],
    notes: '',
    visibility: 'family' as ProfileVisibility,
  });
  const [foodExclusionInput, setFoodExclusionInput] = useState('');
  const [foodPreferenceInput, setFoodPreferenceInput] = useState('');
  const [foodDisclaimerAccepted, setFoodDisclaimerAccepted] = useState(false);
  const [showRecipeLibrary, setShowRecipeLibrary] = useState(false);
  const [showRecipeDetails, setShowRecipeDetails] = useState(false);
  const [showRecipeForm, setShowRecipeForm] = useState(false);
  const [showMenuSuggestions, setShowMenuSuggestions] = useState(false);
  const [menuSuggestionTarget, setMenuSuggestionTarget] = useState<MenuSuggestionTarget | null>(null);
  const [menuSuggestionRound, setMenuSuggestionRound] = useState(0);
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null);
  const [selectedCatalogRecipeId, setSelectedCatalogRecipeId] = useState<string | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<RecipeLibraryEntry | null>(null);
  const [recipeLibrarySearch, setRecipeLibrarySearch] = useState('');
  const [recipeIngredientInput, setRecipeIngredientInput] = useState('');
  const [recipeForm, setRecipeForm] = useState({
    title: '', description: '', prepTimeMinutes: '', cookTimeMinutes: '', servings: defaultServings,
    instructions: '', sourceUrl: '', visibility: 'family' as RecipeVisibility, mealTypes: [] as MealType[], ingredients: [] as string[],
  });

  const { data: savedFoodProfile, isLoading: foodProfileLoading } = trpc.mealPreferences.mine.useQuery(
    { familyId: familyId! },
    { enabled: !!familyId && showFoodPreferences },
  );
  const { data: currentUser } = trpc.auth.me.useQuery();
  const { data: recipeLibrary = [], isLoading: recipeLibraryLoading } = trpc.meals.recipeLibrary.list.useQuery(
    { familyId: familyId! },
    { enabled: !!familyId && showRecipeLibrary },
  );
  const { data: selectedRecipe, isLoading: recipeDetailsLoading } = trpc.meals.recipeLibrary.get.useQuery(
    { recipeId: selectedRecipeId! },
    { enabled: !!selectedRecipeId && showRecipeDetails },
  );
  const { data: menuSuggestionResult, isLoading: menuSuggestionsLoading } = trpc.meals.menuSuggestions.useQuery(
    {
      familyId: familyId || 0,
      date: format(menuSuggestionTarget?.day || new Date(), 'yyyy-MM-dd'),
      mealType: menuSuggestionTarget?.mealType || 'dinner',
      round: menuSuggestionRound,
    },
    { enabled: !!familyId && !!menuSuggestionTarget && showMenuSuggestions },
  );
  const suggestedCatalogRecipes = useMemo(() => {
    const byId = new Map(recipeCatalog.recipes.map(recipe => [recipe.id, recipe]));
    return (menuSuggestionResult?.recipeIds || [])
      .map(recipeId => byId.get(recipeId))
      .filter((recipe): recipe is CatalogRecipe => Boolean(recipe));
  }, [menuSuggestionResult]);

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

  useEffect(() => {
    if (!savedFoodProfile) return;
    const profile = savedFoodProfile as MealPreferenceProfile;
    setFoodProfile({
      dietaryStyle: DIETARY_STYLES.includes(profile.dietaryStyle) ? profile.dietaryStyle : 'omnivore',
      exclusions: parseFoodProfileItems(profile.exclusions),
      preferences: parseFoodProfileItems(profile.preferences),
      notes: profile.notes || '',
      visibility: profile.visibility === 'private' ? 'private' : 'family',
    });
    setFoodDisclaimerAccepted(Boolean(profile.disclaimerAcknowledgedAt));
  }, [savedFoodProfile]);

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const createMeal = trpc.meals.create.useMutation({ onSuccess: () => utils.meals.list.invalidate() });
  const updateMeal = trpc.meals.update.useMutation({ onSuccess: () => { utils.meals.list.invalidate(); utils.meals.history.invalidate(); } });
  const deleteMeal = trpc.meals.delete.useMutation({ onSuccess: () => { utils.meals.list.invalidate(); utils.meals.history.invalidate(); } });
  const toggleFavorite = trpc.meals.toggleFavorite.useMutation({ onSuccess: () => { utils.meals.history.invalidate(); utils.meals.favorites.invalidate(); } });
  const importFromUrl = trpc.meals.importFromUrl.useMutation();
  const translateRecipeMutation = trpc.meals.translateRecipe.useMutation();
  const [translating, setTranslating] = useState(false);
  const addItemsMerged = trpc.shopping.addItemsMerged.useMutation();
  const updateFoodProfile = trpc.mealPreferences.updateMine.useMutation();
  const createRecipeLibraryEntry = trpc.meals.recipeLibrary.create.useMutation();
  const updateRecipeLibraryEntry = trpc.meals.recipeLibrary.update.useMutation();
  const deleteRecipeLibraryEntry = trpc.meals.recipeLibrary.delete.useMutation();

  const visibleRecipeLibrary = useMemo(() => {
    const query = recipeLibrarySearch.trim().toLocaleLowerCase();
    return (recipeLibrary as RecipeLibraryEntry[]).filter(recipe => {
      if (!query) return true;
      return [recipe.title, recipe.description, recipe.creatorName]
        .filter((value): value is string => Boolean(value))
        .some(value => value.toLocaleLowerCase().includes(query));
    });
  }, [recipeLibrary, recipeLibrarySearch]);

  const visibleCatalogRecipes = useMemo(() => {
    const query = recipeLibrarySearch.trim().toLocaleLowerCase();
    return recipeCatalog.recipes.map(recipe => ({ recipe, translation: getCatalogTranslation(recipe, i18n.language) })).filter(({ recipe, translation }) => {
      if (!query) return true;
      return [translation.title, translation.description, ...translation.tags || [], ...translation.ingredients.map(ingredient => ingredient.name)]
        .some(value => value.toLocaleLowerCase().includes(query));
    });
  }, [i18n.language, recipeLibrarySearch]);

  const selectedCatalogRecipe = useMemo(
    () => recipeCatalog.recipes.find(recipe => recipe.id === selectedCatalogRecipeId) || null,
    [selectedCatalogRecipeId],
  );

  const addRecipeIngredient = () => {
    const ingredient = recipeIngredientInput.trim();
    if (!ingredient) return;
    setRecipeForm(current => {
      if (current.ingredients.length >= 80 || current.ingredients.some(value => value.toLocaleLowerCase() === ingredient.toLocaleLowerCase())) return current;
      return { ...current, ingredients: [...current.ingredients, ingredient] };
    });
    setRecipeIngredientInput('');
  };

  const openNewRecipe = () => {
    setEditingRecipe(null);
    setRecipeIngredientInput('');
    setRecipeForm({ title: '', description: '', prepTimeMinutes: '', cookTimeMinutes: '', servings: defaultServings, instructions: '', sourceUrl: '', visibility: 'family', mealTypes: [], ingredients: [] });
    setShowRecipeForm(true);
  };

  const openRecipeDetails = (recipeId: number) => {
    setSelectedCatalogRecipeId(null);
    setSelectedRecipeId(recipeId);
    setShowRecipeDetails(true);
  };

  const openCatalogRecipeDetails = (recipeId: string) => {
    setSelectedRecipeId(null);
    setSelectedCatalogRecipeId(recipeId);
    setShowRecipeDetails(true);
  };

  const openRecipeEditor = (recipe: RecipeLibraryEntry) => {
    setEditingRecipe(recipe);
    setRecipeIngredientInput('');
    setRecipeForm({
      title: recipe.title || '', description: recipe.description || '', prepTimeMinutes: recipe.prepTimeMinutes?.toString() || '',
      cookTimeMinutes: recipe.cookTimeMinutes?.toString() || '', servings: recipe.servings || defaultServings,
      instructions: recipe.instructions || '', sourceUrl: recipe.sourceUrl || '', visibility: recipe.visibility === 'private' ? 'private' : 'family',
      mealTypes: parseRecipeMealTypes(recipe.tags),
      ingredients: (recipe.ingredients || []).map(ingredient => ingredient.name),
    });
    setShowRecipeDetails(false);
    setShowRecipeForm(true);
  };

  const saveRecipeLibraryEntry = async () => {
    if (!familyId || !recipeForm.title.trim()) {
      Alert.alert(t('common.error') || 'Erreur', t('meals.recipeTitleRequired'));
      return;
    }
    if (recipeForm.mealTypes.length === 0) {
      Alert.alert(t('common.error') || 'Erreur', t('meals.recipeMealTypeRequired'));
      return;
    }
    const asMinutes = (value: string) => value.trim() ? Math.max(0, Number.parseInt(value, 10) || 0) : null;
    const baseInput = {
      title: recipeForm.title.trim(), description: recipeForm.description.trim() || null,
      prepTimeMinutes: asMinutes(recipeForm.prepTimeMinutes), cookTimeMinutes: asMinutes(recipeForm.cookTimeMinutes),
      servings: Math.max(1, recipeForm.servings), instructions: recipeForm.instructions.trim() || null,
      sourceUrl: recipeForm.sourceUrl.trim() || null, visibility: recipeForm.visibility, tags: recipeForm.mealTypes,
    };
    try {
      if (editingRecipe) {
        await updateRecipeLibraryEntry.mutateAsync({ recipeId: editingRecipe.id, ...baseInput, ingredients: recipeForm.ingredients });
        await utils.meals.recipeLibrary.get.invalidate({ recipeId: editingRecipe.id });
      } else {
        await createRecipeLibraryEntry.mutateAsync({ familyId, ...baseInput, ingredients: recipeForm.ingredients });
      }
      await utils.meals.recipeLibrary.list.invalidate({ familyId });
      setShowRecipeForm(false);
      Alert.alert('✓', t('common.saved') || 'Enregistré');
    } catch (error: any) {
      Alert.alert(t('common.error') || 'Erreur', error?.message || t('meals.recipeSaveError'));
    }
  };

  const removeRecipeLibraryEntry = (recipe: RecipeLibraryEntry) => {
    Alert.alert(t('common.delete') || 'Supprimer', recipe.title, [
      { text: t('common.cancel') || 'Annuler', style: 'cancel' },
      { text: t('common.delete') || 'Supprimer', style: 'destructive', onPress: async () => {
        try {
          await deleteRecipeLibraryEntry.mutateAsync({ recipeId: recipe.id });
          await utils.meals.recipeLibrary.list.invalidate({ familyId });
          setShowRecipeDetails(false);
        } catch (error: any) {
          Alert.alert(t('common.error') || 'Erreur', error?.message || t('meals.recipeDeleteError'));
        }
      } },
    ]);
  };

  const addFoodProfileValue = (field: 'exclusions' | 'preferences', rawValue: string) => {
    const value = rawValue.trim();
    if (!value) return;
    setFoodProfile(current => {
      const values = current[field];
      if (values.length >= 30 || values.some(item => item.toLocaleLowerCase() === value.toLocaleLowerCase())) {
        return current;
      }
      return { ...current, [field]: [...values, value] };
    });
  };

  const addFoodProfileItem = (field: 'exclusions' | 'preferences') => {
    const value = field === 'exclusions' ? foodExclusionInput : foodPreferenceInput;
    addFoodProfileValue(field, value);
    if (field === 'exclusions') setFoodExclusionInput('');
    else setFoodPreferenceInput('');
  };

  const getFoodSuggestions = (field: 'exclusions' | 'preferences') => {
    const query = (field === 'exclusions' ? foodExclusionInput : foodPreferenceInput).trim().toLocaleLowerCase();
    const selected = foodProfile[field].map(item => item.toLocaleLowerCase());
    return STANDARD_FOOD_SUGGESTION_KEYS[field]
      .map(key => t(`meals.foodItem_${key}`))
      .filter(value => !selected.includes(value.toLocaleLowerCase()))
      .filter(value => !query || value.toLocaleLowerCase().includes(query));
  };

  const removeFoodProfileItem = (field: 'exclusions' | 'preferences', value: string) => {
    setFoodProfile(current => ({ ...current, [field]: current[field].filter(item => item !== value) }));
  };

  const openFoodPreferences = () => {
    setFoodExclusionInput('');
    setFoodPreferenceInput('');
    setShowFoodPreferences(true);
  };

  const saveFoodPreferences = async () => {
    if (!familyId) return;
    if (!foodDisclaimerAccepted) {
      Alert.alert(t('meals.foodDisclaimerTitle'), t('meals.foodDisclaimerRequired'));
      return;
    }
    try {
      const savedProfile = await updateFoodProfile.mutateAsync({
        familyId,
        dietaryStyle: foodProfile.dietaryStyle,
        exclusions: foodProfile.exclusions,
        preferences: foodProfile.preferences,
        notes: foodProfile.notes.trim() || undefined,
        visibility: foodProfile.visibility,
        acknowledgeDisclaimer: true,
      });
      setFoodDisclaimerAccepted(Boolean((savedProfile as MealPreferenceProfile | null)?.disclaimerAcknowledgedAt));
      await utils.mealPreferences.mine.invalidate({ familyId });
      setShowFoodPreferences(false);
      Alert.alert('✓', t('common.saved') || 'Paramètres sauvegardés');
    } catch (error: any) {
      Alert.alert(t('common.error') || 'Erreur', error?.message || t('meals.foodPreferencesSaveError'));
    }
  };

  // ── Sélection multiple (historique) ──
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMealIds, setSelectedMealIds] = useState<Set<number>>(new Set());
  const deleteManyMutation = trpc.meals.deleteMany.useMutation({
    onSuccess: () => {
      utils.meals.history.invalidate();
      utils.meals.favorites.invalidate();
      setSelectionMode(false);
      setSelectedMealIds(new Set());
    },
    onError: (e) => Alert.alert('Erreur', e.message),
  });

  const toggleMealSelection = (id: number) => {
    setSelectedMealIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleDeleteSelected = () => {
    if (selectedMealIds.size === 0) return;
    Alert.alert(
      'Supprimer la sélection',
      `Supprimer ${selectedMealIds.size} repas de l'historique ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => deleteManyMutation.mutate({ mealIds: Array.from(selectedMealIds) }) },
      ]
    );
  };

  // ─── Listes de courses (pour ajouter ingrédients) ─────────────────────────
  const { data: shoppingLists = [] } = trpc.shopping.listsByFamily.useQuery(
    { familyId: familyId! },
    { enabled: !!familyId }
  );
  const activeLists = useMemo(() => shoppingLists.filter((l: any) => !l.isArchived), [shoppingLists]);

  // ─── Autocomplétion depuis l'historique ─────────────────────────────────────
  const [historySuggestions, setHistorySuggestions] = useState<Meal[]>([]);

  const filterHistorySuggestions = useCallback((query: string) => {
    if (query.length < 2) { setHistorySuggestions([]); return; }
    const q = query.toLowerCase();
    const allMeals = [
      ...(historyMeals as Meal[]),
      ...(favoriteMeals as Meal[]),
      ...(weekMeals as Meal[]),
    ];
    const seen = new Set<string>();
    const matches: Meal[] = [];
    for (const m of allMeals) {
      const name = m.name?.trim();
      if (name && name.toLowerCase().includes(q) && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        matches.push(m);
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
    requirePremium(() => {
    setEditingMeal(null);
    setSelectedDay(day || new Date());
    setForm({ name: '', mealType: 'dinner', servings: defaultServings, notes: '', sourceUrl: '', imageUrl: '', ingredients: [] });
    setShowForm(true);
    setRecipeSearch('');
    setRecipeSuggestions([]);
    setHistorySuggestions([]);
    setImportUrl('');
    setImportResult(null);
    }); // end requirePremium
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

  const openMenuSuggestions = (day: Date) => {
    setMenuSuggestionTarget({ day, mealType: 'dinner' });
    setMenuSuggestionRound(0);
    setShowMenuSuggestions(true);
  };

  const addSuggestedRecipeToMenu = (recipe: CatalogRecipe) => {
    if (!familyId || !menuSuggestionTarget) return;
    const translation = getCatalogTranslation(recipe, i18n.language);
    const servings = Math.max(1, defaultServings || recipe.servings_default);
    const portionsRatio = servings / recipe.servings_default;
    const targetDate = format(menuSuggestionTarget.day, 'yyyy-MM-dd');
    const mealTime = customTimes[menuSuggestionTarget.mealType] || DEFAULT_TIMES[menuSuggestionTarget.mealType];
    const date = `${targetDate}T${mealTime}:00`;
    const existingMeal = (weekMeals as Meal[]).find((meal) => {
      try {
        return format(parseISO(meal.date), 'yyyy-MM-dd') === targetDate && meal.mealType === menuSuggestionTarget.mealType;
      } catch {
        return false;
      }
    });
    const notes = `${t('meals.ingredients')}:\n${translation.ingredients.map((ingredient) => `• ${formatCatalogIngredient(scaleCatalogIngredient(ingredient, portionsRatio))}`).join('\n')}\n\n${t('meals.recipeInstructions')}:\n${translation.instructions.map((instruction, index) => `${index + 1}. ${instruction}`).join('\n')}`;
    const persistSuggestion = async () => {
      try {
        if (existingMeal) {
          await updateMeal.mutateAsync({
            mealId: existingMeal.id,
            name: translation.title,
            mealType: menuSuggestionTarget.mealType,
            date,
            servings,
            notes,
            imageUrl: null,
            sourceUrl: null,
          });
        } else {
          await createMeal.mutateAsync({
            familyId,
            name: translation.title,
            mealType: menuSuggestionTarget.mealType,
            date,
            servings,
            notes,
          });
        }
        setShowMenuSuggestions(false);
        await utils.meals.list.invalidate();
        Alert.alert('✓', t('meals.menuSuggestionAdded'));
      } catch (error: any) {
        Alert.alert(t('common.error') || 'Erreur', error?.message || t('meals.menuSuggestionSaveError'));
      }
    };

    if (existingMeal) {
      Alert.alert(
        t('meals.mealAlreadyPlanned'),
        t('meals.replaceMealMessage', { meal: existingMeal.name }),
        [
          { text: t('common.cancel') || 'Annuler', style: 'cancel' },
          { text: t('meals.replaceMeal'), style: 'destructive', onPress: () => void persistSuggestion() },
        ],
      );
      return;
    }
    void persistSuggestion();
  };

  // ─── Recherche TheMealDB ───────────────────────────────────────────────────
  const [recipeSearch, setRecipeSearch] = useState('');
  const [recipeSuggestions, setRecipeSuggestions] = useState<SpoonacularResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showMealTypeDropdown, setShowMealTypeDropdown] = useState(false);

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
          title: recipe.title,
          ingredients,
          instructions: notes,
          targetLang: userLang,
        });
        if (translated.title) (recipe as any).title = translated.title;
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

  const openRecipeSource = useCallback(async (meal: Meal) => {
    const url = meal.sourceUrl?.trim();
    if (!url) return;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) throw new Error('unsupported-url');
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        t('meals.recipeUnavailable'),
        t('meals.recipeUnavailableMessage'),
      );
    }
  }, [t]);

  const renderMealCard = (meal: Meal) => (
    <View key={meal.id} style={s.mealCard}>
      {meal.imageUrl ? (
        <View style={s.mealImageWrap}>
          <Image
            source={{ uri: meal.imageUrl }}
            style={s.mealImage}
            resizeMode="cover"
          />
          {meal.sourceUrl ? (
            <TouchableOpacity
              style={s.recipeImageLink}
              onPress={() => void openRecipeSource(meal)}
              accessibilityRole="link"
              accessibilityLabel={t('meals.viewRecipe')}
            >
              <Text style={s.recipeImageLinkText}>🔗 {t('meals.viewRecipe')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
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
      {!meal.imageUrl && meal.sourceUrl ? (
        <TouchableOpacity
          style={s.recipeSourceButton}
          onPress={() => void openRecipeSource(meal)}
          accessibilityRole="link"
          accessibilityLabel={t('meals.viewRecipe')}
        >
          <Text style={s.recipeSourceButtonText}>🔗 {t('meals.viewRecipe')}</Text>
        </TouchableOpacity>
      ) : null}
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

      <View style={s.weekPlanSummary}>
        <View style={s.weekPlanSummaryTop}>
          <Text style={s.weekPlanSummaryLabel}>🍽️ {t('meals.weeklyMenu') || 'Menu de la semaine'}</Text>
          <Text style={s.weekPlanSummaryCount}>{t('meals.daysPlanned', { count: plannedDaysCount })}</Text>
        </View>
        <View style={s.weekPlanTrack}>
          <View style={[s.weekPlanFill, { width: `${weeklyMenuProgress}%` }]} />
        </View>
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
                <View style={s.dayHeaderActions}>
                  <TouchableOpacity onPress={() => openMenuSuggestions(day)} style={s.menuSuggestionDayBtn} accessibilityLabel={t('meals.openMenuSuggestions')}>
                    <Text style={s.menuSuggestionDayBtnText}>✨</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => openCreate(day)} style={s.addDayBtn}>
                    <Text style={s.addDayBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
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
    <View style={{ flex: 1 }}>
      {/* Barre d'actions sélection */}
      {selectionMode ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#1f2937' : '#f3f4f6', padding: 10, gap: 8 }}>
          <TouchableOpacity onPress={() => { setSelectionMode(false); setSelectedMealIds(new Set()); }} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: isDark ? '#374151' : '#e5e7eb' }}>
            <Text style={{ color: isDark ? '#f9fafb' : '#374151', fontWeight: '600' }}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => {
            const allIds = new Set((historyMeals as Meal[]).map(m => m.id));
            setSelectedMealIds(selectedMealIds.size === allIds.size ? new Set() : allIds);
          }} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: isDark ? '#374151' : '#e5e7eb' }}>
            <Text style={{ color: isDark ? '#f9fafb' : '#374151', fontWeight: '600' }}>
              {selectedMealIds.size === (historyMeals as Meal[]).length ? 'Désélectionner tout' : 'Tout sélectionner'}
            </Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          {selectedMealIds.size > 0 && (
            <TouchableOpacity onPress={handleDeleteSelected} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 18 }}>🗑</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 10 }}>
          <TouchableOpacity onPress={() => setSelectionMode(true)} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: isDark ? '#374151' : '#e5e7eb' }}>
            <Text style={{ color: isDark ? '#f9fafb' : '#374151', fontWeight: '600', fontSize: 13 }}>✏️ Sélectionner</Text>
          </TouchableOpacity>
        </View>
      )}
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
              {selectionMode && (
                <TouchableOpacity onPress={() => toggleMealSelection(m.id)} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 4 }}>
                  <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: selectedMealIds.has(m.id) ? '#7c3aed' : (isDark ? '#4b5563' : '#d1d5db'), backgroundColor: selectedMealIds.has(m.id) ? '#7c3aed' : 'transparent', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                    {selectedMealIds.has(m.id) && <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>✓</Text>}
                  </View>
                  <Text style={{ color: isDark ? '#9ca3af' : '#6b7280', fontSize: 13 }}>{selectedMealIds.has(m.id) ? 'Sélectionné' : 'Sélectionner'}</Text>
                </TouchableOpacity>
              )}
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
    </View>
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

      <Text style={s.sectionTitle}>{t('meals.recipeLibrary')}</Text>
      <Text style={s.recipeLibraryDescription}>{t('meals.recipeLibraryDescription')}</Text>
      <TouchableOpacity
        style={s.recipeLibraryButton}
        onPress={() => { setRecipeLibrarySearch(''); setShowRecipeLibrary(true); }}
        disabled={!familyId}
      >
        <Text style={s.recipeLibraryButtonText}>📚 {t('meals.openRecipeLibrary')}</Text>
      </TouchableOpacity>

      <Text style={s.sectionTitle}>{t('meals.foodPreferences')}</Text>
      <Text style={s.foodPreferencesDescription}>{t('meals.foodPreferencesDescription')}</Text>
      <TouchableOpacity style={s.foodPreferencesButton} onPress={openFoodPreferences} disabled={!familyId}>
        <Text style={s.foodPreferencesButtonText}>🥕 {t('meals.manageFoodPreferences')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderFoodPreferencesModal = () => (
    <Modal visible={showFoodPreferences} transparent animationType="slide" onRequestClose={() => setShowFoodPreferences(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.sheetOverlay}>
        <Pressable style={s.sheetBackdrop} onPress={() => setShowFoodPreferences(false)} />
        <View style={s.foodPreferencesSheet}>
          <View style={s.modalHeader}>
            <Text style={s.modalHeaderTitle}>🥕 {t('meals.foodPreferences')}</Text>
            <TouchableOpacity style={s.modalCloseBtn} onPress={() => setShowFoodPreferences(false)}>
              <Text style={s.modalCloseBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
          {foodProfileLoading ? (
            <ActivityIndicator style={{ marginVertical: 48 }} color="#7c3aed" />
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={s.foodDisclaimerCard}>
                <Text style={s.foodDisclaimerTitle}>{t('meals.foodDisclaimerTitle')}</Text>
                <Text style={s.foodDisclaimerText}>{t('meals.foodDisclaimer')}</Text>
              </View>

              <Text style={s.label}>{t('meals.dietaryStyle')}</Text>
              <View style={s.dietaryStyleGrid}>
                {DIETARY_STYLES.map(style => {
                  const presentation = DIETARY_STYLE_PRESENTATION[style];
                  return (
                    <TouchableOpacity
                      key={style}
                      style={[s.dietaryStyleButton, foodProfile.dietaryStyle === style && s.dietaryStyleButtonActive]}
                      onPress={() => setFoodProfile(current => ({ ...current, dietaryStyle: style }))}
                      accessibilityRole="button"
                      accessibilityState={{ selected: foodProfile.dietaryStyle === style }}
                      accessibilityLabel={`${t(`meals.dietaryStyle_${style}`)} — ${t(`meals.${presentation.hintKey}`)}`}
                    >
                      <Text style={s.dietaryStyleIcon}>{presentation.icon}</Text>
                      <Text style={[s.dietaryStyleButtonText, foodProfile.dietaryStyle === style && s.dietaryStyleButtonTextActive]}>
                        {t(`meals.dietaryStyle_${style}`)}
                      </Text>
                      <Text style={[s.dietaryStyleHint, foodProfile.dietaryStyle === style && s.dietaryStyleHintActive]}>
                        {t(`meals.${presentation.hintKey}`)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={s.label}>{t('meals.exclusions')}</Text>
              <View style={s.foodItemInputRow}>
                <TextInput
                  style={[s.input, s.foodItemInput]}
                  value={foodExclusionInput}
                  onChangeText={setFoodExclusionInput}
                  placeholder={t('meals.exclusionsPlaceholder')}
                  placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
                  returnKeyType="done"
                  onSubmitEditing={() => addFoodProfileItem('exclusions')}
                />
                <TouchableOpacity style={s.foodItemAddButton} onPress={() => addFoodProfileItem('exclusions')}>
                  <Text style={s.foodItemAddButtonText}>+</Text>
                </TouchableOpacity>
              </View>
              <Text style={s.foodSuggestionLabel}>{t('meals.foodSuggestions')}</Text>
              <View style={s.foodSuggestionList}>
                {getFoodSuggestions('exclusions').map(value => (
                  <TouchableOpacity key={`suggested-exclusion-${value}`} style={s.foodSuggestionChip} onPress={() => addFoodProfileValue('exclusions', value)}>
                    <Text style={s.foodSuggestionChipText}>+ {value}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {foodExclusionInput.trim().length > 0 && getFoodSuggestions('exclusions').length === 0 ? (
                <Text style={s.foodSuggestionHelp}>{t('meals.foodNoSuggestion')}</Text>
              ) : null}
              <View style={s.foodTagList}>
                {foodProfile.exclusions.map(value => (
                  <TouchableOpacity key={`exclusion-${value}`} style={s.foodTag} onPress={() => removeFoodProfileItem('exclusions', value)}>
                    <Text style={s.foodTagText}>{value}  ×</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.label}>{t('meals.foodLikes')}</Text>
              <View style={s.foodItemInputRow}>
                <TextInput
                  style={[s.input, s.foodItemInput]}
                  value={foodPreferenceInput}
                  onChangeText={setFoodPreferenceInput}
                  placeholder={t('meals.foodLikesPlaceholder')}
                  placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
                  returnKeyType="done"
                  onSubmitEditing={() => addFoodProfileItem('preferences')}
                />
                <TouchableOpacity style={s.foodItemAddButton} onPress={() => addFoodProfileItem('preferences')}>
                  <Text style={s.foodItemAddButtonText}>+</Text>
                </TouchableOpacity>
              </View>
              <Text style={s.foodSuggestionLabel}>{t('meals.foodSuggestions')}</Text>
              <View style={s.foodSuggestionList}>
                {getFoodSuggestions('preferences').map(value => (
                  <TouchableOpacity key={`suggested-preference-${value}`} style={s.foodSuggestionChip} onPress={() => addFoodProfileValue('preferences', value)}>
                    <Text style={s.foodSuggestionChipText}>+ {value}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {foodPreferenceInput.trim().length > 0 && getFoodSuggestions('preferences').length === 0 ? (
                <Text style={s.foodSuggestionHelp}>{t('meals.foodNoSuggestion')}</Text>
              ) : null}
              <View style={s.foodTagList}>
                {foodProfile.preferences.map(value => (
                  <TouchableOpacity key={`preference-${value}`} style={s.foodTag} onPress={() => removeFoodProfileItem('preferences', value)}>
                    <Text style={s.foodTagText}>{value}  ×</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.label}>{t('meals.foodNotes')}</Text>
              <TextInput
                style={[s.input, s.foodNotesInput]}
                value={foodProfile.notes}
                onChangeText={notes => setFoodProfile(current => ({ ...current, notes }))}
                placeholder={t('meals.foodNotesPlaceholder')}
                placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
                multiline
                maxLength={500}
              />

              <Text style={s.label}>{t('meals.profileVisibility')}</Text>
              <Text style={s.visibilityDescription}>{t('meals.profileVisibilityDescription')}</Text>
              <View style={s.visibilityRow}>
                {(['family', 'private'] as ProfileVisibility[]).map(visibility => (
                  <TouchableOpacity
                    key={visibility}
                    style={[s.visibilityButton, foodProfile.visibility === visibility && s.visibilityButtonActive]}
                    onPress={() => setFoodProfile(current => ({ ...current, visibility }))}
                  >
                    <Text style={[s.visibilityButtonText, foodProfile.visibility === visibility && s.visibilityButtonTextActive]}>
                      {t(`meals.profileVisibility_${visibility}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={s.disclaimerAckRow} onPress={() => setFoodDisclaimerAccepted(value => !value)}>
                <View style={[s.disclaimerCheck, foodDisclaimerAccepted && s.disclaimerCheckActive]}>
                  {foodDisclaimerAccepted ? <Text style={s.disclaimerCheckText}>✓</Text> : null}
                </View>
                <Text style={s.disclaimerAckText}>{t('meals.foodDisclaimerAcknowledge')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.saveSettingsBtn, (!foodDisclaimerAccepted || updateFoodProfile.isPending) && s.saveSettingsBtnDisabled]}
                onPress={() => void saveFoodPreferences()}
                disabled={!foodDisclaimerAccepted || updateFoodProfile.isPending}
              >
                {updateFoodProfile.isPending ? <ActivityIndicator color="#fff" /> : <Text style={s.saveSettingsBtnText}>✓ {t('common.save') || 'Sauvegarder'}</Text>}
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderRecipeLibraryModal = () => {
    const libraryItems = [
      ...visibleCatalogRecipes.map(({ recipe, translation }) => ({ kind: 'catalog' as const, recipe, translation })),
      ...visibleRecipeLibrary.map(recipe => ({ kind: 'personal' as const, recipe })),
    ];
    return (
      <Modal visible={showRecipeLibrary} transparent animationType="slide" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setShowRecipeLibrary(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.sheetOverlay}>
          <Pressable style={s.sheetBackdrop} onPress={() => setShowRecipeLibrary(false)} />
          <View style={s.recipeLibrarySheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalHeaderTitle}>📚 {t('meals.recipeLibrary')}</Text>
              <TouchableOpacity style={s.modalCloseBtn} onPress={() => setShowRecipeLibrary(false)}>
                <Text style={s.modalCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={s.recipeLibraryToolbar}>
              <TextInput
                style={[s.input, s.recipeLibrarySearch]}
                value={recipeLibrarySearch}
                onChangeText={setRecipeLibrarySearch}
                placeholder={t('meals.searchRecipeLibrary')}
                placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
                returnKeyType="search"
              />
              <TouchableOpacity style={s.recipeLibraryCreateButton} onPress={openNewRecipe} accessibilityLabel={t('meals.newRecipe')}>
                <Text style={s.recipeLibraryCreateButtonText}>+</Text>
              </TouchableOpacity>
            </View>
            <Text style={s.recipeCatalogSummary}>{t('meals.recipeCatalogSummary', { count: recipeCatalog.recipes.length })}</Text>
            <FlatList
              style={s.recipeLibraryList}
              data={libraryItems}
              keyExtractor={item => item.kind === 'catalog' ? `catalog-${item.recipe.id}` : `personal-${item.recipe.id}`}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={libraryItems.length ? s.recipeLibraryListContent : s.recipeLibraryListEmptyContent}
              ListHeaderComponent={recipeLibraryLoading ? <ActivityIndicator style={{ marginVertical: 12 }} color="#7c3aed" /> : null}
              ListEmptyComponent={!recipeLibraryLoading ? (
                <View style={s.recipeLibraryEmpty}>
                  <Text style={s.recipeLibraryEmptyTitle}>{t('meals.recipeLibraryEmpty')}</Text>
                  <Text style={s.recipeLibraryEmptyText}>{t('meals.recipeLibraryEmptyHint')}</Text>
                </View>
              ) : null}
              renderItem={({ item, index }) => item.kind === 'catalog' ? (
                <TouchableOpacity style={s.recipeLibraryCard} onPress={() => openCatalogRecipeDetails(item.recipe.id)}>
                  <View style={s.recipeLibraryCardTop}>
                    <Text style={s.recipeLibraryCardTitle} numberOfLines={2}>{item.translation.title}</Text>
                    <View style={s.recipeCatalogBadge}><Text style={s.recipeCatalogBadgeText}>{t('meals.recipeCatalog')}</Text></View>
                  </View>
                  <Text style={s.recipeLibraryCardDescription} numberOfLines={2}>{item.translation.description}</Text>
                  <Text style={s.recipeLibraryCardMeta}>
                    {item.recipe.servings_default} {t('meals.servings')} · {t('meals.recipeDuration', { count: item.recipe.prep_time_min + item.recipe.cook_time_min })}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View>
                  {index === visibleCatalogRecipes.length ? <Text style={s.recipeLibrarySectionTitle}>{t('meals.recipePersonalSection')}</Text> : null}
                  <TouchableOpacity style={s.recipeLibraryCard} onPress={() => openRecipeDetails(item.recipe.id)}>
                    <View style={s.recipeLibraryCardTop}>
                      <Text style={s.recipeLibraryCardTitle} numberOfLines={2}>{item.recipe.title}</Text>
                      <View style={[s.recipeVisibilityBadge, item.recipe.visibility === 'private' && s.recipeVisibilityBadgePrivate]}>
                        <Text style={[s.recipeVisibilityBadgeText, item.recipe.visibility === 'private' && s.recipeVisibilityBadgeTextPrivate]}>
                          {item.recipe.visibility === 'private' ? `🔒 ${t('meals.recipeVisibility_private')}` : `👥 ${t('meals.recipeVisibility_family')}`}
                        </Text>
                      </View>
                    </View>
                    {item.recipe.description ? <Text style={s.recipeLibraryCardDescription} numberOfLines={2}>{item.recipe.description}</Text> : null}
                    <Text style={s.recipeLibraryCardMeta}>
                      {item.recipe.servings ? `${item.recipe.servings} ${t('meals.servings')}` : t('meals.recipeNoServings')}
                      {item.recipe.prepTimeMinutes || item.recipe.cookTimeMinutes ? ` · ${t('meals.recipeDuration', { count: (item.recipe.prepTimeMinutes || 0) + (item.recipe.cookTimeMinutes || 0) })}` : ''}
                      {item.recipe.creatorName ? ` · ${t('meals.recipeBy', { name: item.recipe.creatorName })}` : ''}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  const renderRecipeDetailsModal = () => {
    const recipe = selectedRecipe as RecipeLibraryEntry | undefined;
    const catalogTranslation = selectedCatalogRecipe ? getCatalogTranslation(selectedCatalogRecipe, i18n.language) : null;
    const canManageRecipe = recipe?.createdBy === (currentUser as any)?.id;
    return (
      <Modal visible={showRecipeDetails} transparent animationType="slide" onRequestClose={() => setShowRecipeDetails(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.sheetOverlay}>
          <Pressable style={s.sheetBackdrop} onPress={() => setShowRecipeDetails(false)} />
          <View style={s.recipeDetailSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalHeaderTitle}>{catalogTranslation?.title || recipe?.title || t('meals.recipeDetails')}</Text>
              <TouchableOpacity style={s.modalCloseBtn} onPress={() => setShowRecipeDetails(false)}>
                <Text style={s.modalCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            {recipeDetailsLoading || (!recipe && !selectedCatalogRecipe) ? <ActivityIndicator style={{ marginVertical: 48 }} color="#7c3aed" /> : selectedCatalogRecipe && catalogTranslation ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={s.recipeCatalogDetailBadge}><Text style={s.recipeCatalogDetailBadgeText}>{t('meals.recipeCatalog')}</Text></View>
                <Text style={s.recipeDetailDescription}>{catalogTranslation.description}</Text>
                <Text style={s.recipeDetailMeta}>{selectedCatalogRecipe.servings_default} {t('meals.servings')} · {t('meals.recipeDuration', { count: selectedCatalogRecipe.prep_time_min + selectedCatalogRecipe.cook_time_min })}</Text>
                <Text style={s.label}>{t('meals.ingredients')}</Text>
                <View style={s.recipeDetailIngredients}>{catalogTranslation.ingredients.map((ingredient, index) => <Text key={`${ingredient.name}-${index}`} style={s.ingredientItem}>• {formatCatalogIngredient(ingredient)}</Text>)}</View>
                <Text style={s.label}>{t('meals.recipeInstructions')}</Text>
                <View style={s.recipeCatalogInstructions}>{catalogTranslation.instructions.map((instruction, index) => <Text key={`${index}-${instruction}`} style={s.recipeDetailInstructions}>{index + 1}. {instruction}</Text>)}</View>
              </ScrollView>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={[s.recipeDetailVisibility, recipe.visibility === 'private' && s.recipeDetailVisibilityPrivate]}>
                  <Text style={[s.recipeDetailVisibilityText, recipe.visibility === 'private' && s.recipeDetailVisibilityTextPrivate]}>
                    {recipe.visibility === 'private' ? `🔒 ${t('meals.recipeVisibilityPrivateDetail')}` : `👥 ${t('meals.recipeVisibilityFamilyDetail')}`}
                  </Text>
                </View>
                {recipe.description ? <Text style={s.recipeDetailDescription}>{recipe.description}</Text> : null}
                <Text style={s.recipeDetailMeta}>
                  {recipe.servings ? `${recipe.servings} ${t('meals.servings')}` : t('meals.recipeNoServings')}
                  {recipe.prepTimeMinutes || recipe.cookTimeMinutes ? ` · ${t('meals.recipeDuration', { count: (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0) })}` : ''}
                </Text>
                {recipe.creatorName ? <Text style={s.recipeDetailBy}>{t('meals.recipeBy', { name: recipe.creatorName })}</Text> : null}
                <Text style={s.label}>{t('meals.ingredients')}</Text>
                {(recipe.ingredients || []).length === 0 ? <Text style={s.recipeDetailEmpty}>{t('meals.recipeNoIngredients')}</Text> : (
                  <View style={s.recipeDetailIngredients}>{(recipe.ingredients || []).map((ingredient, index) => <Text key={`${ingredient.name}-${index}`} style={s.ingredientItem}>• {ingredient.name}</Text>)}</View>
                )}
                {recipe.instructions ? <><Text style={s.label}>{t('meals.recipeInstructions')}</Text><Text style={s.recipeDetailInstructions}>{recipe.instructions}</Text></> : null}
                {recipe.sourceUrl ? (
                  <TouchableOpacity style={s.recipeSourceButton} onPress={() => void Linking.openURL(recipe.sourceUrl!).catch(() => Alert.alert(t('meals.recipeUnavailable'), t('meals.recipeUnavailableMessage')))}>
                    <Text style={s.recipeSourceButtonText}>🔗 {t('meals.recipeSource')}</Text>
                  </TouchableOpacity>
                ) : null}
                {canManageRecipe ? (
                  <View style={s.recipeOwnerActions}>
                    <TouchableOpacity style={s.recipeEditButton} onPress={() => openRecipeEditor(recipe)} accessibilityLabel={t('meals.editRecipe')}><Text style={s.recipeEditButtonText}>✏️</Text></TouchableOpacity>
                    <TouchableOpacity style={s.recipeDeleteButton} onPress={() => removeRecipeLibraryEntry(recipe)} disabled={deleteRecipeLibraryEntry.isPending} accessibilityLabel={t('common.delete')}><Text style={s.recipeDeleteButtonText}>🗑</Text></TouchableOpacity>
                  </View>
                ) : null}
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  const renderMenuSuggestionsModal = () => (
    <Modal visible={showMenuSuggestions} transparent animationType="slide" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setShowMenuSuggestions(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.sheetOverlay}>
        <Pressable style={s.sheetBackdrop} onPress={() => setShowMenuSuggestions(false)} />
        <View style={s.menuSuggestionsSheet}>
          <View style={s.modalHeader}>
            <Text style={s.modalHeaderTitle}>✨ {t('meals.menuSuggestions')}</Text>
            <TouchableOpacity style={s.modalCloseBtn} onPress={() => setShowMenuSuggestions(false)}><Text style={s.modalCloseBtnText}>✕</Text></TouchableOpacity>
          </View>
          {menuSuggestionTarget ? <Text style={s.menuSuggestionsTarget}>{format(menuSuggestionTarget.day, 'EEEE d MMMM', { locale: dateFnsLocale })}</Text> : null}
          <Text style={s.menuSuggestionHint}>{t('meals.menuSuggestionHint')}</Text>
          <View style={s.menuSuggestionMealTypes}>
            {(Object.keys(MEAL_EMOJIS) as MealType[]).map((mealType) => (
              <TouchableOpacity key={mealType} style={[s.menuSuggestionMealType, menuSuggestionTarget?.mealType === mealType && s.menuSuggestionMealTypeActive]} onPress={() => { setMenuSuggestionTarget(current => current ? { ...current, mealType } : current); setMenuSuggestionRound(0); }}>
                <Text style={[s.menuSuggestionMealTypeText, menuSuggestionTarget?.mealType === mealType && s.menuSuggestionMealTypeTextActive]}>{MEAL_EMOJIS[mealType]} {customLabels[mealType]}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {menuSuggestionsLoading ? <ActivityIndicator style={{ marginVertical: 48 }} color="#7c3aed" /> : suggestedCatalogRecipes.length === 0 ? (
            <View style={s.menuSuggestionEmpty}><Text style={s.menuSuggestionEmptyText}>{t('meals.menuSuggestionEmpty')}</Text></View>
          ) : (
            <FlatList
              style={s.menuSuggestionList}
              data={suggestedCatalogRecipes}
              keyExtractor={(recipe) => recipe.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const translation = getCatalogTranslation(item, i18n.language);
                return (
                  <TouchableOpacity style={s.menuSuggestionCard} onPress={() => addSuggestedRecipeToMenu(item)}>
                    <Text style={s.menuSuggestionCardTitle}>{translation.title}</Text>
                    <Text style={s.menuSuggestionCardDescription} numberOfLines={2}>{translation.description}</Text>
                    <Text style={s.menuSuggestionCardMeta}>{Math.max(1, defaultServings || item.servings_default)} {t('meals.servings')} · {t('meals.recipeDuration', { count: item.prep_time_min + item.cook_time_min })}</Text>
                  </TouchableOpacity>
                );
              }}
              ListFooterComponent={menuSuggestionResult && menuSuggestionResult.eligibleCount > suggestedCatalogRecipes.length ? (
                <TouchableOpacity style={s.refreshMenuSuggestionsButton} onPress={() => setMenuSuggestionRound(round => round + 1)}>
                  <Text style={s.refreshMenuSuggestionsText}>↻ {t('meals.refreshMenuSuggestions')}</Text>
                </TouchableOpacity>
              ) : null}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderRecipeFormModal = () => (
    <Modal visible={showRecipeForm} transparent animationType="slide" onRequestClose={() => setShowRecipeForm(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.sheetOverlay}>
        <Pressable style={s.sheetBackdrop} onPress={() => setShowRecipeForm(false)} />
        <View style={s.recipeFormSheet}>
          <View style={s.modalHeader}>
            <Text style={s.modalHeaderTitle}>{editingRecipe ? t('meals.editRecipe') : t('meals.newRecipe')}</Text>
            <TouchableOpacity style={s.modalCloseBtn} onPress={() => setShowRecipeForm(false)}><Text style={s.modalCloseBtnText}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={s.label}>{t('meals.recipeTitle')}</Text>
            <TextInput style={s.input} value={recipeForm.title} onChangeText={title => setRecipeForm(current => ({ ...current, title }))} placeholder={t('meals.recipeTitlePlaceholder')} placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'} />
            <Text style={s.label}>{t('meals.recipeDescription')}</Text>
            <TextInput style={[s.input, s.recipeDescriptionInput]} value={recipeForm.description} onChangeText={description => setRecipeForm(current => ({ ...current, description }))} placeholder={t('meals.recipeDescriptionPlaceholder')} placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'} multiline maxLength={5000} />
            <Text style={s.label}>{t('meals.recipeMealTypes')}</Text>
            <Text style={s.visibilityDescription}>{t('meals.recipeMealTypeRequired')}</Text>
            <View style={s.recipeMealTypeRow}>
              {RECIPE_MEAL_TYPES.map(mealType => {
                const selected = recipeForm.mealTypes.includes(mealType);
                return (
                  <TouchableOpacity
                    key={mealType}
                    style={[s.recipeMealTypeButton, selected && s.recipeMealTypeButtonActive]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    onPress={() => setRecipeForm(current => ({
                      ...current,
                      mealTypes: selected
                        ? current.mealTypes.filter(value => value !== mealType)
                        : [...current.mealTypes, mealType],
                    }))}
                  >
                    <Text style={[s.recipeMealTypeButtonText, selected && s.recipeMealTypeButtonTextActive]}>
                      {t(`meals.${mealType}`)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={s.label}>{t('meals.ingredients')}</Text>
            <View style={s.foodItemInputRow}>
              <TextInput style={[s.input, s.foodItemInput]} value={recipeIngredientInput} onChangeText={setRecipeIngredientInput} placeholder={t('meals.recipeIngredientPlaceholder')} placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'} returnKeyType="done" onSubmitEditing={addRecipeIngredient} />
              <TouchableOpacity style={s.foodItemAddButton} onPress={addRecipeIngredient}><Text style={s.foodItemAddButtonText}>+</Text></TouchableOpacity>
            </View>
            <View style={s.foodTagList}>{recipeForm.ingredients.map(ingredient => <TouchableOpacity key={ingredient} style={s.foodTag} onPress={() => setRecipeForm(current => ({ ...current, ingredients: current.ingredients.filter(value => value !== ingredient) }))}><Text style={s.foodTagText}>{ingredient}  ×</Text></TouchableOpacity>)}</View>
            <Text style={s.label}>{t('meals.servings')}</Text>
            <View style={s.settingsRow}>
              <TouchableOpacity onPress={() => setRecipeForm(current => ({ ...current, servings: Math.max(1, current.servings - 1) }))} style={s.counterBtn}><Text style={s.counterBtnText}>−</Text></TouchableOpacity>
              <Text style={s.counterValue}>{recipeForm.servings}</Text>
              <TouchableOpacity onPress={() => setRecipeForm(current => ({ ...current, servings: Math.min(50, current.servings + 1) }))} style={s.counterBtn}><Text style={s.counterBtnText}>+</Text></TouchableOpacity>
            </View>
            <View style={s.recipeTimeRow}>
              <View style={s.recipeTimeCell}><Text style={s.label}>{t('meals.recipePrepTime')}</Text><TextInput style={s.input} value={recipeForm.prepTimeMinutes} onChangeText={prepTimeMinutes => setRecipeForm(current => ({ ...current, prepTimeMinutes }))} keyboardType="number-pad" placeholder="0" placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'} /></View>
              <View style={s.recipeTimeCell}><Text style={s.label}>{t('meals.recipeCookTime')}</Text><TextInput style={s.input} value={recipeForm.cookTimeMinutes} onChangeText={cookTimeMinutes => setRecipeForm(current => ({ ...current, cookTimeMinutes }))} keyboardType="number-pad" placeholder="0" placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'} /></View>
            </View>
            <Text style={s.label}>{t('meals.recipeInstructions')}</Text>
            <TextInput style={[s.input, s.recipeInstructionsInput]} value={recipeForm.instructions} onChangeText={instructions => setRecipeForm(current => ({ ...current, instructions }))} placeholder={t('meals.recipeInstructionsPlaceholder')} placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'} multiline maxLength={12000} />
            <Text style={s.label}>{t('meals.recipeSourceOptional')}</Text>
            <TextInput style={s.input} value={recipeForm.sourceUrl} onChangeText={sourceUrl => setRecipeForm(current => ({ ...current, sourceUrl }))} placeholder="https://..." placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'} autoCapitalize="none" keyboardType="url" />
            <Text style={s.label}>{t('meals.recipeVisibility')}</Text>
            <Text style={s.visibilityDescription}>{t('meals.recipeVisibilityDescription')}</Text>
            <View style={s.visibilityRow}>{(['family', 'private'] as RecipeVisibility[]).map(visibility => <TouchableOpacity key={visibility} style={[s.visibilityButton, recipeForm.visibility === visibility && s.visibilityButtonActive]} onPress={() => setRecipeForm(current => ({ ...current, visibility }))}><Text style={[s.visibilityButtonText, recipeForm.visibility === visibility && s.visibilityButtonTextActive]}>{t(`meals.recipeVisibility_${visibility}`)}</Text></TouchableOpacity>)}</View>
          </ScrollView>
          <TouchableOpacity style={[s.saveSettingsBtn, (createRecipeLibraryEntry.isPending || updateRecipeLibraryEntry.isPending) && s.saveSettingsBtnDisabled]} onPress={() => void saveRecipeLibraryEntry()} disabled={createRecipeLibraryEntry.isPending || updateRecipeLibraryEntry.isPending}>
            {createRecipeLibraryEntry.isPending || updateRecipeLibraryEntry.isPending ? <ActivityIndicator color="#fff" /> : <Text style={s.saveSettingsBtnText}>✓ {t('common.save')}</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  // ─── Formulaire repas (modal) ──────────────────────────────────────────────
  const renderForm = () => (
    <Modal visible={showForm} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.sheetOverlay}>
        <Pressable style={s.sheetBackdrop} onPress={() => setShowForm(false)} />
        <View style={s.sheetContent}>
          {/* Header modal */}
          <View style={s.modalHeader}>
            <Text style={s.modalHeaderTitle}>
              {editingMeal ? (t('meals.editMeal') || 'Modifier le repas') : (t('meals.newMeal') || 'Nouveau repas')}
            </Text>
            <TouchableOpacity style={s.modalCloseBtn} onPress={() => setShowForm(false)}>
              <Text style={s.modalCloseBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View>

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
                {historySuggestions.map((meal, i) => (
                  <TouchableOpacity
                    key={i}
                    style={s.historySuggestionItem}
                    onPress={() => {
                      setForm(p => ({
                        ...p,
                        name: meal.name,
                        mealType: meal.mealType || p.mealType,
                        servings: meal.servings || p.servings,
                        notes: meal.notes || '',
                        sourceUrl: meal.sourceUrl || '',
                        imageUrl: meal.imageUrl || '',
                        ingredients: p.ingredients,
                      }));
                      setHistorySuggestions([]);
                    }}
                  >
                    <Text style={s.historySuggestionEmoji}>🕐</Text>
                    <Text style={s.historySuggestionText}>{meal.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Recherche Spoonacular — désactivée temporairement (coût API + multilinguisme perfectible)
            <Text style={s.label}>🔍 {t('meals.searchRecipe') || 'Rechercher une recette'}</Text>
            ... */}

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

            {/* Type de repas — dropdown */}
            <Text style={s.label}>{t('meals.mealType') || 'Type'}</Text>
            <TouchableOpacity style={s.dropdownBtn} onPress={() => setShowMealTypeDropdown(v => !v)}>
              <Text style={s.dropdownBtnText}>{MEAL_EMOJIS[form.mealType]} {customLabels[form.mealType]} · {customTimes[form.mealType]}</Text>
              <Text style={s.dropdownArrow}>▼</Text>
            </TouchableOpacity>
            {showMealTypeDropdown && (
              <View style={s.dropdownList}>
                {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map(type => (
                  <TouchableOpacity key={type} style={s.dropdownItem} onPress={() => { setForm(p => ({ ...p, mealType: type })); setShowMealTypeDropdown(false); }}>
                    <Text style={[s.dropdownItemText, form.mealType === type && { color: '#7c3aed', fontWeight: '700' }]}>{MEAL_EMOJIS[type]} {customLabels[type]} · {customTimes[type]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

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

          </View>
          </ScrollView>
          {/* Footer fixe en bas — hors du ScrollView */}
          <View style={s.modalFooter}>
            <TouchableOpacity style={s.modalCancelBtn} onPress={() => setShowForm(false)}>
              <Text style={s.modalCancelBtnText}>✕</Text>
            </TouchableOpacity>
            {editingMeal && (
              <TouchableOpacity style={s.modalDeleteBtn} onPress={() => {
                Alert.alert(t('common.delete') || 'Supprimer', editingMeal.name, [
                  { text: t('common.cancel') || 'Annuler', style: 'cancel' },
                  { text: t('common.delete') || 'Supprimer', style: 'destructive', onPress: () => { deleteMeal.mutate({ mealId: editingMeal.id }); setShowForm(false); } },
                ]);
              }}>
                <Text style={s.modalDeleteBtnText}>🗑</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.modalSaveBtn} onPress={saveMeal}>
              <Text style={s.modalSaveBtnText}>✓</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  // ─── Modal ajout aux courses ─────────────────────────────────────────────
  const renderAddToShoppingModal = () => (
    <AddToShoppingModal
      visible={showAddToShopping}
      onClose={() => setShowAddToShopping(false)}
      mealServings={targetMealForShopping?.servings || 2}
      ingredients={ingredientsToAdd}
      activeLists={activeLists}
      familyId={familyId || 0}
      onListCreated={() => utils.shopping.listsByFamily.invalidate()}
    />
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
      {renderFoodPreferencesModal()}
      {renderRecipeLibraryModal()}
      {renderRecipeDetailsModal()}
      {renderRecipeFormModal()}
      {renderMenuSuggestionsModal()}

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
      {/* Premium Overlay - en dernier pour couvrir tout le contenu */}
      <PremiumOverlay visible={isFree} />
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
    weekPlanSummary: { marginHorizontal: 12, marginTop: 10, marginBottom: 4, padding: 10, borderRadius: 12, backgroundColor: isDark ? '#1E293B' : '#FFF7ED' },
    weekPlanSummaryTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 },
    weekPlanSummaryLabel: { color: isDark ? '#FDE68A' : '#9A3412', fontSize: 12, fontWeight: '800' },
    weekPlanSummaryCount: { color: subtext, fontSize: 11, fontWeight: '800' },
    weekPlanTrack: { height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: isDark ? '#334155' : '#FED7AA' },
    weekPlanFill: { height: '100%', borderRadius: 3, backgroundColor: '#F97316' },
    dayBlock: { borderBottomWidth: 1, borderBottomColor: border, padding: 10 },
    dayBlockToday: { borderLeftWidth: 3, borderLeftColor: '#7c3aed' },
    dayBlockDragOver: { backgroundColor: isDark ? '#2d1b69' : '#ede9fe', borderStyle: 'dashed', borderWidth: 2, borderColor: '#7c3aed' },
    dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    dayHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    dayName: { fontSize: 14, fontWeight: '700', color: text, textTransform: 'capitalize' },
    dayNameToday: { color: '#7c3aed' },
    addDayBtn: { backgroundColor: '#7c3aed', borderRadius: 14, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
    addDayBtnText: { color: '#fff', fontSize: 18, fontWeight: '700', lineHeight: 22 },
    menuSuggestionDayBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#3f2d11' : '#fff7ed', borderWidth: 1, borderColor: isDark ? '#854d0e' : '#fed7aa' },
    menuSuggestionDayBtnText: { fontSize: 15 },
    noMealText: { fontSize: 12, color: subtext, fontStyle: 'italic', paddingLeft: 4 },
    // Carte repas
    mealCard: { backgroundColor: card, borderRadius: 10, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: border },
    mealImageWrap: { width: '100%', height: 120, borderRadius: 8, overflow: 'hidden', marginBottom: 8, position: 'relative' },
    mealImage: { width: '100%', height: '100%' },
    recipeImageLink: { position: 'absolute', right: 8, bottom: 8, backgroundColor: 'rgba(31, 41, 55, 0.82)', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 },
    recipeImageLinkText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    recipeSourceButton: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: isDark ? '#312e81' : '#ede9fe' },
    recipeSourceButtonText: { color: isDark ? '#ddd6fe' : '#5b21b6', fontSize: 12, fontWeight: '700' },
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
    saveSettingsBtnDisabled: { opacity: 0.55 },
    foodPreferencesDescription: { color: subtext, fontSize: 13, lineHeight: 19, marginBottom: 10 },
    foodPreferencesButton: { borderRadius: 12, padding: 14, alignItems: 'center', backgroundColor: isDark ? '#312e81' : '#ede9fe' },
    foodPreferencesButtonText: { color: isDark ? '#ddd6fe' : '#5b21b6', fontSize: 15, fontWeight: '700' },
    recipeLibraryDescription: { color: subtext, fontSize: 13, lineHeight: 19, marginBottom: 10 },
    recipeLibraryButton: { borderRadius: 12, padding: 14, alignItems: 'center', backgroundColor: isDark ? '#1e3a5f' : '#eff6ff' },
    recipeLibraryButtonText: { color: isDark ? '#bfdbfe' : '#1d4ed8', fontSize: 15, fontWeight: '700' },
    recipeLibrarySheet: { flex: 1, marginTop: 112, backgroundColor: card, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 20, paddingHorizontal: 20, paddingBottom: 34 },
    menuSuggestionsSheet: { flex: 1, marginTop: 112, backgroundColor: card, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 20, paddingHorizontal: 20, paddingBottom: 34 },
    menuSuggestionsTarget: { color: text, fontSize: 16, fontWeight: '800', textTransform: 'capitalize', marginBottom: 4 },
    menuSuggestionHint: { color: subtext, fontSize: 12, lineHeight: 18, marginBottom: 12 },
    menuSuggestionMealTypes: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 12 },
    menuSuggestionMealType: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: isDark ? '#374151' : '#f3f4f6' },
    menuSuggestionMealTypeActive: { backgroundColor: '#7c3aed' },
    menuSuggestionMealTypeText: { color: subtext, fontSize: 12, fontWeight: '800' },
    menuSuggestionMealTypeTextActive: { color: '#fff' },
    menuSuggestionList: { flex: 1 },
    menuSuggestionCard: { backgroundColor: isDark ? '#253047' : '#f8fafc', borderWidth: 1, borderColor: border, borderRadius: 14, padding: 13, marginBottom: 9 },
    menuSuggestionCardTitle: { color: text, fontSize: 16, fontWeight: '800' },
    menuSuggestionCardDescription: { color: subtext, fontSize: 13, lineHeight: 18, marginTop: 7 },
    menuSuggestionCardMeta: { color: subtext, fontSize: 11, fontWeight: '700', marginTop: 8 },
    menuSuggestionEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
    menuSuggestionEmptyText: { color: subtext, fontSize: 14, lineHeight: 20, textAlign: 'center' },
    refreshMenuSuggestionsButton: { alignItems: 'center', backgroundColor: isDark ? '#312e81' : '#ede9fe', borderRadius: 12, padding: 13, marginTop: 4, marginBottom: 10 },
    refreshMenuSuggestionsText: { color: isDark ? '#ddd6fe' : '#5b21b6', fontSize: 14, fontWeight: '800' },
    recipeDetailSheet: { backgroundColor: card, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 20, paddingHorizontal: 20, paddingBottom: 34, maxHeight: '92%' },
    recipeFormSheet: { backgroundColor: card, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 20, paddingHorizontal: 20, paddingBottom: 22, maxHeight: '96%' },
    recipeLibraryToolbar: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 },
    recipeLibrarySearch: { flex: 1, marginBottom: 0 },
    recipeCatalogSummary: { color: subtext, fontSize: 12, fontWeight: '600', marginBottom: 8 },
    recipeLibraryList: { flex: 1 },
    recipeLibraryListContent: { paddingBottom: 6 },
    recipeLibraryListEmptyContent: { flexGrow: 1, justifyContent: 'center' },
    recipeLibrarySectionTitle: { color: text, fontSize: 14, fontWeight: '800', marginTop: 14, marginBottom: 8 },
    recipeLibraryCreateButton: { width: 46, height: 46, borderRadius: 12, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' },
    recipeLibraryCreateButtonText: { color: '#fff', fontSize: 25, fontWeight: '700', lineHeight: 29 },
    recipeLibraryEmpty: { alignItems: 'center', paddingHorizontal: 18, paddingVertical: 50 },
    recipeLibraryEmptyTitle: { color: text, fontSize: 16, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
    recipeLibraryEmptyText: { color: subtext, fontSize: 13, lineHeight: 19, textAlign: 'center' },
    recipeLibraryCard: { backgroundColor: isDark ? '#253047' : '#f8fafc', borderWidth: 1, borderColor: border, borderRadius: 14, padding: 13, marginBottom: 9 },
    recipeLibraryCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    recipeLibraryCardTitle: { color: text, fontSize: 16, fontWeight: '800', flex: 1 },
    recipeLibraryCardDescription: { color: subtext, fontSize: 13, lineHeight: 18, marginTop: 7 },
    recipeLibraryCardMeta: { color: subtext, fontSize: 11, fontWeight: '600', marginTop: 8 },
    recipeVisibilityBadge: { backgroundColor: isDark ? '#174a3a' : '#dcfce7', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
    recipeVisibilityBadgePrivate: { backgroundColor: isDark ? '#4c1d3f' : '#fce7f3' },
    recipeVisibilityBadgeText: { color: isDark ? '#86efac' : '#166534', fontSize: 10, fontWeight: '800' },
    recipeVisibilityBadgeTextPrivate: { color: isDark ? '#f9a8d4' : '#9d174d' },
    recipeCatalogBadge: { backgroundColor: isDark ? '#1e3a5f' : '#dbeafe', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
    recipeCatalogBadgeText: { color: isDark ? '#bfdbfe' : '#1d4ed8', fontSize: 10, fontWeight: '800' },
    recipeCatalogDetailBadge: { alignSelf: 'flex-start', backgroundColor: isDark ? '#1e3a5f' : '#dbeafe', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 12 },
    recipeCatalogDetailBadgeText: { color: isDark ? '#bfdbfe' : '#1d4ed8', fontSize: 12, fontWeight: '800' },
    recipeDetailVisibility: { alignSelf: 'flex-start', backgroundColor: isDark ? '#174a3a' : '#dcfce7', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 12 },
    recipeDetailVisibilityPrivate: { backgroundColor: isDark ? '#4c1d3f' : '#fce7f3' },
    recipeDetailVisibilityText: { color: isDark ? '#86efac' : '#166534', fontSize: 12, fontWeight: '800' },
    recipeDetailVisibilityTextPrivate: { color: isDark ? '#f9a8d4' : '#9d174d' },
    recipeDetailDescription: { color: text, fontSize: 14, lineHeight: 21, marginBottom: 10 },
    recipeDetailMeta: { color: subtext, fontSize: 13, fontWeight: '700' },
    recipeDetailBy: { color: subtext, fontSize: 12, marginTop: 5 },
    recipeDetailIngredients: { backgroundColor: isDark ? '#111827' : '#f8fafc', borderRadius: 10, padding: 10 },
    recipeDetailEmpty: { color: subtext, fontSize: 13, fontStyle: 'italic' },
    recipeDetailInstructions: { color: text, fontSize: 14, lineHeight: 22, marginBottom: 8 },
    recipeCatalogInstructions: { marginBottom: 6 },
    recipeOwnerActions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 20, marginBottom: 8 },
    recipeEditButton: { width: 52, height: 52, backgroundColor: isDark ? '#312e81' : '#ede9fe', borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
    recipeEditButtonText: { color: isDark ? '#ddd6fe' : '#5b21b6', fontSize: 21, fontWeight: '800' },
    recipeDeleteButton: { width: 52, height: 52, backgroundColor: isDark ? '#4c1d1d' : '#fef2f2', borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
    recipeDeleteButtonText: { color: '#dc2626', fontSize: 21, fontWeight: '800' },
    recipeDescriptionInput: { minHeight: 72, textAlignVertical: 'top' },
    recipeInstructionsInput: { minHeight: 130, textAlignVertical: 'top' },
    recipeTimeRow: { flexDirection: 'row', gap: 10 },
    recipeTimeCell: { flex: 1 },
    foodPreferencesSheet: { backgroundColor: card, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 20, paddingHorizontal: 20, paddingBottom: 34, maxHeight: '94%' },
    foodDisclaimerCard: { backgroundColor: isDark ? '#3f2d11' : '#fff7ed', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: isDark ? '#854d0e' : '#fed7aa' },
    foodDisclaimerTitle: { color: isDark ? '#fde68a' : '#9a3412', fontWeight: '800', fontSize: 14, marginBottom: 6 },
    foodDisclaimerText: { color: isDark ? '#fed7aa' : '#9a3412', fontSize: 12, lineHeight: 18 },
    dietaryStyleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
    dietaryStyleButton: { width: '48%', minHeight: 104, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#374151' : '#f3f4f6', borderWidth: 1, borderColor: 'transparent' },
    dietaryStyleButtonActive: { backgroundColor: '#7c3aed' },
    dietaryStyleIcon: { fontSize: 25, marginBottom: 4 },
    dietaryStyleButtonText: { color: subtext, fontSize: 12, fontWeight: '700' },
    dietaryStyleButtonTextActive: { color: '#fff' },
    dietaryStyleHint: { color: subtext, fontSize: 10, lineHeight: 14, textAlign: 'center', marginTop: 3 },
    dietaryStyleHintActive: { color: '#ede9fe' },
    foodItemInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    foodItemInput: { flex: 1, marginBottom: 0 },
    foodItemAddButton: { width: 46, height: 46, borderRadius: 12, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' },
    foodItemAddButtonText: { color: '#fff', fontSize: 24, lineHeight: 28, fontWeight: '700' },
    foodSuggestionLabel: { color: subtext, fontSize: 11, fontWeight: '700', marginTop: 7, marginBottom: 5 },
    foodSuggestionList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, minHeight: 4 },
    foodSuggestionChip: { backgroundColor: isDark ? '#253047' : '#eff6ff', borderColor: isDark ? '#3b82f6' : '#bfdbfe', borderWidth: 1, borderRadius: 15, paddingHorizontal: 9, paddingVertical: 5 },
    foodSuggestionChipText: { color: isDark ? '#bfdbfe' : '#1d4ed8', fontSize: 12, fontWeight: '700' },
    foodSuggestionHelp: { color: subtext, fontSize: 11, fontStyle: 'italic', marginTop: 6 },
    foodTagList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, minHeight: 8, marginTop: 8, marginBottom: 4 },
    foodTag: { backgroundColor: isDark ? '#312e81' : '#ede9fe', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 },
    foodTagText: { color: isDark ? '#ddd6fe' : '#5b21b6', fontSize: 12, fontWeight: '700' },
    foodNotesInput: { minHeight: 74, textAlignVertical: 'top' },
    visibilityDescription: { color: subtext, fontSize: 12, lineHeight: 17, marginBottom: 8 },
    visibilityRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    visibilityButton: { flex: 1, alignItems: 'center', borderRadius: 10, padding: 11, backgroundColor: isDark ? '#374151' : '#f3f4f6' },
    visibilityButtonActive: { backgroundColor: '#7c3aed' },
    visibilityButtonText: { color: subtext, fontSize: 13, fontWeight: '700' },
    visibilityButtonTextActive: { color: '#fff' },
    recipeMealTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
    recipeMealTypeButton: { alignItems: 'center', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: isDark ? '#374151' : '#f3f4f6' },
    recipeMealTypeButtonActive: { backgroundColor: '#7c3aed' },
    recipeMealTypeButtonText: { color: subtext, fontSize: 13, fontWeight: '700' },
    recipeMealTypeButtonTextActive: { color: '#fff' },
    disclaimerAckRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 10 },
    disclaimerCheck: { width: 22, height: 22, marginTop: 1, borderWidth: 1.5, borderColor: isDark ? '#9ca3af' : '#6b7280', borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
    disclaimerCheckActive: { borderColor: '#7c3aed', backgroundColor: '#7c3aed' },
    disclaimerCheckText: { color: '#fff', fontWeight: '800', fontSize: 14 },
    disclaimerAckText: { color: text, flex: 1, fontSize: 13, lineHeight: 19 },
    // Formulaire
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' },
    sheetOverlay: { flex: 1, justifyContent: 'flex-end' },
    sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    sheetContent: { backgroundColor: card, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 20, paddingHorizontal: 20, paddingBottom: 34, maxHeight: '92%' },
    dropdownBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: isDark ? '#374151' : '#f3f4f6', borderRadius: 10, padding: 12, marginBottom: 4 },
    dropdownBtnText: { fontSize: 14, color: isDark ? '#f9fafb' : '#111827', fontWeight: '500', flex: 1 },
    dropdownArrow: { fontSize: 12, color: isDark ? '#9ca3af' : '#6b7280', marginLeft: 8 },
    dropdownList: { backgroundColor: isDark ? '#374151' : '#fff', borderRadius: 10, borderWidth: 1, borderColor: isDark ? '#4b5563' : '#e5e7eb', marginBottom: 8, overflow: 'hidden' },
    dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: isDark ? '#4b5563' : '#f3f4f6' },
    dropdownItemText: { fontSize: 14, color: isDark ? '#f9fafb' : '#111827' },
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
    // Nouveau style modal (header + footer avec mots)
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: isDark ? '#374151' : '#f3f4f6', paddingBottom: 12 },
    modalHeaderTitle: { fontSize: 18, fontWeight: '700', color: text, flex: 1 },
    modalCloseBtn: { padding: 6 },
    modalCloseBtnText: { fontSize: 20, color: '#6b7280', fontWeight: '600' },
    modalFooter: { flexDirection: 'row', gap: 12, marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: isDark ? '#374151' : '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
    modalCancelBtn: { width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, borderColor: isDark ? '#4b5563' : '#d1d5db', alignItems: 'center', justifyContent: 'center' },
    modalCancelBtnText: { fontSize: 20, fontWeight: '600', color: isDark ? '#d1d5db' : '#6b7280' },
    modalDeleteBtn: { width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, borderColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
    modalDeleteBtnText: { fontSize: 20, fontWeight: '600', color: '#ef4444' },
    modalSaveBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' },
    modalSaveBtnText: { fontSize: 22, fontWeight: '700', color: '#fff' },
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
