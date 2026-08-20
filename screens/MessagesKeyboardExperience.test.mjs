import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const messagesScreen = readFileSync(new URL('./MessagesScreen.tsx', import.meta.url), 'utf8');
const groupsTab = readFileSync(new URL('../components/DiscussionGroupsTab.tsx', import.meta.url), 'utf8');

describe('Messages — clavier Android', () => {
  it('lie nativement la saisie générale à l’animation du clavier Android', () => {
    expect(messagesScreen).toContain('behavior="padding"');
    expect(messagesScreen).toContain('useAnimatedKeyboard');
    expect(messagesScreen).toContain('translateY: -keyboard.height.value');
    expect(messagesScreen).toContain('<Animated.View style={[styles.inputContainer');
    expect(messagesScreen).toContain("enabled={Platform.OS === 'ios'}");
  });

  it('verrouille le pager dès le focus et le libère à la fermeture du clavier', () => {
    expect(messagesScreen).toContain('const handleInputFocus');
    expect(messagesScreen).toContain('onFocus={handleInputFocus}');
    expect(messagesScreen).toContain('setSwipeEnabled(false)');
    expect(messagesScreen).toContain('setSwipeEnabled(true)');
  });

  it('lie de la même façon la saisie de groupe au clavier Android', () => {
    expect(groupsTab).toContain('behavior="padding"');
    expect(groupsTab).toContain('useAnimatedKeyboard');
    expect(groupsTab).toContain('translateY: -keyboard.height.value');
    expect(groupsTab).toContain('<Animated.View style={[styles.inputContainer');
    expect(groupsTab).toContain("enabled={Platform.OS === 'ios'}");
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
