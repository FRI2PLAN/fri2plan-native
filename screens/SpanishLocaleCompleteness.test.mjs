import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const fr = JSON.parse(readFileSync(new URL('../locales/fr.json', import.meta.url), 'utf8'));
const es = JSON.parse(readFileSync(new URL('../locales/es.json', import.meta.url), 'utf8'));
const i18n = readFileSync(new URL('../i18n.ts', import.meta.url), 'utf8');
const header = readFileSync(new URL('../components/RichHeader.tsx', import.meta.url), 'utf8');
const settings = readFileSync(new URL('./SettingsScreen.tsx', import.meta.url), 'utf8');

function collectPaths(value, prefix = '') {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([key, child]) => collectPaths(child, prefix ? `${prefix}.${key}` : key));
}

describe('Espagnol — traduction complète', () => {
  it('contient exactement toutes les clés françaises', () => {
    expect(collectPaths(es).sort()).toEqual(collectPaths(fr).sort());
  });

  it('est enregistré dans i18n, la détection automatique et les deux sélecteurs', () => {
    expect(i18n).toContain("import es from './locales/es.json'");
    expect(i18n).toContain("['fr', 'en', 'de', 'es']");
    expect(i18n).toContain('es: { translation: es }');
    expect(header).toContain("['fr', 'en', 'de', 'es'].map");
    expect(header).toContain("return '🇪🇸'");
    expect(settings).toContain("['fr', 'en', 'de', 'es'].map");
    expect(settings).toContain("t('settings.langEs')");
  });
});
