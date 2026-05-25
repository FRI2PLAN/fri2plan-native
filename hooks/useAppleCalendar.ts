/**
 * useAppleCalendar.ts
 * Gère l'intégration avec le calendrier natif iOS (EventKit) et Android via expo-calendar.
 * Permet d'importer des événements natifs dans FRI2PLAN et d'exporter des événements FRI2PLAN
 * vers le calendrier natif de l'appareil.
 *
 * Fonctionnalités :
 * - Permissions iOS/Android
 * - Listing des calendriers disponibles
 * - Import natif → FRI2PLAN (avec mapping IDs pour éviter les doublons)
 * - Export FRI2PLAN → natif (avec mise à jour si déjà exporté)
 * - Suppression d'événements natifs
 * - Persistance du calendrier connecté (AsyncStorage)
 * - Dernière date de sync
 */
import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Clés AsyncStorage ────────────────────────────────────────────────────────

const STORAGE_CONNECTED_CALENDAR = 'native_calendar_connected_id';
const STORAGE_CONNECTED_CALENDAR_TITLE = 'native_calendar_connected_title';
const STORAGE_LAST_SYNC = 'native_calendar_last_sync';
const STORAGE_EVENT_MAPPING_PREFIX = 'native_event_map_'; // + fri2planEventId → nativeEventId

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NativeCalendar {
  id: string;
  title: string;
  color: string;
  source: string;
  allowsModifications: boolean;
  type: string;
}

export interface NativeEvent {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  notes?: string;
  location?: string;
  calendarId: string;
  calendarTitle?: string;
}

export interface ConnectedNativeCalendar {
  id: string;
  title: string;
  lastSync: string | null;
}

// ─── Permissions ──────────────────────────────────────────────────────────────

export async function requestCalendarPermissions(): Promise<boolean> {
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('[NativeCalendar] Erreur demande permissions:', error);
    return false;
  }
}

export async function checkCalendarPermissions(): Promise<boolean> {
  try {
    const { status } = await Calendar.getCalendarPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('[NativeCalendar] Erreur vérification permissions:', error);
    return false;
  }
}

// ─── Calendrier connecté (persistance) ───────────────────────────────────────

/**
 * Sauvegarde le calendrier natif "connecté" dans AsyncStorage.
 */
export async function saveConnectedCalendar(calendarId: string, calendarTitle: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_CONNECTED_CALENDAR, calendarId);
  await AsyncStorage.setItem(STORAGE_CONNECTED_CALENDAR_TITLE, calendarTitle);
}

/**
 * Récupère le calendrier natif connecté depuis AsyncStorage.
 */
export async function getConnectedCalendar(): Promise<ConnectedNativeCalendar | null> {
  const id = await AsyncStorage.getItem(STORAGE_CONNECTED_CALENDAR);
  const title = await AsyncStorage.getItem(STORAGE_CONNECTED_CALENDAR_TITLE);
  const lastSync = await AsyncStorage.getItem(STORAGE_LAST_SYNC);
  if (!id || !title) return null;
  return { id, title, lastSync };
}

/**
 * Supprime le calendrier natif connecté (déconnexion).
 */
export async function disconnectNativeCalendar(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_CONNECTED_CALENDAR);
  await AsyncStorage.removeItem(STORAGE_CONNECTED_CALENDAR_TITLE);
  await AsyncStorage.removeItem(STORAGE_LAST_SYNC);
  // On conserve les mappings pour éviter des doublons si reconnecté plus tard
}

/**
 * Met à jour la date de dernière synchronisation.
 */
export async function updateLastSync(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_LAST_SYNC, new Date().toISOString());
}

// ─── Mapping IDs (FRI2PLAN ↔ natif) ──────────────────────────────────────────

/**
 * Sauvegarde le mapping fri2planEventId → nativeEventId.
 */
export async function saveEventMapping(fri2planEventId: string | number, nativeEventId: string): Promise<void> {
  await AsyncStorage.setItem(`${STORAGE_EVENT_MAPPING_PREFIX}${fri2planEventId}`, nativeEventId);
}

/**
 * Récupère l'ID natif associé à un événement FRI2PLAN.
 * Retourne null si aucun mapping.
 */
export async function getNativeEventId(fri2planEventId: string | number): Promise<string | null> {
  return AsyncStorage.getItem(`${STORAGE_EVENT_MAPPING_PREFIX}${fri2planEventId}`);
}

/**
 * Supprime le mapping d'un événement FRI2PLAN.
 */
export async function removeEventMapping(fri2planEventId: string | number): Promise<void> {
  await AsyncStorage.removeItem(`${STORAGE_EVENT_MAPPING_PREFIX}${fri2planEventId}`);
}

// ─── Calendriers disponibles ──────────────────────────────────────────────────

export async function getLocalCalendars(writableOnly = false): Promise<NativeCalendar[]> {
  try {
    const hasPermission = await checkCalendarPermissions();
    if (!hasPermission) {
      const granted = await requestCalendarPermissions();
      if (!granted) return [];
    }
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    return calendars
      .filter(cal => writableOnly ? cal.allowsModifications : true)
      .map(cal => ({
        id: cal.id,
        title: cal.title,
        color: cal.color || '#7c3aed',
        source: cal.source?.name || cal.source?.type || 'Local',
        allowsModifications: cal.allowsModifications,
        type: cal.type || 'local',
      }));
  } catch (error) {
    console.error('[NativeCalendar] Erreur récupération calendriers:', error);
    return [];
  }
}

