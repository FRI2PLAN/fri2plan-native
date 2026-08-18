import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./RichHeader.tsx', import.meta.url), 'utf8');

describe('Header — compteur de points', () => {
  it('écoute les variations confirmées et anime progressivement le total', () => {
    expect(source).toContain('subscribeToPointsFeedback');
    expect(source).toContain('Animated.spring(pointsScale');
    expect(source).toContain('setInterval');
    expect(source).toContain('displayedPoints');
  });
});
