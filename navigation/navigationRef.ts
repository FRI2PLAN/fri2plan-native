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
export function navigateFromNotification(type: string): void {
  const screen = getScreenFromNotificationType(type);
  if (screen && navigationRef.isReady()) {
    navigationRef.navigate(screen);
  }
}
