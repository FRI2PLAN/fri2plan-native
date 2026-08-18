import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./CompletionFeedback.tsx', import.meta.url), 'utf8');
const hapticSource = readFileSync(new URL('../hooks/useCompletionFeedback.ts', import.meta.url), 'utf8');

describe('fondations de feedback de validation', () => {
  it('utilise des animations Reanimated pour le mouvement sans boucle JavaScript', () => {
    expect(source).toContain("from 'react-native-reanimated'");
    expect(source).toContain('withSpring');
    expect(source).toContain('withTiming');
    expect(source).not.toContain('setInterval');
  });

  it('utilise un retour tactile léger ou de réussite sans bloquer l’action', () => {
    expect(hapticSource).toContain('ImpactFeedbackStyle.Light');
    expect(hapticSource).toContain('NotificationFeedbackType.Success');
    expect(hapticSource).toContain('catch');
  });

  it('rend le gain de points assez grand et assez long pour rejoindre visuellement le compteur', () => {
    expect(source).toContain('translateY.value = withTiming(-220');
    expect(source).toContain('fontSize: 20');
    expect(source).toContain('fontSize: 22');
  });

  it('notifie la carte à la fin afin que le feedback ne se rejoue pas à chaque interaction', () => {
    expect(source).toContain('onFinished?: () => void');
    expect(source).toContain('setTimeout(onFinished, motion.micro + motion.feedbackVisible)');
  });
});
