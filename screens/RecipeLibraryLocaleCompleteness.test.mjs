import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const locales = ['fr', 'en', 'de', 'es', 'it'];
const recipeLibraryKeys = [
  'recipeLibrary', 'recipeLibraryDescription', 'openRecipeLibrary', 'newRecipe', 'searchRecipeLibrary', 'recipeMealTypes', 'recipeMealTypeRequired',
  'recipeCatalog', 'recipeCatalogSummary', 'recipePersonalSection', 'menuSuggestions', 'openMenuSuggestions',
  'menuSuggestionHint', 'menuSuggestionEmpty', 'refreshMenuSuggestions', 'mealAlreadyPlanned', 'replaceMealMessage',
  'replaceMeal', 'menuSuggestionAdded', 'menuSuggestionSaveError',
  'recipeLibraryEmpty', 'recipeLibraryEmptyHint', 'recipeVisibility_family', 'recipeVisibility_private',
  'recipeVisibilityFamilyDetail', 'recipeVisibilityPrivateDetail', 'recipeNoServings', 'recipeDuration',
  'recipeBy', 'recipeDetails', 'recipeNoIngredients', 'recipeInstructions', 'recipeSource', 'recipeTitle',
  'recipeTitlePlaceholder', 'recipeTitleRequired', 'recipeDescription', 'recipeDescriptionPlaceholder',
  'recipeIngredientPlaceholder', 'recipePrepTime', 'recipeCookTime', 'recipeInstructionsPlaceholder',
  'recipeSourceOptional', 'recipeVisibility', 'recipeVisibilityDescription', 'editRecipe', 'recipeSaveError',
  'recipeDeleteError',
];

describe('Bibliothèque de recettes — i18n', () => {
  it('propose tous les nouveaux libellés dans les cinq langues', () => {
    for (const locale of locales) {
      const content = JSON.parse(readFileSync(new URL(`../locales/${locale}.json`, import.meta.url), 'utf8'));
      for (const key of recipeLibraryKeys) {
        expect(content.meals[key], `${locale}: meals.${key}`).toEqual(expect.any(String));
        expect(content.meals[key].trim(), `${locale}: meals.${key}`).not.toBe('');
      }
    }
  });
});
