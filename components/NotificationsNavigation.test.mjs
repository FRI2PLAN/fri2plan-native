import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const modal = readFileSync(new URL('./NotificationsModal.tsx', import.meta.url), 'utf8');
const layout = readFileSync(new URL('./FixedHeaderLayout.tsx', import.meta.url), 'utf8');
const navigationRef = readFileSync(new URL('../navigation/navigationRef.ts', import.meta.url), 'utf8');
const pushHook = readFileSync(new URL('../hooks/usePushNotifications.ts', import.meta.url), 'utf8');

describe('Notifications — navigation utile', () => {
  it('ouvre la page associée depuis la cloche après lecture', () => {
    expect(modal).toContain('const getDestinationPage = (notification: any): number | null');
    expect(modal).toContain("'/calendar': 1");
    expect(modal).toContain("'/messages': 5");
    expect(modal).toContain('handleNotificationPress(notification)');
    expect(layout).toContain('onNavigate={(pageIndex) => {');
  });

  it('utilise le pager actuel lors d’un toucher sur une notification système', () => {
    expect(navigationRef).toContain('setNotificationPageNavigator');
    expect(navigationRef).toContain('pageNavigator(pageIndex);');
    expect(pushHook).toContain('navigateFromNotification(data as');
  });
});
