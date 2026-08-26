import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
const login = readFileSync(new URL('./LoginScreen.tsx', import.meta.url), 'utf8');
const register = readFileSync(new URL('./RegisterScreen.tsx', import.meta.url), 'utf8');
const members = readFileSync(new URL('./MembersScreen.tsx', import.meta.url), 'utf8');

describe('Entrée d’invitation dans l’application mobile', () => {
  it('préserve le code reçu au démarrage et choisit l’inscription ou la connexion selon l’adresse invitée', () => {
    expect(app).toContain("export const pendingInviteCode = { code: null as string | null };");
    expect(app).toContain('pendingInviteCode.code = inviteCode;');
    expect(app).toContain("initialScreenMode={inviteCodeFromLink ? (inviteHasExistingAccount ? 'login' : 'register') : undefined}");
    expect(app).toContain('hasExistingAccount: Boolean((getByCodeQuery.data as any).hasExistingAccount)');
  });

  it('préremplit et transmet le code unique lors de l’inscription', () => {
    expect(login).toContain('initialInviteCode={pendingInviteCode}');
    expect(login).toContain("setScreenMode(initialScreenMode || 'login');");
    expect(login).toContain('if (initialEmail) setEmail(initialEmail);');
    expect(register).toContain("const [inviteCode, setInviteCode] = useState(initialInviteCode || '');");
    expect(register).toContain('if (initialEmail) setEmail(initialEmail);');
    expect(register).toContain('if (initialInviteCode) {');
    expect(register).toContain('inviteCode: inviteCode || undefined,');
    expect(register).not.toContain('acceptInvitationMutation');
  });

  it('relit une URL initiale vérifiée pour ouvrir la connexion invitée au démarrage', () => {
    expect(app).toContain('Linking.getInitialURL().then(applyInvitationUrl)');
    expect(app).toContain('const verifiedInvitation = /[?&]verified=1');
    expect(app).toContain('setInviteHasExistingAccount(verifiedInvitation)');
    expect(app).toContain('setInviteHasExistingAccount((wasVerified) => wasVerified || hasExistingAccount)');
  });

  it('demande un changement de compte au lieu d’accepter une invitation destinée à une autre adresse', () => {
    expect(app).toContain("currentUserEmail?.toLowerCase() !== inv.email?.toLowerCase()");
    expect(app).toContain("t('invitation.switchAccount')");
    expect(app).toContain('onSwitchAccount={effectiveLogout}');
  });

  it('sépare le lien nominatif du code générique de cercle', () => {
    expect(members).toContain('handleShareInvitationLink');
    expect(members).toContain('handleShareCircleCode');
    expect(members).toContain('handleCopyCircleCode');
    expect(members).toContain("import * as Clipboard from 'expo-clipboard';");
    expect(members).toContain('await Clipboard.setStringAsync(code);');
    expect(members).toContain('Code du cercle copié dans le presse-papier.');
    expect(members).toContain('Dans l’application, choisis « Rejoindre un cercle » puis colle ce code.');
    expect(members).toContain('Le code de cercle est distinct du code d\'invitation nominative.');
    expect(members).toContain('https://app.fri2plan.ch/invitation/${code}');
    expect(members).not.toContain('handleCopyCode(inv.invitationCode)');
    expect(members).not.toContain('handleShareCode(inv.invitationCode)');
  });

  it('remonte les saisies d’invitation et de code au-dessus du clavier Android', () => {
    expect(members).toContain('KeyboardAvoidingView');
    expect(members).toContain("behavior={Platform.OS === 'ios' ? 'padding' : 'height'}");
    expect(members).toContain('modalDismissArea');
    expect(members).toContain('visible={showJoinCircleModal}');
    expect(members).toContain('onRequestClose={() => setShowJoinCircleModal(false)}');
  });
});
