import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./RewardUnlockCelebration.tsx', import.meta.url), 'utf8');

describe('Célébration de récompense', () => {
  it('reste au premier plan, se ferme au toucher et disparaît automatiquement', () => {
    expect(source).toContain('zIndex: 50');
    expect(source).toContain('setTimeout(onDismiss, 2800)');
    expect(source).toContain('onPress={onDismiss}');
    expect(source).toContain('🎁');
  });
});
