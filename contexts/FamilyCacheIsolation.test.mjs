import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const familyContext = readFileSync(new URL('./FamilyContext.tsx', import.meta.url), 'utf8');

describe('Cercle actif — isolation locale par utilisateur', () => {
  it('enregistre le dernier cercle avec une clé propre à chaque compte', () => {
    expect(familyContext).toContain("const storageKeyForUser = (userId: number | string) => `active_family_id_${userId}`");
    expect(familyContext).toContain("import { useAuth } from './AuthContext'");
    expect(familyContext).toContain('const storageKey = user?.id ? storageKeyForUser(user.id) : null');
  });

  it('réinitialise le cercle en mémoire à la déconnexion sans effacer la préférence du compte', () => {
    expect(familyContext).toContain('if (!storageKey) {');
    expect(familyContext).toContain('setActiveFamilyIdState(null);');
    expect(familyContext).toContain('await AsyncStorage.setItem(storageKey, String(id));');
  });
});
