import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const mealsScreen = readFileSync(new URL('./MealsScreen.tsx', import.meta.url), 'utf8');

describe('Repas — planification chaleureuse', () => {
  it('calcule les jours planifiés et affiche une jauge de menu hebdomadaire', () => {
    expect(mealsScreen).toContain('plannedDaysCount');
    expect(mealsScreen).toContain('weeklyMenuProgress');
    expect(mealsScreen).toContain('s.weekPlanFill');
  });

  it('conserve et ouvre visiblement le lien source de la recette', () => {
    expect(mealsScreen).toContain('const openRecipeSource = useCallback');
    expect(mealsScreen).toContain('Linking.openURL(url)');
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
});
