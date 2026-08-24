import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const i18n = readFileSync(new URL('../i18n.ts', import.meta.url), 'utf8');
const authContext = readFileSync(new URL('../contexts/AuthContext.tsx', import.meta.url), 'utf8');

describe('Synchronisation mobile de la préférence de langue', () => {
  it('accepte et envoie les cinq langues prises en charge au point de terminaison tRPC', () => {
    expect(i18n).toContain("const SUPPORTED_LANGUAGES = ['fr', 'en', 'de', 'es', 'it'] as const;");
    expect(i18n).toContain('fetch(`${API_URL}/settings.update`, {');
    expect(i18n).toContain("Authorization: `Bearer ${token}`");
    expect(i18n).toContain('body: JSON.stringify({ json: { language } })');
  });

  it('enregistre la préférence locale avant de synchroniser le serveur', () => {
    const changeLanguageStart = i18n.indexOf('export const changeLanguage');
    const changeLanguage = i18n.slice(changeLanguageStart, i18n.indexOf('// Get current language'));

    expect(changeLanguage).toContain('await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);');
    expect(changeLanguage).toContain('await i18n.changeLanguage(language);');
    expect(changeLanguage).toContain('await syncLanguagePreference(language);');
    expect(changeLanguage.indexOf('AsyncStorage.setItem')).toBeLessThan(changeLanguage.indexOf('syncLanguagePreference'));
  });

  it('resynchronise la langue active une fois le jeton enregistré à la connexion', () => {
    const loginStart = authContext.indexOf('const login = async');
    const login = authContext.slice(loginStart, authContext.indexOf('const logout = async'));

    expect(login).toContain("const { getCurrentLanguage, syncLanguagePreference } = await import('../i18n');");
    expect(login).toContain('await syncLanguagePreference(getCurrentLanguage());');
    expect(login.indexOf("AsyncStorage.setItem('authToken', authToken)")).toBeLessThan(
      login.indexOf('await syncLanguagePreference(getCurrentLanguage());')
    );
  });
});
