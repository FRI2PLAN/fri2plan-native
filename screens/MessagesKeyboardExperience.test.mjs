import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const messagesScreen = readFileSync(new URL('./MessagesScreen.tsx', import.meta.url), 'utf8');
const groupsTab = readFileSync(new URL('../components/DiscussionGroupsTab.tsx', import.meta.url), 'utf8');
const fixedHeaderLayout = readFileSync(new URL('../components/FixedHeaderLayout.tsx', import.meta.url), 'utf8');

describe('Messages — clavier Android', () => {
  it('confie le redimensionnement Android au conteneur racine du pager', () => {
    expect(fixedHeaderLayout).toContain('KeyboardAvoidingView');
    expect(fixedHeaderLayout).toContain("behavior={Platform.OS === 'ios' ? 'padding' : 'height'}");
    expect(messagesScreen).toContain('behavior="padding"');
    expect(messagesScreen).toContain("enabled={Platform.OS === 'ios'}");
    expect(messagesScreen).toContain('<View style={styles.inputContainer}>');
  });

  it('verrouille le pager dès le focus et le libère à la fermeture du clavier', () => {
    expect(messagesScreen).toContain('const handleInputFocus');
    expect(messagesScreen).toContain('onFocus={handleInputFocus}');
    expect(messagesScreen).toContain('setSwipeEnabled(false)');
    expect(messagesScreen).toContain('setSwipeEnabled(true)');
  });

  it('garde de la même façon la saisie de groupe dans le conteneur redimensionné', () => {
    expect(groupsTab).toContain('behavior="padding"');
    expect(groupsTab).toContain("enabled={Platform.OS === 'ios'}");
    expect(groupsTab).toContain('<View style={styles.inputContainer}>');
    expect(groupsTab).toContain('const handleInputFocus');
    expect(groupsTab).toContain('onFocus={handleInputFocus}');
    expect(groupsTab).toContain('openGroupConversation');
    expect(groupsTab).toContain('closeGroupConversation');
    expect(groupsTab).toContain('onPress={closeGroupConversation}');
  });

  it('conserve le même ordre de Hooks avant et après l’ouverture d’un groupe', () => {
    const safeAreaHookIndex = groupsTab.indexOf('const insets = useSafeAreaInsets();');
    const groupListBranchIndex = groupsTab.indexOf('if (!selectedGroup)');
    const conversationMarkerIndex = groupsTab.indexOf('// Vue conversation du groupe');

    expect(safeAreaHookIndex).toBeGreaterThan(-1);
    expect(safeAreaHookIndex).toBeLessThan(groupListBranchIndex);
    expect(safeAreaHookIndex).toBeLessThan(conversationMarkerIndex);
  });
});
