/**
 * useAppleCalendar.ts — STUB (expo-calendar désactivé pour compatibilité build 64)
 * La synchronisation calendrier natif sera réactivée avec le build 65+.
 */
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
  id: string;
  title: string;
}

// ─── Stubs (expo-calendar non disponible dans ce build) ───────────────────────

export async function requestCalendarPermissions(): Promise<boolean> {
  return false;
}

export async function checkCalendarPermissions(): Promise<boolean> {
  return false;
}

export async function saveConnectedCalendar(calendarId: string, calendarTitle: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_CONNECTED_CALENDAR, calendarId);
  await AsyncStorage.setItem(STORAGE_CONNECTED_CALENDAR_TITLE, calendarTitle);
}

export async function getConnectedCalendar(): Promise<ConnectedNativeCalendar | null> {
  const id = await AsyncStorage.getItem(STORAGE_CONNECTED_CALENDAR);
  const title = await AsyncStorage.getItem(STORAGE_CONNECTED_CALENDAR_TITLE);
  if (!id || !title) return null;
  return { id, title };
}

export async function disconnectNativeCalendar(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_CONNECTED_CALENDAR);
  await AsyncStorage.removeItem(STORAGE_CONNECTED_CALENDAR_TITLE);
}

export async function updateLastSync(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_LAST_SYNC, new Date().toISOString());
}

export async function saveEventMapping(fri2planEventId: string | number, nativeEventId: string): Promise<void> {
  await AsyncStorage.setItem(`${STORAGE_EVENT_MAPPING_PREFIX}${fri2planEventId}`, nativeEventId);
}

export async function getNativeEventId(fri2planEventId: string | number): Promise<string | null> {
  return AsyncStorage.getItem(`${STORAGE_EVENT_MAPPING_PREFIX}${fri2planEventId}`);
}

export async function removeEventMapping(fri2planEventId: string | number): Promise<void> {
  await AsyncStorage.removeItem(`${STORAGE_EVENT_MAPPING_PREFIX}${fri2planEventId}`);
}

export async function getLocalCalendars(writableOnly = false): Promise<NativeCalendar[]> {
  return [];
}

export async function importEventsFromNative(
  calendarId: string,
  familyId: number,
  lastSync?: string | null
): Promise<{ imported: number; skipped: number }> {
  return { imported: 0, skipped: 0 };
}

export async function exportEventToNative(
  event: any,
  calendarId: string
): Promise<string | null> {
  return null;
}

export async function removeEventFromNative(
  fri2planEventId: string | number
): Promise<boolean> {
  return false;
}

export async function getDefaultCalendar(): Promise<NativeCalendar | null> {
  return null;
}
