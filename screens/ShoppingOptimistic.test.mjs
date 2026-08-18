import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const screen = readFileSync(new URL('./ShoppingScreen.tsx', import.meta.url), 'utf8');

describe('Courses — réponse visuelle immédiate', () => {
  it('affiche un article local avant la réponse serveur', () => {
    expect(screen).toContain('const optimisticId = -Date.now()');
    expect(screen).toContain('optimistic: true');
    expect(screen).toContain('id: result.itemId, optimistic: false');
  });

  it('coche et supprime localement avant la confirmation serveur', () => {
    expect(screen).toContain('checked: !current.checked');
    expect(screen).toContain('previous?.filter(current => current.id !== item.id)');
    expect(screen).toContain('utils.shopping.itemsByList.setData({ listId }, previousItems)');
  });

  it('prévoit des cibles tactiles confortables pour la coche et la suppression', () => {
    expect(screen).toContain('delayPressIn={0}');
    expect(screen).toContain('pressRetentionOffset={{ top: 18, bottom: 18, left: 18, right: 18 }}');
    expect(screen).toContain("checkbox: { width: 32, height: 32");
    expect(screen).toContain("hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}");
  });
});
