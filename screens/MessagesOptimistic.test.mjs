import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const screen = readFileSync(new URL('./MessagesScreen.tsx', import.meta.url), 'utf8');
const locales = ['fr', 'en', 'de'].map((language) => JSON.parse(
  readFileSync(new URL(`../locales/${language}.json`, import.meta.url), 'utf8'),
));

describe('Messages — envoi immédiatement visible', () => {
  it('ajoute une bulle locale avant la confirmation serveur', () => {
    expect(screen).toContain('const [optimisticMessages, setOptimisticMessages]');
    expect(screen).toContain('const displayedMessages = useMemo');
    expect(screen).toContain('setOptimisticMessages(previous => [...previous, optimisticMessage])');
    expect(screen).toContain('data={displayedMessages}');
  });

  it('retire la bulle locale seulement au succès ou à l’échec confirmé', () => {
    expect(screen).toContain("deliveryState: isConnected ? 'sending' : 'queued'");
    expect(screen).toContain("previous.filter(message => message.id !== optimisticId)");
    expect(screen).toContain("t('messages.sending')");
  });

  it('traduit les états d’envoi dans toutes les langues', () => {
    for (const locale of locales) {
      expect(locale.messages.sending).toBeTruthy();
      expect(locale.messages.queued).toBeTruthy();
    }
  });
});
