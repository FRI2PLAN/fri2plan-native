import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const locales = ['fr', 'en', 'de'].map((language) => JSON.parse(
  readFileSync(new URL(`../locales/${language}.json`, import.meta.url), 'utf8'),
));

describe('Jauges modernisées — traductions', () => {
  it('traduit la progression du panier dans toutes les langues', () => {
    for (const locale of locales) expect(locale.shopping.basketProgress).toBeTruthy();
  });

  it('conserve les libellés de progression des repas et récompenses', () => {
    for (const locale of locales) {
      expect(locale.meals.weeklyMenu).toBeTruthy();
      expect(locale.meals.daysPlanned).toContain('{{count}}');
      expect(locale.rewards.nextReward).toBeTruthy();
      expect(locale.rewards.missingPoints).toContain('{{count}}');
      expect(locale.rewards.availableNow).toContain('{{count}}');
    }
  });
});
