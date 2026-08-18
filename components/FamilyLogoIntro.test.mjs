import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const intro = readFileSync(new URL('./FamilyLogoIntro.tsx', import.meta.url), 'utf8');

describe('Introduction FRI2PLAN au démarrage', () => {
  it('présente le logo seul pendant trois secondes avec un zoom respirant', () => {
    expect(intro).toContain('const INTRO_DURATION_MS = 3_000');
    expect(intro).toContain('const FADE_DURATION_MS = 300');
    expect(intro).toContain('const breathing = Animated.loop');
    expect(intro).toContain('transform: [{ scale }]');
    expect(intro).toContain("require('../assets/logo.png')");
  });

  it('fait disparaître le logo avant de passer au verre sans spinner', () => {
    expect(intro).toContain('toValue: 0');
    expect(intro).toContain('onCompleteRef.current()');
    expect(intro).not.toContain('ActivityIndicator');
  });
});
