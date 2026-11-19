import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Small AsyncStorage helpers. Everything here is per device and per Firebase uid.
 * Failures are swallowed: storage is a convenience, never a source of truth.
 */
const trustedKey = (uid: string) => `safeband.trustedDevice.${uid}`;
const pendingKey = (uid: string) => `safeband.pendingRegistration.${uid}`;
export const draftKey = (name: string, uid: string) => `safeband.draft.${name}.${uid}`;

/**
 * "Trusted device" flag set after a successful security-question check.
 * NOTE: this is an application-level check, not Firebase multi-factor authentication —
 * the flag lives on the device and the Firebase session itself is not bound to it.
 */
export async function isTrustedDevice(uid: string) {
  try { return (await AsyncStorage.getItem(trustedKey(uid))) === '1'; } catch { return false; }
}
export async function setTrustedDevice(uid: string) {
  try { await AsyncStorage.setItem(trustedKey(uid), '1'); } catch { /* ignore */ }
}

/** Data entered before the email was verified (Firestore rules reject writes until then). */
export type PendingRegistration = { phone: string; consentAcceptedAt: number };
export async function savePendingRegistration(uid: string, data: PendingRegistration) {
  try { await AsyncStorage.setItem(pendingKey(uid), JSON.stringify(data)); } catch { /* ignore */ }
}
export async function loadPendingRegistration(uid: string): Promise<PendingRegistration | null> {
  try { const raw = await AsyncStorage.getItem(pendingKey(uid)); return raw ? JSON.parse(raw) : null; } catch { return null; }
}

export async function loadDraft<T>(key: string): Promise<Partial<T> | null> {
  try { const raw = await AsyncStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
export async function saveDraft(key: string, value: unknown) {
  try { await AsyncStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}
export async function clearDraft(key: string) {
  try { await AsyncStorage.removeItem(key); } catch { /* ignore */ }
}

/** Removes everything this app stored locally for the uid (used after account deletion). */
export async function clearLocalUserData(uid: string) {
  try {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys.filter((k) => k.startsWith('safeband.') && k.endsWith(`.${uid}`)));
  } catch { /* ignore */ }
}
