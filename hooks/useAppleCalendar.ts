/**
 * useAppleCalendar.ts
 * STUB - expo-calendar temporairement désactivé pour isoler les crashes iOS.
 * Toutes les fonctions retournent des valeurs vides/null sans appeler de module natif.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Clés AsyncStorage ────────────────────────────────────────────────────────

const STORAGE_CONNECTED_CALENDAR = 'native_calendar_connected_id';
const STORAGE_CONNECTED_CALENDAR_TITLE = 'native_calendar_connected_title';
const STORAGE_LAST_SYNC = 'native_calendar_last_sync';
const STORAGE_EVENT_MAPPING_PREFIX = 'native_event_map_';

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
  calendarId: string;
  calendarName: string;
  lastSync?: string;
}

// ─── Permissions ──────────────────────────────────────────────────────────────

export async function requestCalendarPermissions(): Promise<boolean> {
  console.log('[NativeCalendar] STUB - expo-calendar désactivé');
  return false;
}

export async function checkCalendarPermissions(): Promise<boolean> {
  return false;
}

// ─── Listing des calendriers ──────────────────────────────────────────────────

export async function getLocalCalendars(
  _writableOnly: boolean = false
): Promise<NativeCalendar[]> {
  return [];
}

// ─── Persistance du calendrier connecté ──────────────────────────────────────

export async function saveConnectedCalendar(
  calendarId: string,
  calendarName: string
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_CONNECTED_CALENDAR, calendarId);
  await AsyncStorage.setItem(STORAGE_CONNECTED_CALENDAR_TITLE, calendarName);
}

export async function getConnectedCalendar(): Promise<ConnectedNativeCalendar | null> {
  try {
    const calendarId = await AsyncStorage.getItem(STORAGE_CONNECTED_CALENDAR);
    const calendarName = await AsyncStorage.getItem(STORAGE_CONNECTED_CALENDAR_TITLE);
    const lastSync = await AsyncStorage.getItem(STORAGE_LAST_SYNC);
    if (!calendarId || !calendarName) return null;
    return { calendarId, calendarName, lastSync: lastSync || undefined };
  } catch {
    return null;
  }
}

export async function disconnectNativeCalendar(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_CONNECTED_CALENDAR);
  await AsyncStorage.removeItem(STORAGE_CONNECTED_CALENDAR_TITLE);
  await AsyncStorage.removeItem(STORAGE_LAST_SYNC);
}

export async function updateLastSync(_calendarId?: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_LAST_SYNC, new Date().toISOString());
}

// ─── Mapping IDs événements ───────────────────────────────────────────────────

export async function saveEventMapping(
  fri2planEventId: string | number,
  nativeEventId: string
): Promise<void> {
  await AsyncStorage.setItem(
    `${STORAGE_EVENT_MAPPING_PREFIX}${fri2planEventId}`,
    nativeEventId
  );
}

export async function getNativeEventId(
  fri2planEventId: string | number
): Promise<string | null> {
  return AsyncStorage.getItem(`${STORAGE_EVENT_MAPPING_PREFIX}${fri2planEventId}`);
}

export async function removeEventMapping(
  fri2planEventId: string | number
): Promise<void> {
  await AsyncStorage.removeItem(`${STORAGE_EVENT_MAPPING_PREFIX}${fri2planEventId}`);
}

// ─── Import depuis le calendrier natif ───────────────────────────────────────

export async function importEventsFromNative(
  _calendarId: string,
  _startDate: Date,
  _endDate: Date
): Promise<NativeEvent[]> {
  return [];
}

// ─── Export vers le calendrier natif ─────────────────────────────────────────

export async function exportEventToNative(
  _event: {
    title: string;
    startDate: Date;
    endDate: Date;
    allDay?: boolean;
    notes?: string;
    location?: string;
  },
  _calendarId: string,
  _fri2planEventId?: string | number
): Promise<string | null> {
  return null;
}

// ─── Suppression d'un événement natif ────────────────────────────────────────

export async function removeEventFromNative(
  _eventId: string,
  _fri2planEventId?: string | number
): Promise<boolean> {
  return false;
}

// ─── Calendrier par défaut ────────────────────────────────────────────────────

export async function getDefaultCalendar(): Promise<NativeCalendar | null> {
  return null;
}
