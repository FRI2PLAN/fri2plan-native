import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const settings = readFileSync(new URL('./SettingsScreen.tsx', import.meta.url), 'utf8');

describe('Synchronisation de langue dans Paramètres', () => {
  it('met à jour la langue locale lorsque le header modifie i18n', () => {
    expect(settings).toContain('setCurrentLanguage(i18n.language);');
    expect(settings).toContain('}, [i18n.language]);');
  });
});
