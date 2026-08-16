import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./SettingsScreen.tsx', import.meta.url), 'utf8');

describe('suppression de compte', () => {
  it('appelle la mutation et expose le message serveur en cas d’échec', () => {
    expect(source).toContain('deleteAccountMutation.mutate(undefined');
    expect(source).toContain("error?.message || 'La suppression du compte a échoué. Veuillez réessayer.'");
  });

  it('informe l’utilisateur si la mutation est indisponible', () => {
    expect(source).toContain('La suppression de compte est momentanément indisponible');
  });
});
