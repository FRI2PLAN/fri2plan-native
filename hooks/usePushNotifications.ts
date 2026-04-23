/**
 * usePushNotifications
 * Gère l'enregistrement du token FCM natif via @react-native-firebase/messaging.
 * Utilise UNIQUEMENT @react-native-firebase/messaging — expo-notifications n'est plus utilisé.
 *
 * Le token FCM natif est envoyé au serveur via trpc.fcm.registerToken.
 */
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';

export interface PushNotificationState {
  fcmToken: string | null;
  permissionStatus: 'granted' | 'denied' | 'undetermined' | null;
  error: string | null;
}

/**
 * Enregistre l'appareil pour les notifications push FCM natif.
 * Retourne le token FCM natif.
 * Doit être appelé après que l'utilisateur est authentifié.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
      return null;
    }

    // Demander les permissions FCM
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.log('[Push] Permission FCM refusée, statut:', authStatus);
      return null;
    }

    // Obtenir le token FCM natif
    const fcmToken = await messaging().getToken();
    console.log('[Push] Token FCM natif obtenu:', fcmToken ? fcmToken.slice(0, 40) + '...' : 'null');
    return fcmToken || null;
  } catch (error) {
    console.error('[Push] Erreur lors de l\'obtention du token FCM:', error);
    return null;
  }
}

/**
 * Hook React pour gérer les notifications push dans un composant.
 */
export function usePushNotifications(): PushNotificationState {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    registerForPushNotificationsAsync()
      .then(token => {
        setFcmToken(token);
        setPermissionStatus(token ? 'granted' : 'denied');
      })
      .catch(err => {
        setError(String(err));
        setPermissionStatus('denied');
      });

    // Écouter les messages FCM reçus en foreground
    const unsubscribeFCM = messaging().onMessage(async remoteMessage => {
      console.log('[FCM] Message reçu en foreground:', remoteMessage.notification?.title);
    });

    // Écouter les taps sur notifications (app en background/killed)
    messaging().onNotificationOpenedApp(remoteMessage => {
      const type = remoteMessage.data?.type as string | undefined;
      console.log('[FCM] Notification tapée (background), type:', type);
      if (type) {
        import('../navigation/navigationRef').then(({ navigateFromNotification }) => {
          navigateFromNotification(type);
        }).catch(err => console.error('[Push] Erreur navigation:', err));
      }
    });

    // Vérifier si l'app a été ouverte depuis une notification (app killed)
    messaging().getInitialNotification().then(remoteMessage => {
      if (remoteMessage) {
        const type = remoteMessage.data?.type as string | undefined;
        console.log('[FCM] App ouverte depuis notification (killed), type:', type);
        if (type) {
          setTimeout(() => {
            import('../navigation/navigationRef').then(({ navigateFromNotification }) => {
              navigateFromNotification(type);
            }).catch(err => console.error('[Push] Erreur navigation:', err));
          }, 1000);
        }
      }
    });

    return () => {
      unsubscribeFCM();
    };
  }, []);

  return { fcmToken, permissionStatus, error };
}