import { describe, expect, it } from 'vitest';
import { parseMealCookingNotes } from './mealCookingPresentation.js';

describe('présentation cuisine d’un repas', () => {
  it('sépare les ingrédients et les étapes numérotées importées', () => {
    expect(parseMealCookingNotes(`
[fri2plan-catalog:ignored]
Ingrédients :
• 400 g de couscous
- 2 tomates

Instructions :
1. Rincer le couscous.
2. Mélanger et servir.
`)).toEqual({
      ingredients: ['400 g de couscous', '2 tomates'],
      instructions: ['Rincer le couscous.', 'Mélanger et servir.'],
    });
  });

  it('reconnaît les en-têtes allemands et laisse les recettes sans en-tête lisibles', () => {
    expect(parseMealCookingNotes('Zutaten:\n• 250 g Nudeln\n\nZubereitung:\n1. Kochen.\n2. Abschmecken.')).toEqual({
      ingredients: ['250 g Nudeln'],
      instructions: ['Kochen.', 'Abschmecken.'],
    });
    expect(parseMealCookingNotes('Faire chauffer doucement.\nServir chaud.')).toEqual({
      ingredients: [],
      instructions: ['Faire chauffer doucement.', 'Servir chaud.'],
    });
  });
});
