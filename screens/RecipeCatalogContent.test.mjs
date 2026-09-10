import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const firstCatalog = JSON.parse(readFileSync(new URL('../data/fri2plan_recipes_500_multilingual.json', import.meta.url), 'utf8'));
const secondCatalog = JSON.parse(readFileSync(new URL('../data/fri2plan_recipes_501_1000_multilingual.json', import.meta.url), 'utf8'));
const catalog = { recipes: [...firstCatalog.recipes, ...secondCatalog.recipes] };
const languages = ['fr', 'en', 'de', 'es', 'it'];

describe('Catalogue FRI2PLAN de recettes', () => {
  it('contient 1 000 recettes uniques et les cinq traductions complètes', () => {
    expect(firstCatalog.recipes).toHaveLength(500);
    expect(secondCatalog.recipes).toHaveLength(500);
    expect(catalog.recipes).toHaveLength(1000);
    expect(new Set(catalog.recipes.map(recipe => recipe.id)).size).toBe(1000);
    expect(catalog.recipes[0].id).toBe('fri2plan_001');
    expect(catalog.recipes.at(-1).id).toBe('fri2plan_1000');
    for (const recipe of catalog.recipes) {
      for (const language of languages) {
        const content = recipe.i18n[language];
        expect(content.title).toEqual(expect.any(String));
        expect(content.description).toEqual(expect.any(String));
        expect(content.ingredients.length).toBeGreaterThan(0);
        expect(content.instructions.length).toBeGreaterThan(0);
      }
    }
  });

  it('rend les quatre créneaux disponibles dans le catalogue étendu', () => {
    const mealTypes = new Set(secondCatalog.recipes.flatMap(recipe => recipe.meal_type_codes));
    expect(mealTypes).toEqual(new Set(['petit_dejeuner', 'dejeuner', 'diner', 'collation']));
  });
});
