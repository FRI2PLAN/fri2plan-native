import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const helpScreen = readFileSync(resolve(process.cwd(), 'screens/HelpScreen.tsx'), 'utf8');

describe('Liens de notation du centre d’aide', () => {
  it('ouvre la fiche Google Play de l’application native actuelle', () => {
    expect(helpScreen).toContain("const GOOGLE_PLAY_PACKAGE = 'app.fri2plan.ch';");
    expect(helpScreen).toContain('market://details?id=${GOOGLE_PLAY_PACKAGE}&reviewId=0');
    expect(helpScreen).toContain('https://play.google.com/store/apps/details?id=${GOOGLE_PLAY_PACKAGE}&reviewId=0');
    expect(helpScreen).not.toContain('space.manus.fri2plan.twa');
  });

  it('dirige iOS vers la notation de la fiche App Store actuelle', () => {
    expect(helpScreen).toContain('https://apps.apple.com/app/id6766338121?action=write-review');
  });

  it('branche les deux boutons de notation sur le même gestionnaire corrigé', () => {
    expect((helpScreen.match(/onPress=\{handleRateApp\}/g) || []).length).toBe(2);
  });
});
