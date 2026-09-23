import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const app = readFileSync(resolve(process.cwd(), 'App.tsx'), 'utf8');

describe('Reprise de session mobile', () => {
  it('n’affiche pas le sas familial après la restauration initiale d’une session valide', () => {
    expect(app).toContain('const hasCompletedInitialAuthRestore = useRef(false);');
    expect(app).toContain('if (isLoading) return;');
    expect(app).toContain('if (!hasCompletedInitialAuthRestore.current)');
    expect(app).toContain('setShowFamilyLoading(false);');
  });

  it('conserve le sas familial après une vraie connexion ou déconnexion', () => {
    expect(app).toContain("setFamilyLoadingPhase('intro');");
    expect(app).toContain('if (!isAuthenticated) {');
    expect(app).toContain('setShowFamilyLoading(true);');
  });
});
