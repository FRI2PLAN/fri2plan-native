import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const messagesScreen = readFileSync(new URL('./MessagesScreen.tsx', import.meta.url), 'utf8');
const groupsTab = readFileSync(new URL('../components/DiscussionGroupsTab.tsx', import.meta.url), 'utf8');

describe('Messages — clavier Android', () => {
  it('utilise un padding de clavier dans la conversation générale au sein du pager', () => {
    expect(messagesScreen).toContain('behavior="padding"');
    expect(messagesScreen).toContain('la barre de saisie sous le clavier');
  });

  it('applique le même comportement à la conversation de groupe', () => {
    expect(groupsTab).toContain('behavior="padding"');
    expect(groupsTab).toContain('zone de saisie');
  });
});
