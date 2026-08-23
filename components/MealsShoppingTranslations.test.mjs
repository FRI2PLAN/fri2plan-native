import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./AddToShoppingModal.tsx', import.meta.url), 'utf8');
const fr = JSON.parse(readFileSync(new URL('../locales/fr.json', import.meta.url), 'utf8'));
const en = JSON.parse(readFileSync(new URL('../locales/en.json', import.meta.url), 'utf8'));
const de = JSON.parse(readFileSync(new URL('../locales/de.json', import.meta.url), 'utf8'));

describe('Repas vers Courses — traductions', () => {
  it('utilise des clés dédiées pour la confirmation et le titre de liste', () => {
    expect(source).toContain("t('meals.ingredientsAdded')");
    expect(source).toContain("t('meals.shoppingListFor')");
  });

  it('définit ces deux clés dans les trois langues prises en charge', () => {
    for (const locale of [fr, en, de]) {
      expect(locale.meals.ingredientsAdded).toBeTruthy();
      expect(locale.meals.shoppingListFor).toBeTruthy();
    }
  });
});
