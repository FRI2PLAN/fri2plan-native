import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./AddToShoppingModal.tsx', import.meta.url), 'utf8');
const fr = JSON.parse(readFileSync(new URL('../locales/fr.json', import.meta.url), 'utf8'));
const en = JSON.parse(readFileSync(new URL('../locales/en.json', import.meta.url), 'utf8'));
const de = JSON.parse(readFileSync(new URL('../locales/de.json', import.meta.url), 'utf8'));
const es = JSON.parse(readFileSync(new URL('../locales/es.json', import.meta.url), 'utf8'));
const italian = JSON.parse(readFileSync(new URL('../locales/it.json', import.meta.url), 'utf8'));

describe('Repas vers Courses — traductions', () => {
  it('demande un nom de liste et transmet quantité et article séparément', () => {
    expect(source).toContain("t('meals.ingredientsAdded')");
    expect(source).toContain("t('shopping.listName')");
    expect(source).toContain("t('shopping.listNameRequired')");
    expect(source).toContain('toShoppingIngredient');
    expect(source).toContain('disabled={!newListName.trim()');
  });

  it('définit le message de nom obligatoire dans les cinq langues', () => {
    for (const locale of [fr, en, de, es, italian]) {
      expect(locale.shopping.listNameRequired).toBeTruthy();
    }
  });
});
