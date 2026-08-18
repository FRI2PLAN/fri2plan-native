import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const shoppingScreen = readFileSync(new URL('./ShoppingScreen.tsx', import.meta.url), 'utf8');

describe('Courses — progression du panier', () => {
  it('calcule les articles cochés et affiche une jauge de panier', () => {
    expect(shoppingScreen).toContain('checkedItemsCount');
    expect(shoppingScreen).toContain('shoppingProgressPercent');
    expect(shoppingScreen).toContain('s.basketProgressFill');
  });
});
