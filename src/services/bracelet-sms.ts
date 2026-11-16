import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { useEffect, useSyncExternalStore } from 'react';
import { AppState, PermissionsAndroid, Platform } from 'react-native';
import { SafebandSms, type IncomingSms } from '../../modules/safeband-sms';
import { db } from './firebase';
import { parseBraceletSms, samePhoneNumber } from './sms-parser';
import type { Ward } from '@/types/care';

/**
 * Android-only: reads location SMS sent by the bracelet's SIM card and writes them to
 * `devices/{braceletId}`, so the rest of the app (map, dashboard, alerts) picks them up.
 *
 * Works while the app is running; SMS that arrived while it was closed are read from the
 * inbox on the next launch / when the app returns to the foreground.
 */

const ENABLED_KEY = 'safeband.sms.enabled';
const lastProcessedKey = (braceletId: string) => `safeband.sms.lastProcessed.${braceletId}`;

export type SmsLastResult = { at: number; ok: boolean; sender: string };
type SmsState = { enabled: boolean | undefined; last: SmsLastResult | null; error: string | null };

let state: SmsState = { enabled: undefined, last: null, error: null };
const listeners = new Set<() => void>();
const update = (patch: Partial<SmsState>) => { state = { ...state, ...patch }; listeners.forEach(l => l()); };
let loadStarted = false;
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  if (!loadStarted) {
    loadStarted = true;
    AsyncStorage.getItem(ENABLED_KEY).then(v => update({ enabled: v === 'true' })).catch(() => update({ enabled: false }));
  }
  return () => { listeners.delete(listener); };
};

export const isSmsAvailable = () => Platform.OS === 'android' && SafebandSms !== null;

export function useSmsState() {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

const SMS_PERMISSIONS = [PermissionsAndroid.PERMISSIONS.RECEIVE_SMS, PermissionsAndroid.PERMISSIONS.READ_SMS];

export async function hasSmsPermissions() {
  if (!isSmsAvailable()) return false;
  const results = await Promise.all(SMS_PERMISSIONS.map(p => PermissionsAndroid.check(p)));
  return results.every(Boolean);
}

/** Asks for SMS permissions and turns reading on. Returns false if the user refused. */
export async function enableSmsReading() {
  if (!isSmsAvailable()) return false;
  const result = await PermissionsAndroid.requestMultiple(SMS_PERMISSIONS);
  const granted = SMS_PERMISSIONS.every(p => result[p] === PermissionsAndroid.RESULTS.GRANTED);
  if (!granted) return false;
  await AsyncStorage.setItem(ENABLED_KEY, 'true');
  update({ enabled: true, error: null });
  return true;
}

export async function disableSmsReading() {
  await AsyncStorage.setItem(ENABLED_KEY, 'false');
  SafebandSms?.stopListening();
  update({ enabled: false });
}

/** Parses one SMS and writes it to Firestore. Returns true if it was a valid bracelet message. */
export async function applyBraceletSms(braceletId: string, sms: IncomingSms) {
  const parsed = parseBraceletSms(sms.body);
  if (!parsed) return false;
  const updatedAt = Timestamp.fromMillis(sms.timestamp || Date.now());
  const location = {
    lat: parsed.lat,
    lng: parsed.lng,
    updatedAt,
    ...(parsed.source ? { source: parsed.source } : {}),
    ...(parsed.accuracyM !== undefined ? { accuracyM: parsed.accuracyM } : {}),
  };
  // mergeFields replaces these fields entirely (e.g. drops a stale `address`), other fields stay.
  await setDoc(doc(db, 'devices', braceletId), {
    location,
    braceletLocation: location,
    cells: parsed.cells,
    lastSyncAt: updatedAt,
    lastSms: { receivedAt: updatedAt, via: 'android-sms', ...(Object.keys(parsed.extra).length ? { extra: parsed.extra } : {}) },
  }, { mergeFields: ['location', 'braceletLocation', 'cells', 'lastSyncAt', 'lastSms'] });
  return true;
}

/**
 * Mount once on a screen that stays alive after login (the dashboard). Does nothing on
 * iOS/web, in Expo Go, or until reading is enabled in Settings and the ward has a phone number.
 */
export function useBraceletSmsBridge(ward: Ward | null) {
  const { enabled } = useSmsState();
  const braceletId = ward?.braceletId;
  const phone = ward?.braceletPhone;

  useEffect(() => {
    const sms = SafebandSms;
    if (!sms || !enabled || !braceletId || !phone) return;
    let cancelled = false;
    // Serialise processing so the "last processed" timestamp never goes backwards.
    let queue = Promise.resolve();

    const handle = (message: IncomingSms) => {
      queue = queue.then(async () => {
        if (cancelled || !samePhoneNumber(message.sender, phone)) return;
        const last = Number(await AsyncStorage.getItem(lastProcessedKey(braceletId))) || 0;
        if (message.timestamp && message.timestamp <= last) return;
        try {
          const ok = await applyBraceletSms(braceletId, message);
          await AsyncStorage.setItem(lastProcessedKey(braceletId), String(message.timestamp || Date.now()));
          update({ last: { at: message.timestamp || Date.now(), ok, sender: message.sender }, error: null });
        } catch (e: any) {
          update({ error: e?.message ?? String(e) });
        }
      }).catch(() => undefined);
    };

    const catchUp = async () => {
      if (!(await hasSmsPermissions())) { update({ error: 'permission' }); return; }
      const last = Number(await AsyncStorage.getItem(lastProcessedKey(braceletId))) || 0;
      // Only look back one day on the first run, so old SMS do not overwrite fresh data.
      const since = last || Date.now() - 24 * 60 * 60 * 1000;
      const inbox = await sms.readInbox(since, 50);
      // Only the newest valid message matters for the current location.
      const newest = inbox.filter(m => samePhoneNumber(m.sender, phone) && parseBraceletSms(m.body)).sort((a, b) => b.timestamp - a.timestamp)[0];
      if (newest) handle(newest);
    };

    const subscription = sms.addListener('onSmsReceived', handle);
    hasSmsPermissions().then(ok => { if (ok && !cancelled) sms.startListening(); }).catch(() => undefined);
    catchUp().catch(e => update({ error: e?.message ?? String(e) }));
    const appState = AppState.addEventListener('change', s => { if (s === 'active') catchUp().catch(() => undefined); });

    return () => {
      cancelled = true;
      subscription.remove();
      appState.remove();
      sms.stopListening();
    };
  }, [enabled, braceletId, phone]);
}
