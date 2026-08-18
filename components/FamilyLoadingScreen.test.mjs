import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const component = readFileSync(resolve(process.cwd(), 'components/FamilyLoadingScreen.tsx'), 'utf8');
const fr = readFileSync(resolve(process.cwd(), 'locales/fr.json'), 'utf8');
const en = readFileSync(resolve(process.cwd(), 'locales/en.json'), 'utf8');
const de = readFileSync(resolve(process.cwd(), 'locales/de.json'), 'utf8');

describe('Chargement familial de l’Accueil', () => {
  it('utilise le verre violet, les bulles et cinq étapes de deux secondes avant l’ouverture', () => {
    expect(component).not.toContain("require('../assets/logo.png')");
    expect(component).toContain('backgroundColor: \'#8b5cf6\'');
    expect(component).toContain('bubblesLoop');
    expect(component).toContain('const STAGE_DURATION_MS = 2_000');
    expect(component).toContain('STAGES.length * STAGE_DURATION_MS');
    expect(component).toContain('setReady(true)');
    expect(component).toContain('onCompleteRef.current()');
    expect(component).toContain('styles.glassRim');
    expect(component).toContain('styles.glassReflection');
    expect(component).toContain('styles.glassBase');
  });

  it('référence toutes les étapes de progression traduites', () => {
    for (const key of ['loadingSocks', 'loadingCalendar', 'loadingChores', 'loadingMeals', 'loadingOrder', 'loadingReady']) {
      expect(component).toContain(`dashboard.${key}`);
      expect(fr).toContain(`"${key}"`);
      expect(en).toContain(`"${key}"`);
      expect(de).toContain(`"${key}"`);
    }
  });
});
