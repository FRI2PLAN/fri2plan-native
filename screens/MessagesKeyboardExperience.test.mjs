import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const messagesScreen = readFileSync(new URL('./MessagesScreen.tsx', import.meta.url), 'utf8');
const groupsTab = readFileSync(new URL('../components/DiscussionGroupsTab.tsx', import.meta.url), 'utf8');

describe('Messages — clavier Android', () => {
  it('mesure le clavier Android et réserve son espace dans la conversation générale', () => {
    expect(messagesScreen).toContain('behavior="padding"');
    expect(messagesScreen).toContain("Keyboard.addListener('keyboardDidShow'");
    expect(messagesScreen).toContain('marginBottom: androidKeyboardHeight');
    expect(messagesScreen).toContain("enabled={Platform.OS === 'ios'}");
  });

  it('applique la même réservation de hauteur à la conversation de groupe', () => {
    expect(groupsTab).toContain('behavior="padding"');
    expect(groupsTab).toContain("Keyboard.addListener('keyboardDidShow'");
    expect(groupsTab).toContain('marginBottom: androidKeyboardHeight');
    expect(groupsTab).toContain("enabled={Platform.OS === 'ios'}");
  });
});
