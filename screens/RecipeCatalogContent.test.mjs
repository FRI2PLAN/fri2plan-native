import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const catalog = JSON.parse(readFileSync(new URL('../data/fri2plan_recipes_500_multilingual.json', import.meta.url), 'utf8'));
const languages = ['fr', 'en', 'de', 'es', 'it'];

describe('Catalogue FRI2PLAN de recettes', () => {
  it('contient 500 recettes uniques et les cinq traductions complètes', () => {
    expect(catalog.recipes).toHaveLength(500);
    expect(new Set(catalog.recipes.map(recipe => recipe.id)).size).toBe(500);
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
});
