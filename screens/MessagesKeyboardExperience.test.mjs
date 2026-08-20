import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const messagesScreen = readFileSync(new URL('./MessagesScreen.tsx', import.meta.url), 'utf8');
const groupsTab = readFileSync(new URL('../components/DiscussionGroupsTab.tsx', import.meta.url), 'utf8');

describe('Messages — clavier Android', () => {
  it('utilise le bord supérieur réel du clavier Android dans la conversation générale', () => {
    expect(messagesScreen).toContain('behavior="padding"');
    expect(messagesScreen).toContain("Keyboard.addListener('keyboardDidShow'");
    expect(messagesScreen).toContain("Dimensions.get('window').height - coordinates.screenY");
    expect(messagesScreen).toContain('marginBottom: androidKeyboardInset');
    expect(messagesScreen).toContain("enabled={Platform.OS === 'ios'}");
  });

  it('pré-positionne la saisie au focus, avant la notification tardive du clavier Android', () => {
    expect(messagesScreen).toContain('const handleInputFocus');
    expect(messagesScreen).toContain("Dimensions.get('window').height * 0.38");
    expect(messagesScreen).toContain('onFocus={handleInputFocus}');
  });

  it('applique la même réservation jusqu’au bord du clavier à la conversation de groupe', () => {
    expect(groupsTab).toContain('behavior="padding"');
    expect(groupsTab).toContain("Keyboard.addListener('keyboardDidShow'");
    expect(groupsTab).toContain("Dimensions.get('window').height - coordinates.screenY");
    expect(groupsTab).toContain('marginBottom: androidKeyboardInset');
    expect(groupsTab).toContain("enabled={Platform.OS === 'ios'}");
    expect(groupsTab).toContain('const handleInputFocus');
    expect(groupsTab).toContain('onFocus={handleInputFocus}');
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
