import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./CompletionFeedback.tsx', import.meta.url), 'utf8');
const hapticSource = readFileSync(new URL('../hooks/useCompletionFeedback.ts', import.meta.url), 'utf8');

describe('fondations de feedback de validation', () => {
  it('utilise des animations Reanimated sans minuterie JavaScript', () => {
    expect(source).toContain("from 'react-native-reanimated'");
    expect(source).toContain('withSpring');
    expect(source).toContain('withTiming');
    expect(source).not.toContain('setTimeout');
  });

  it('utilise un retour tactile léger ou de réussite sans bloquer l’action', () => {
    expect(hapticSource).toContain('ImpactFeedbackStyle.Light');
    expect(hapticSource).toContain('NotificationFeedbackType.Success');
    expect(hapticSource).toContain('catch');
  });
});
