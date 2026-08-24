import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (relativePath) =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8');

const app = read('../App.tsx');
const i18n = read('../i18n.ts');
const login = read('./LoginScreen.tsx');
const calendar = read('./CalendarScreen.tsx');
const spanish = JSON.parse(read('../locales/es.json'));
const italian = JSON.parse(read('../locales/it.json'));

describe('Parcours visibles dans la langue choisie', () => {
  it('attend la préférence sauvegardée avant de rendre la connexion', () => {
    expect(i18n).toContain('export const i18nReady = initI18n();');
    expect(app).toContain('void i18nReady.finally');
    expect(app).toContain('!languageReady');
  });

  it('ne garde pas de libellés français dans la connexion', () => {
    expect(login).toContain("t('auth.loginTitle')");
    expect(login).toContain("t('auth.signIn')");
    expect(login).toContain("t('auth.dontHaveAccount')");
    expect(login).toContain("t('auth.signingIn')");
    expect(login).not.toContain('<Text style={styles.title}>Connexion</Text>');
  });

  it('traduit la confirmation de suppression d’événement', () => {
    expect(calendar).toContain("t('calendar.deleteEventTitle')");
    expect(calendar).toContain("t('calendar.deleteEventConfirm', { title: selectedEvent.title })");
    expect(calendar).not.toContain("'Supprimer l\\'événement'");
    expect(spanish.calendar.deleteEventConfirm).toMatch(/^¿.*\?$/);
    expect(italian.calendar.deleteEventConfirm).toContain('«{{title}}»');
  });
});
