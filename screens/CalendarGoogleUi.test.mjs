import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./CalendarScreen.tsx', import.meta.url), 'utf8');

describe('parcours Google Agenda', () => {
  it('ouvre la gestion des agendas existants depuis l’unique entrée Google', () => {
    expect(source).toContain('if ((syncedCalendars as any[]).length > 0)');
    expect(source).toContain('setGoogleManageModal(true)');
    expect(source).not.toContain('Gérer les calendriers Google');
  });

  it('ne montre plus les statuts et actions de déconnexion de token', () => {
    expect(source).not.toContain('Connexion expirée — reconnectez-vous');
    expect(source).not.toContain('Déconnecter Google');
    expect(source).not.toContain('googleTokenStatus');
  });

  it('réessaie silencieusement lorsque le callback OAuth est encore en attente', () => {
    expect(source).toContain("if (data.status === 'pending')");
    expect(source).toContain('googleOAuthRetryTimer');
  });
});
