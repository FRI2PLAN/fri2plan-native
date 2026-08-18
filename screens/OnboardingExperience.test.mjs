import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const onboarding = readFileSync(new URL('./OnboardingScreen.tsx', import.meta.url), 'utf8');

describe('Onboarding de première connexion', () => {
  it('ne présente qu’une action de passage, ample et visible', () => {
    expect(onboarding).toContain('Passer l’introduction');
    expect(onboarding).not.toContain("{t('common.skip') || 'Passer'}");
    expect(onboarding).toContain('style={styles.skipFooterButton}');
  });

  it('reste opaque sur fond blanc cassé', () => {
    expect(onboarding).toContain('transparent={false}');
    expect(onboarding).toContain("backgroundColor: '#fffdf7'");
  });
});
