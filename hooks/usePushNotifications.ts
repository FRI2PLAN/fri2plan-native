/**
 * usePushNotifications
 * Gère l'enregistrement du token Expo Push, les permissions Android/iOS,
 * et la réception des notifications en foreground.
 *
 * Utilise expo-notifications + expo-device.
 * Le token obtenu est un Expo Push Token (ExponentPushToken[...])
 * qui est envoyé au serveur via trpc.fcm.registerToken.
 */
import { useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// ─── Configuration du comportement des notifications en foreground ────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface PushNotificationState {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  permissionStatus: 'granted' | 'denied' | 'undetermined' | null;
  error: string | null;
}

/**
 * Enregistre l'appareil pour les notifications push et retourne le token Expo.
 * Doit être appelé après que l'utilisateur est authentifié.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Les notifications push ne fonctionnent pas sur l'émulateur/simulateur
  if (!Device.isDevice) {
    console.log('[Push] Notifications push non disponibles sur émulateur');
    return null;
  }

  // Créer le canal de notification Android (requis Android 8+)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('fri2plan_notifications', {
      name: 'FRI2PLAN',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7c3aed',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });
  }

  // Vérifier les permissions existantes
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Demander les permissions si pas encore accordées
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[Push] Permission refusée pour les notifications push');
    return null;
  }

  // Obtenir le token Expo Push
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'e57f2b3e-818f-4962-9479-6bf670caca94', // EAS project ID depuis app.json
    });
    const token = tokenData.data;
    console.log('[Push] Token Expo obtenu:', token);
    return token;
  } catch (error) {
    console.error('[Push] Erreur lors de l\'obtention du token:', error);
    return null;
  }
}

/**
 * Hook React pour gérer les notifications push dans un composant.
 * Retourne le token, la dernière notification reçue et le statut des permissions.
 */
export function usePushNotifications(): PushNotificationState {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    // Enregistrer et obtenir le token
    registerForPushNotificationsAsync()
      .then(token => {
        setExpoPushToken(token);
        setPermissionStatus(token ? 'granted' : 'denied');
      })
      .catch(err => {
        setError(String(err));
        setPermissionStatus('denied');
      });

    // Écouter les notifications reçues en foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(notif => {
      setNotification(notif);
      console.log('[Push] Notification reçue en foreground:', notif.request.content.title);
    });

    // Écouter les interactions avec les notifications (tap)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('[Push] Notification tapée, data:', data);
      // Navigation future : utiliser data.url ou data.screen pour naviguer
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return { expoPushToken, notification, permissionStatus, error };
}
