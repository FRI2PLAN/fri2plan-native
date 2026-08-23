import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const fr = JSON.parse(readFileSync(new URL('../locales/fr.json', import.meta.url), 'utf8'));
const italian = JSON.parse(readFileSync(new URL('../locales/it.json', import.meta.url), 'utf8'));
const i18n = readFileSync(new URL('../i18n.ts', import.meta.url), 'utf8');
const header = readFileSync(new URL('../components/RichHeader.tsx', import.meta.url), 'utf8');
const settings = readFileSync(new URL('./SettingsScreen.tsx', import.meta.url), 'utf8');

function collectPaths(value, prefix = '') {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([key, child]) => collectPaths(child, prefix ? `${prefix}.${key}` : key));
}

describe('Italien — traduction complète', () => {
  it('contient exactement toutes les clés françaises', () => {
    expect(collectPaths(italian).sort()).toEqual(collectPaths(fr).sort());
  });

  it('est enregistré dans i18n, la détection automatique et les deux sélecteurs', () => {
    expect(i18n).toContain("import it from './locales/it.json'");
    expect(i18n).toContain("['fr', 'en', 'de', 'es', 'it']");
    expect(i18n).toContain('it: { translation: it }');
    expect(header).toContain("['fr', 'en', 'de', 'es', 'it'].map");
    expect(header).toContain("return '🇮🇹'");
    expect(settings).toContain("['fr', 'en', 'de', 'es', 'it'].map");
    expect(settings).toContain("t('settings.langIt')");
  });
});
