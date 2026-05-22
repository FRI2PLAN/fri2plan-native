/**
 * useAppleCalendar.ts
 * Gère l'intégration avec le calendrier natif iOS (EventKit) et Android via expo-calendar.
 * Permet d'importer des événements natifs dans FRI2PLAN et d'exporter des événements FRI2PLAN
 * vers le calendrier natif de l'appareil.
 */
import * as Calendar from 'expo-calendar';
import { Platform, Alert } from 'react-native';

// ─── Types ──────────────────────────────────────────────────────────────────

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

// ─── Permissions ─────────────────────────────────────────────────────────────

/**
 * Demande les permissions d'accès au calendrier natif.
 * Retourne true si accordées, false sinon.
 */
export async function requestCalendarPermissions(): Promise<boolean> {
  try {
    if (Platform.OS === 'ios') {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      return status === 'granted';
    } else if (Platform.OS === 'android') {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      return status === 'granted';
    }
    return false;
  } catch (error) {
    console.error('[Calendar] Erreur demande permissions:', error);
    return false;
  }
}

/**
 * Vérifie si les permissions calendrier sont déjà accordées.
 */
export async function checkCalendarPermissions(): Promise<boolean> {
  try {
    const { status } = await Calendar.getCalendarPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('[Calendar] Erreur vérification permissions:', error);
    return false;
  }
}

// ─── Calendriers disponibles ─────────────────────────────────────────────────

/**
 * Récupère la liste des calendriers natifs disponibles sur l'appareil.
 * Filtre pour ne garder que les calendriers modifiables (écriture possible).
 */
export async function getLocalCalendars(writableOnly = false): Promise<NativeCalendar[]> {
  try {
    const hasPermission = await checkCalendarPermissions();
    if (!hasPermission) {
      const granted = await requestCalendarPermissions();
      if (!granted) return [];
    }

    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);

    return calendars
      .filter(cal => {
        if (writableOnly) return cal.allowsModifications;
        return true;
      })
      .map(cal => ({
        id: cal.id,
        title: cal.title,
        color: cal.color || '#7c3aed',
        source: cal.source?.name || cal.source?.type || 'Local',
        allowsModifications: cal.allowsModifications,
        type: cal.type || 'local',
      }));
  } catch (error) {
    console.error('[Calendar] Erreur récupération calendriers:', error);
    return [];
  }
}

// ─── Import d'événements natifs ───────────────────────────────────────────────

/**
 * Importe les événements d'un calendrier natif pour une période donnée.
 * @param calendarId - ID du calendrier natif à lire
 * @param startDate - Date de début de la période
 * @param endDate - Date de fin de la période
 */
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
    console.error('[Calendar] Erreur import événements:', error);
    return [];
  }
}

// ─── Export vers le calendrier natif ─────────────────────────────────────────

/**
 * Exporte un événement FRI2PLAN vers le calendrier natif de l'appareil.
 * @param event - Événement FRI2PLAN à exporter
 * @param calendarId - ID du calendrier natif cible
 * @returns L'ID de l'événement créé dans le calendrier natif, ou null en cas d'erreur
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
  calendarId: string
): Promise<string | null> {
  try {
    const hasPermission = await checkCalendarPermissions();
    if (!hasPermission) {
      const granted = await requestCalendarPermissions();
      if (!granted) return null;
    }

    const eventId = await Calendar.createEventAsync(calendarId, {
      title: event.title,
      startDate: event.startDate,
      endDate: event.endDate,
      allDay: event.allDay || false,
      notes: event.notes,
      location: event.location,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    console.log('[Calendar] Événement exporté, ID natif:', eventId);
    return eventId;
  } catch (error) {
    console.error('[Calendar] Erreur export événement:', error);
    return null;
  }
}

// ─── Suppression d'un événement natif ────────────────────────────────────────

/**
 * Supprime un événement du calendrier natif via son ID.
 * @param eventId - ID de l'événement natif à supprimer
 */
export async function removeEventFromNative(eventId: string): Promise<boolean> {
  try {
    const hasPermission = await checkCalendarPermissions();
    if (!hasPermission) return false;

    await Calendar.deleteEventAsync(eventId);
    console.log('[Calendar] Événement natif supprimé:', eventId);
    return true;
  } catch (error) {
    console.error('[Calendar] Erreur suppression événement:', error);
    return false;
  }
}

// ─── Calendrier par défaut ────────────────────────────────────────────────────

/**
 * Récupère le calendrier par défaut de l'appareil (iOS: iCloud/Local, Android: premier disponible).
 */
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

    // Fallback : premier calendrier modifiable
    const calendars = await getLocalCalendars(true);
    return calendars.length > 0 ? calendars[0] : null;
  } catch (error) {
    console.error('[Calendar] Erreur calendrier par défaut:', error);
    return null;
  }
}
