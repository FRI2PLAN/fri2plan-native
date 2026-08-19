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

  it('compte un seul rang par membre, même si la réponse de points contient un doublon', () => {
    expect(source).toContain('const uniqueFamilyPoints = useMemo');
    expect(source).toContain('const pointsByUser = new Map<number, any>();');
    expect(source).toContain('if (!pointsByUser.has(entry.userId))');
    expect(source).toContain('totalMembers: sorted.length');
  });
});
