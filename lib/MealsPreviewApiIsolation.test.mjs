import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const previewDomain = 'https://fri2plan-server-production-f184.up.railway.app';

describe('isolation réseau de la branche Repas preview', () => {
  it('centralise la cible Railway de préproduction', () => {
    const config = read('./apiConfig.ts');
    expect(config).toContain(`API_ORIGIN = '${previewDomain}'`);
    expect(config).toContain('TRPC_API_URL = `${API_ORIGIN}/api/trpc`');
  });

  it('ne laisse aucun client réseau courant viser app.fri2plan.ch', () => {
    const sources = [
      read('./trpc.ts'),
      read('../contexts/AuthContext.tsx'),
      read('./api.ts'),
      read('../hooks/useVersionCheck.ts'),
      read('../screens/CalendarScreen.tsx'),
      read('../screens/MembersScreen.tsx'),
      read('../screens/FamilySetupScreen.tsx'),
      read('../screens/FirstConnectionFlow.tsx'),
      read('../screens/BudgetScreen.tsx'),
    ];

    for (const source of sources) {
      expect(source).not.toContain('https://app.fri2plan.ch');
    }
  });
});
