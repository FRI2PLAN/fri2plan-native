/**
 * usePushNotifications
 * Gère l'enregistrement du token FCM natif via @react-native-firebase/messaging,
 * les permissions Android/iOS, et la réception des notifications en foreground.
 *
 * Le token FCM natif est envoyé au serveur via trpc.fcm.registerToken.
 */
import { useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';

// ─── Configuration du comportement des notifications en foreground ────────────
// Les notifications s'affichent TOUJOURS (même si l'app est ouverte)
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data as Record<string, string> | undefined;
    const type = data?.type || '';
    const isUrgent = type.includes('reminder') || type.includes('message');
    return {
      shouldShowAlert: true,
      shouldPlaySound: isUrgent,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

export interface PushNotificationState {
  fcmToken: string | null;
  notification: Notifications.Notification | null;
  permissionStatus: 'granted' | 'denied' | 'undetermined' | null;
  error: string | null;
}

/**
 * Enregistre l'appareil pour les notifications push FCM natif.
 * Retourne le token FCM natif (pas un token Expo).
 * Doit être appelé après que l'utilisateur est authentifié.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    // Créer les canaux de notification Android (requis Android 8+)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('fri2plan_notifications', {
        name: 'FRI2PLAN — Rappels',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#7c3aed',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
        description: 'Rappels d\'événements et de tâches',
      });
      await Notifications.setNotificationChannelAsync('fri2plan_messages', {
        name: 'FRI2PLAN — Messages',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 100, 100, 100],
        lightColor: '#7c3aed',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
        description: 'Messages familiaux',
      });
      await Notifications.setNotificationChannelAsync('fri2plan_general', {
        name: 'FRI2PLAN — Général',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 100],
        lightColor: '#7c3aed',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
        description: 'Notifications générales',
      });
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
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

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

    // Écouter les notifications reçues en foreground via expo-notifications
    notificationListener.current = Notifications.addNotificationReceivedListener(notif => {
      setNotification(notif);
      console.log('[Push] Notification reçue en foreground:', notif.request.content.title);
    });

    // Écouter les taps sur notifications
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as Record<string, string> | undefined;
      const type = data?.type || '';
      console.log('[Push] Notification tapée, type:', type);
      if (type) {
        import('../navigation/navigationRef').then(({ navigateFromNotification }) => {
          navigateFromNotification(type);
        }).catch(err => console.error('[Push] Erreur navigation:', err));
      }
    });

    // Écouter les messages FCM en foreground
    const unsubscribeFCM = messaging().onMessage(async remoteMessage => {
      console.log('[FCM] Message reçu en foreground:', remoteMessage.notification?.title);
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
      unsubscribeFCM();
    };
  }, []);

  return { fcmToken, notification, permissionStatus, error };
}
