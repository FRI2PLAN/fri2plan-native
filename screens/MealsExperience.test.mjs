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
});
