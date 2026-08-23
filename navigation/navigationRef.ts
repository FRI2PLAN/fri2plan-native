/**
 * Référence globale de navigation
 * Permet de naviguer depuis n'importe où dans l'app (ex: tap sur notification push)
 */
import { createNavigationContainerRef } from '@react-navigation/native';

export type RootDrawerParamList = {
  Home: undefined;
  Calendar: undefined;
  Tasks: undefined;
  Courses: undefined;
  Repas: undefined;
  Messages: undefined;
  Requests: undefined;
  Notes: undefined;
  Budget: undefined;
  Rewards: undefined;
  Members: undefined;
  Settings: undefined;
  Help: undefined;
};

export const navigationRef = createNavigationContainerRef<RootDrawerParamList>();

type NotificationData = {
  type?: string;
  actionUrl?: string;
};

let pageNavigator: ((pageIndex: number) => void) | null = null;

/** Enregistré par le pager lorsque l’application authentifiée est prête. */
export function setNotificationPageNavigator(navigator: ((pageIndex: number) => void) | null): void {
  pageNavigator = navigator;
}

function getPageFromNotification(data: NotificationData): number | null {
  const path = String(data.actionUrl || '').split('?')[0].replace(/\/$/, '');
  const pagesByPath: Record<string, number> = {
    '/calendar': 1,
    '/tasks': 2,
    '/shopping': 3,
    '/meals': 4,
    '/messages': 5,
    '/requests': 6,
    '/notes': 7,
    '/budget': 8,
    '/rewards': 9,
    '/intimate-calendar': 10,
    '/members': 11,
    '/settings': 12,
    '/help': 13,
  };
  if (pagesByPath[path] !== undefined) return pagesByPath[path];

  const type = String(data.type || '');
  if (type.includes('event') || type.includes('calendar')) return 1;
  if (type.includes('task')) return 2;
  if (type.includes('shopping') || type.includes('course')) return 3;
  if (type.includes('meal')) return 4;
  if (type.includes('message')) return 5;
  if (type.includes('request')) return 6;
  if (type.includes('note')) return 7;
  if (type.includes('budget')) return 8;
  if (type.includes('reward')) return 9;
  return null;
}

/**
 * Mapper un type de notification vers le nom de l'écran correspondant
 */
export function getScreenFromNotificationType(type: string): keyof RootDrawerParamList | null {
  if (type.includes('event') || type.includes('calendar')) return 'Calendar';
  if (type.includes('task')) return 'Tasks';
  if (type.includes('message')) return 'Messages';
  if (type.includes('shopping') || type.includes('course')) return 'Courses';
  if (type.includes('request')) return 'Requests';
  if (type.includes('budget')) return 'Budget';
  if (type.includes('reward')) return 'Rewards';
  if (type.includes('note')) return 'Notes';
  return null;
}

/**
 * Naviguer vers un écran depuis une notification
 */
export function navigateFromNotification(notification: NotificationData | string): void {
  const data = typeof notification === 'string' ? { type: notification } : notification;
  const pageIndex = getPageFromNotification(data);
  if (pageIndex !== null && pageNavigator) {
    pageNavigator(pageIndex);
    return;
  }

  const screen = getScreenFromNotificationType(data.type || '');
  if (screen && navigationRef.isReady()) {
    navigationRef.navigate(screen);
  }
}
