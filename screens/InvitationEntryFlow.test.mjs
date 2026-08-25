import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
const login = readFileSync(new URL('./LoginScreen.tsx', import.meta.url), 'utf8');
const register = readFileSync(new URL('./RegisterScreen.tsx', import.meta.url), 'utf8');

describe('Entrée d’invitation dans l’application mobile', () => {
  it('préserve le code reçu au démarrage et ouvre l’inscription', () => {
    expect(app).toContain("export const pendingInviteCode = { code: null as string | null };");
    expect(app).toContain('pendingInviteCode.code = inviteCode;');
    expect(app).toContain("initialScreenMode={inviteCodeFromLink ? 'register' : undefined}");
  });

  it('préremplit et transmet le code unique lors de l’inscription', () => {
    expect(login).toContain('initialInviteCode={pendingInviteCode}');
    expect(register).toContain("const [inviteCode, setInviteCode] = useState(initialInviteCode || '');");
    expect(register).toContain('inviteCode: inviteCode || undefined,');
    expect(register).not.toContain('acceptInvitationMutation');
  });
});
