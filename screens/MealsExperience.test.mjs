import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const mealsScreen = readFileSync(new URL('./MealsScreen.tsx', import.meta.url), 'utf8');

describe('Repas — planification chaleureuse', () => {
  it('calcule les jours planifiés et affiche une jauge de menu hebdomadaire', () => {
    expect(mealsScreen).toContain('plannedDaysCount');
    expect(mealsScreen).toContain('weeklyMenuProgress');
    expect(mealsScreen).toContain('s.weekPlanFill');
  });

  it('ouvre directement le lien web partagé sans le contrôle Android canOpenURL', () => {
    expect(mealsScreen).toContain('const openRecipeSource = useCallback');
    expect(mealsScreen).toContain('Linking.openURL(url)');
    expect(mealsScreen).not.toContain('Linking.canOpenURL(url)');
    expect(mealsScreen).toContain("t('meals.viewRecipe')");
    expect(mealsScreen).toContain('recipeImageLink');
    expect(mealsScreen).toContain('recipeSourceButton');
  });

  it('propose un profil alimentaire individuel avec avertissement et visibilité', () => {
    expect(mealsScreen).toContain('trpc.mealPreferences.mine.useQuery');
    expect(mealsScreen).toContain('trpc.mealPreferences.updateMine.useMutation');
    expect(mealsScreen).toContain("acknowledgeDisclaimer: true");
    expect(mealsScreen).toContain("['family', 'private'] as ProfileVisibility[]");
    expect(mealsScreen).toContain("t('meals.foodDisclaimer')");
  });

  it('conserve l’attestation et propose des aliments sans bloquer la saisie libre', () => {
    expect(mealsScreen).toContain('setFoodDisclaimerAccepted(Boolean(profile.disclaimerAcknowledgedAt))');
    expect(mealsScreen).toContain('utils.mealPreferences.mine.invalidate({ familyId })');
    expect(mealsScreen).toContain('STANDARD_FOOD_SUGGESTION_KEYS');
    expect(mealsScreen).toContain("onSubmitEditing={() => addFoodProfileItem('exclusions')}");
    expect(mealsScreen).toContain("t('meals.foodNoSuggestion')");
  });

  it('illustre les régimes sans supprimer leurs libellés accessibles', () => {
    expect(mealsScreen).toContain('DIETARY_STYLE_PRESENTATION');
    expect(mealsScreen).toContain('dietaryStyleIcon');
    expect(mealsScreen).toContain('accessibilityState={{ selected: foodProfile.dietaryStyle === style }}');
  });

  it('relie la bibliothèque à ses routes protégées et distingue les recettes privées', () => {
    expect(mealsScreen).toContain('trpc.meals.recipeLibrary.list.useQuery');
    expect(mealsScreen).toContain('trpc.meals.recipeLibrary.get.useQuery');
    expect(mealsScreen).toContain('trpc.meals.recipeLibrary.create.useMutation');
    expect(mealsScreen).toContain('trpc.meals.recipeLibrary.update.useMutation');
    expect(mealsScreen).toContain('trpc.meals.recipeLibrary.delete.useMutation');
    expect(mealsScreen).toContain("['family', 'private'] as RecipeVisibility[]");
  });

  it('conserve une création manuelle avec ingrédients libres, détails et recherche locale', () => {
    expect(mealsScreen).toContain('addRecipeIngredient');
    expect(mealsScreen).toContain('recipeForm.ingredients');
    expect(mealsScreen).toContain('visibleRecipeLibrary');
    expect(mealsScreen).toContain('renderRecipeDetailsModal');
    expect(mealsScreen).toContain('recipeLibrarySearch');
  });

  it('réutilise le catalogue commun hors ligne sans confondre ses recettes avec celles du cercle', () => {
    expect(mealsScreen).toContain("import recipeCatalogData from '../data/fri2plan_recipes_500_multilingual.json'");
    expect(mealsScreen).toContain('visibleCatalogRecipes');
    expect(mealsScreen).toContain('openCatalogRecipeDetails');
    expect(mealsScreen).toContain('recipeCatalogSummary');
    expect(mealsScreen).toContain('<FlatList');
  });

  it('identifie le créateur avec la route auth.me réellement exposée par le serveur', () => {
    expect(mealsScreen).toContain('trpc.auth.me.useQuery()');
    expect(mealsScreen).not.toContain('trpc.user.me.useQuery()');
  });

  it('garde la fenêtre de bibliothèque au-dessus de tout le contenu de paramètres', () => {
    expect(mealsScreen).toContain('statusBarTranslucent navigationBarTranslucent');
    expect(mealsScreen).toContain("recipeLibrarySheet: { flex: 1, marginTop: 112");
  });

  it('utilise des icônes accessibles pour les actions du créateur', () => {
    expect(mealsScreen).toContain("accessibilityLabel={t('meals.editRecipe')}");
    expect(mealsScreen).toContain("accessibilityLabel={t('common.delete')}");
    expect(mealsScreen).toContain('recipeEditButtonText}>✏️</Text>');
    expect(mealsScreen).toContain('recipeDeleteButtonText}>🗑</Text>');
  });

  it('propose cinq recettes du cercle, permet de renouveler et confirme un remplacement', () => {
    expect(mealsScreen).toContain('trpc.meals.menuSuggestions.useQuery');
    expect(mealsScreen).toContain('menuSuggestionRound');
    expect(mealsScreen).toContain('suggestedCatalogRecipes');
    expect(mealsScreen).toContain('setMenuSuggestionRound(round => round + 1)');
    expect(mealsScreen).toContain("t('meals.mealAlreadyPlanned')");
    expect(mealsScreen).toContain("t('meals.replaceMeal')");
    expect(mealsScreen).toContain('addSuggestedRecipeToMenu');
  });

  it('adapte une suggestion au nombre de convives configuré avant de l’enregistrer', () => {
    expect(mealsScreen).toContain('const scaleCatalogIngredient');
    expect(mealsScreen).toContain('const servings = Math.max(1, defaultServings || recipe.servings_default)');
    expect(mealsScreen).toContain('const portionsRatio = servings / recipe.servings_default');
    expect(mealsScreen).toContain('formatCatalogIngredient(scaleCatalogIngredient(ingredient, portionsRatio))');
    expect(mealsScreen).toContain('Math.max(1, defaultServings || item.servings_default)');
  });

  it('demande au créateur de taguer une recette manuelle par type de repas', () => {
    expect(mealsScreen).toContain('const RECIPE_MEAL_TYPES');
    expect(mealsScreen).toContain('parseRecipeMealTypes(recipe.tags)');
    expect(mealsScreen).toContain("t('meals.recipeMealTypes')");
    expect(mealsScreen).toContain("t('meals.recipeMealTypeRequired')");
    expect(mealsScreen).toContain('tags: recipeForm.mealTypes');
  });

  it('reconstruit les repas issus du catalogue dans la langue active sans traduire le texte libre', () => {
    expect(mealsScreen).toContain('CATALOG_RECIPE_REFERENCE');
    expect(mealsScreen).toContain('getCatalogMealPresentation');
    expect(mealsScreen).toContain('[fri2plan-catalog:${recipe.id}]');
    expect(mealsScreen).toContain('catalogPresentation?.title || meal.name');
    expect(mealsScreen).toContain('catalogPresentation?.ingredients');
  });

  it('présente les types de repas en grille uniforme avec leurs libellés traduits actifs', () => {
    expect(mealsScreen).toContain("menuSuggestionMealType: { width: '48.5%'");
    expect(mealsScreen).toContain("recipeMealTypeButton: { width: '48.5%'");
    expect(mealsScreen).toContain('{mealLabels[mealType]}');
    expect(mealsScreen).toContain('{MEAL_EMOJIS[mealType]}');
  });
});
