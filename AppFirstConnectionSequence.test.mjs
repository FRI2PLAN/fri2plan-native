import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
const onboarding = readFileSync(new URL('./screens/OnboardingScreen.tsx', import.meta.url), 'utf8');
const splash = readFileSync(new URL('./screens/SplashScreen.tsx', import.meta.url), 'utf8');
const familyContext = readFileSync(new URL('./contexts/FamilyContext.tsx', import.meta.url), 'utf8');

describe('Première connexion — séquence isolée', () => {
  it('affiche l’onboarding avant l’application, le logo et le verre', () => {
    expect(app).toContain("!hasSeenOnboarding ? (");
    expect(app).toContain('onComplete={completeFirstConnectionOnboarding}');
    expect(app).toContain("familyLoadingPhase === 'intro'");
    expect(app).toContain("<FamilyLogoIntro onComplete={() => setFamilyLoadingPhase('glass')} />");
    expect(app).toContain('<FamilyLoadingScreen onComplete={() => setShowFamilyLoading(false)} />');
  });

  it('ne présente aucun spinner dans le splash neutre précédent la séquence', () => {
    expect(splash).not.toContain('ActivityIndicator');
    expect(splash).not.toContain("require('../assets/logo.png')");
  });

  it('utilise un onboarding opaque avec deux grandes actions de progression', () => {
    expect(onboarding).toContain('transparent={false}');
    expect(onboarding).toContain("backgroundColor: '#fffdf7'");
    expect(onboarding).toContain('Passer l’introduction');
    expect(onboarding).toContain('minHeight: 52');
    expect(onboarding).toContain('style={styles.nextButton}');
  });

  it('recouvre toute la coque avec le logo puis le verre pendant un changement de cercle', () => {
    expect(app).toContain('<CircleTransitionOverlay />');
    expect(app).toContain('function CircleTransitionOverlay()');
    expect(app).toContain('<FamilyLogoIntro onComplete={() => setPhase(\'glass\')} />');
    expect(app).toContain('<FamilyLoadingScreen onComplete={completeCircleTransition} />');
    expect(familyContext).toContain('isCircleTransitioning');
    expect(familyContext).toContain('beginCircleTransition');
    expect(familyContext).toContain('completeCircleTransition');
  });
});
