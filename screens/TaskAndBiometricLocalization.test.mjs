import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const login = readFileSync(new URL('./LoginScreen.tsx', import.meta.url), 'utf8');
const tasks = readFileSync(new URL('./TasksScreen.tsx', import.meta.url), 'utf8');
const locales = ['fr', 'en', 'de', 'es', 'it'].map((language) =>
  JSON.parse(readFileSync(new URL(`../locales/${language}.json`, import.meta.url), 'utf8')),
);

describe('localisation biométrique et récurrence', () => {
  it('ne conserve pas le dialogue biométrique français dans l’écran de connexion', () => {
    expect(login).toContain("t('auth.biometricActivationTitle'");
    expect(login).toContain("t('auth.biometricActivationMessage'");
    expect(login).toContain("t('auth.biometricNotNow')");
    expect(login).not.toContain('Voulez-vous utiliser ${biometricName}');
  });

  it('localise les cinq options de récurrence dans les cinq langues', () => {
    for (const key of ['recurrenceNone', 'recurrenceDaily', 'recurrenceWeekly', 'recurrenceMonthly', 'recurrenceYearly']) {
      expect(tasks).toContain(`t('tasks.${key}')`);
    }
    for (const locale of locales) {
      for (const key of ['biometricName', 'biometricActivationTitle', 'biometricActivationMessage', 'biometricNotNow', 'biometricEnable']) {
        expect(locale.auth[key]).toBeTruthy();
      }
      for (const key of ['recurrenceNone', 'recurrenceDaily', 'recurrenceWeekly', 'recurrenceMonthly', 'recurrenceYearly']) {
        expect(locale.tasks[key]).toBeTruthy();
      }
    }
  });
});
