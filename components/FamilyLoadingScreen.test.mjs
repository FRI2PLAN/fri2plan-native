import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const component = readFileSync(resolve(process.cwd(), 'components/FamilyLoadingScreen.tsx'), 'utf8');
const fr = readFileSync(resolve(process.cwd(), 'locales/fr.json'), 'utf8');
const en = readFileSync(resolve(process.cwd(), 'locales/en.json'), 'utf8');
const de = readFileSync(resolve(process.cwd(), 'locales/de.json'), 'utf8');

describe('Chargement familial de l’Accueil', () => {
  it('utilise le verre violet, les bulles et le plafond de 90 % avant les données', () => {
    expect(component).toContain("require('../assets/logo.png')");
    expect(component).toContain('backgroundColor: \'#8b5cf6\'');
    expect(component).toContain('bubblesLoop');
    expect(component).toContain('ready ? 1 : 0.9');
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