// ─── Import d'événements natifs ───────────────────────────────────────────────

export async function importEventsFromNative(
  calendarId: string,
  startDate: Date,
  endDate: Date
): Promise<NativeEvent[]> {
  try {
    const hasPermission = await checkCalendarPermissions();
    if (!hasPermission) {
      const granted = await requestCalendarPermissions();
      if (!granted) return [];
    }
    const events = await Calendar.getEventsAsync([calendarId], startDate, endDate);
    return events.map(event => ({
      id: event.id,
      title: event.title || '(Sans titre)',
      startDate: new Date(event.startDate),
      endDate: new Date(event.endDate),
      allDay: event.allDay || false,
      notes: event.notes || undefined,
      location: event.location || undefined,
      calendarId: event.calendarId,
    }));
  } catch (error) {
    console.error('[NativeCalendar] Erreur import événements:', error);
    return [];
  }
}

// ─── Export vers le calendrier natif ─────────────────────────────────────────

/**
 * Exporte un événement FRI2PLAN vers le calendrier natif.
 * Si un mapping existe déjà, met à jour l'événement existant (évite les doublons).
 * @param fri2planEventId - ID de l'événement dans FRI2PLAN (pour le mapping)
 * @param event - Données de l'événement
 * @param calendarId - ID du calendrier natif cible
 */
export async function exportEventToNative(
  event: {
    title: string;
    startDate: Date;
    endDate: Date;
    allDay?: boolean;
    notes?: string;
    location?: string;
  },
  calendarId: string,
  fri2planEventId?: string | number
): Promise<string | null> {
  try {
    const hasPermission = await checkCalendarPermissions();
    if (!hasPermission) {
      const granted = await requestCalendarPermissions();
      if (!granted) return null;
    }

    const eventDetails = {
      title: event.title,
      startDate: event.startDate,
      endDate: event.endDate,
      allDay: event.allDay || false,
      notes: event.notes,
      location: event.location,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    // Vérifier si un mapping existe déjà
    if (fri2planEventId !== undefined) {
      const existingNativeId = await getNativeEventId(fri2planEventId);
      if (existingNativeId) {
        try {
          // Tenter de mettre à jour l'événement existant
          await Calendar.updateEventAsync(existingNativeId, eventDetails);
          console.log('[NativeCalendar] Événement mis à jour, ID natif:', existingNativeId);
          return existingNativeId;
        } catch {
          // L'événement n'existe plus dans le calendrier natif, on le recrée
          console.log('[NativeCalendar] Événement natif introuvable, recréation...');
          await removeEventMapping(fri2planEventId);
        }
      }
    }

    // Créer un nouvel événement
    const newEventId = await Calendar.createEventAsync(calendarId, eventDetails);
    console.log('[NativeCalendar] Événement créé, ID natif:', newEventId);

    // Sauvegarder le mapping si un ID FRI2PLAN est fourni
    if (fri2planEventId !== undefined) {
      await saveEventMapping(fri2planEventId, newEventId);
    }

    return newEventId;
  } catch (error) {
    console.error('[NativeCalendar] Erreur export événement:', error);
    return null;
  }
}

// ─── Suppression d'un événement natif ────────────────────────────────────────

/**
 * Supprime un événement du calendrier natif.
 * Si un fri2planEventId est fourni, supprime aussi le mapping.
 */
export async function removeEventFromNative(
  eventId: string,
  fri2planEventId?: string | number
): Promise<boolean> {
  try {
    const hasPermission = await checkCalendarPermissions();
    if (!hasPermission) return false;
    await Calendar.deleteEventAsync(eventId);
    if (fri2planEventId !== undefined) {
      await removeEventMapping(fri2planEventId);
    }
    console.log('[NativeCalendar] Événement natif supprimé:', eventId);
    return true;
  } catch (error) {
    console.error('[NativeCalendar] Erreur suppression événement:', error);
    return false;
  }
}

// ─── Calendrier par défaut ────────────────────────────────────────────────────

export async function getDefaultCalendar(): Promise<NativeCalendar | null> {
  try {
    const hasPermission = await checkCalendarPermissions();
    if (!hasPermission) return null;
    if (Platform.OS === 'ios') {
      const defaultCal = await Calendar.getDefaultCalendarAsync();
      if (defaultCal) {
        return {
          id: defaultCal.id,
          title: defaultCal.title,
          color: defaultCal.color || '#7c3aed',
          source: defaultCal.source?.name || 'iCloud',
          allowsModifications: defaultCal.allowsModifications,
          type: defaultCal.type || 'local',
        };
      }
    }
    const calendars = await getLocalCalendars(true);
    return calendars.length > 0 ? calendars[0] : null;
  } catch (error) {
    console.error('[NativeCalendar] Erreur calendrier par défaut:', error);
    return null;
  }
}
