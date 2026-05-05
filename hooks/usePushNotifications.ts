/**
 * usePushNotifications.ts
 * Gère l'enregistrement du token FCM via expo-notifications (compatible Expo managed iOS + Android).
 * Remplace @react-native-firebase/messaging pour la compatibilité iOS.
 */
import { useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, PermissionsAndroid } from 'react-native';

// Configure le comportement des notifications en foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface PushNotificationState {
  fcmToken: string | null;
  permissionStatus: 'granted' | 'denied' | 'undetermined' | null;
  error: string | null;
}

/**
 * Crée les channels Android nécessaires.
 */
async function createAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('fri2plan_reminders', {
      name: 'Rappels FRI2PLAN',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7c3aed',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });
    await Notifications.setNotificationChannelAsync('fri2plan_messages', {
      name: 'Messages FRI2PLAN',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7c3aed',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });
    await Notifications.setNotificationChannelAsync('fri2plan_general', {
      name: 'Général FRI2PLAN',
      importance: Notifications.AndroidImportance.DEFAULT,
      showBadge: true,
    });
    console.log('[Push] Channels Android créés avec succès');
  } catch (error) {
    console.error('[Push] Erreur lors de la création des channels Android:', error);
  }
}

/**
 * Enregistre l'appareil pour les notifications push via expo-notifications.
 * Retourne le token FCM natif (ExponentPushToken ou FCM token selon la config).
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      console.log('[Push] Simulateur détecté, skip push notifications');
      return null;
    }

    if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
      return null;
    }

    // Créer les channels Android AVANT de demander les permissions
    await createAndroidChannels();

    // Android 13+ : demander explicitement la permission POST_NOTIFICATIONS
    if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        console.log('[Push] Permission POST_NOTIFICATIONS refusée');
        return null;
      }
    }

    // Demander les permissions via expo-notifications
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Push] Permission notifications refusée, statut:', finalStatus);
      return null;
    }

    // Obtenir le token FCM natif (device push token)
    const tokenData = await Notifications.getDevicePushTokenAsync();
    const fcmToken = tokenData.data as string;
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

    // Écouter les notifications reçues en foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('[Push] Notification reçue en foreground:', notification.request.content.title);
    });

    // Écouter les taps sur notifications (app en background/killed)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      const type = data?.type as string | undefined;
      console.log('[Push] Notification tapée, type:', type);
      if (type) {
        import('../navigation/navigationRef').then(({ navigateFromNotification }) => {
          navigateFromNotification(type);
        }).catch(err => console.error('[Push] Erreur navigation:', err));
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return { fcmToken, permissionStatus, error };
}
