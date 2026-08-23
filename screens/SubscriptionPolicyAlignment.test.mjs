import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const serverPolicy = readFileSync(new URL('../../fri2plan-server-git/server/subscriptionPolicy.ts', import.meta.url), 'utf8');
const serverRouter = readFileSync(new URL('../../fri2plan-server-git/server/routers.ts', import.meta.url), 'utf8');
const messages = readFileSync(new URL('./MessagesScreen.tsx', import.meta.url), 'utf8');
const fr = JSON.parse(readFileSync(new URL('../locales/fr.json', import.meta.url), 'utf8'));
const en = JSON.parse(readFileSync(new URL('../locales/en.json', import.meta.url), 'utf8'));
const de = JSON.parse(readFileSync(new URL('../locales/de.json', import.meta.url), 'utf8'));

describe('Plan gratuit — alignement site, mobile et serveur', () => {
  it('définit une grille officielle unique côté serveur', () => {
    expect(serverPolicy).toContain('activeTasks: 5');
    expect(serverPolicy).toContain('notes: 5');
    expect(serverPolicy).toContain('activeShoppingItems: 20');
    expect(serverPolicy).toContain('activeMembers: 2');
    expect(serverPolicy).toContain('messageHistoryDays: 7');
  });

  it('applique les limites côté serveur et conserve sept jours de messages gratuits', () => {
    expect(serverRouter).toContain('enforceFreeTaskCapacity(familyId)');
    expect(serverRouter).toContain('enforceFreeNotesCapacity(familyId)');
    expect(serverRouter).toContain('enforceFreeShoppingCapacity(list.familyId, 1)');
    expect(serverRouter).toContain('enforceFreeMemberInvitationCapacity(input.familyId)');
    expect(serverRouter).toContain('FREE_PLAN_LIMITS.messageHistoryDays');
  });

  it('autorise l’envoi de messages gratuits et affiche les mêmes limites dans les trois langues', () => {
    expect(messages).toContain('onPress={handleSendMessage}');
    expect(messages).not.toContain('requirePremium(() => handleSendMessage())');
    for (const locale of [fr, en, de]) {
      expect(locale.settings.featureTasks).toBeTruthy();
      expect(locale.settings.featureMessages).toBeTruthy();
      expect(locale.settings.featureShopping).toBeTruthy();
      expect(locale.settings.featureNotes).toBeTruthy();
    }
  });
});
