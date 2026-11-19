import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, updateDoc, writeBatch, Timestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { CareEvent, Ward } from '@/types/care';

export const listenWard = (id: string, callback: (ward: Ward | null) => void) => onSnapshot(doc(db, 'wards', id), s => callback(s.exists() ? ({ id: s.id, ...s.data() } as Ward) : null));
export const listenDevice = (id: string, callback: (data: any) => void, error?: (e: Error) => void) => onSnapshot(doc(db, 'devices', id), s => callback(s.exists() ? s.data() : null), error);
export const createEvent = (event: Omit<CareEvent, 'id'|'createdAt'>) => addDoc(collection(db, 'events'), { ...event, createdAt: serverTimestamp() });
export const setSos = async (ward: Ward, active: boolean) => {
  if (!ward.braceletId) throw new Error('This person has no linked bracelet.');
  await setDoc(doc(db, 'devices', ward.braceletId), { sos: { active, updatedAt: serverTimestamp() }, commands: { alarm: active ? 'sos_on' : 'sos_off', updatedAt: serverTimestamp() } }, { merge: true });
  await createEvent({ wardId: ward.id, category: 'sos', type: active ? 'sos_activated' : 'sos_cancelled', description: active ? 'Caregiver activated SOS alarm.' : 'Caregiver cancelled SOS alarm.', severity: active ? 'critical' : 'info', requiresAttention: active });
};
export const saveWard = (id: string, data: Partial<Ward>) => updateDoc(doc(db, 'wards', id), data);

/**
 * Links a bracelet to a ward in one batch: wards/{id}.braceletId and devices/{braceletId}.wardId.
 * Firestore rules let only the ward's caregiver do this, and refuse a bracelet already linked
 * to someone else's ward.
 */
export async function bindBracelet(wardId: string, braceletId: string) {
  const batch = writeBatch(db);
  batch.update(doc(db, 'wards', wardId), { braceletId });
  batch.set(doc(db, 'devices', braceletId), { wardId }, { merge: true });
  await batch.commit();
}

/** Writes only deterministic `care-band-demo-*-{uid}` documents for the signed-in caregiver. */
export async function seedDemoData() {
  const guardianId = auth.currentUser?.uid;
  if (!guardianId) throw new Error('A signed-in caregiver is required.');
  const now = Timestamp.now(); const ago = (minutes: number) => Timestamp.fromMillis(now.toMillis() - minutes * 60_000);
  // IDs are per caregiver: with Firestore rules a shared demo ID would belong to whoever seeded it first.
  const suffix = guardianId;
  const wardId = `care-band-demo-ward-${suffix}`; const braceletId = `care-band-demo-device-${suffix}`; const batch = writeBatch(db);
  // Remove the old shared demo ward of this caregiver, if any (its device is not linked under the rules).
  await deleteDoc(doc(db, 'wards', 'care-band-demo-ward')).catch(() => undefined);
  batch.set(doc(db, 'wards', wardId), { guardianId, name: 'Aruzhan Demo', braceletId, diagnosis: 'Fictional prototype profile', healthThresholds: { minHeartRate: 50, maxHeartRate: 120, minSpo2: 92 }, safePlaces: [
    { id: 'demo-home', name: 'Demo Home', address: '12 Fictional Avenue', location: { lat: 51.1694, lng: 71.4491 }, radius: 50 },
    { id: 'demo-school', name: 'Demo School', address: '8 Sample Street', location: { lat: 51.174, lng: 71.455 }, radius: 75 },
  ], safeRoutes: [{ id: 'demo-route', name: 'Demo Home to School', points: [{ lat: 51.1694, lng: 71.4491 }, { lat: 51.174, lng: 71.455 }], tolerance: 60, enabled: true }] }, { merge: true });
  batch.set(doc(db, 'devices', braceletId), { connected: true, worn: true, battery: 78, lastSyncAt: now, location: { lat: 51.1694, lng: 71.4491, address: 'Demo Home', updatedAt: now }, braceletLocation: { lat: 51.1694, lng: 71.4491, updatedAt: now }, heartRate: 72, spo2: 98, sos: { active: false, updatedAt: now }, wardId }, { merge: true });
  [[72,98,0],[74,98,30],[69,97,60],[76,99,90]].forEach(([heartRate, spo2, minutes], index) => batch.set(doc(db, 'healthReadings', `care-band-demo-reading-${index}-${suffix}`), { wardId, heartRate, spo2, recordedAt: ago(minutes) }, { merge: true }));
  [['demo-arrived','location','arrival','Arrived at Demo Home.','info',20],['demo-sync','bracelet','synced','Bracelet synchronized successfully.','info',10],['demo-health','health','health_normal','Health readings are within configured thresholds.','info',0]].forEach(([id, category, type, description, severity, minutes]) => batch.set(doc(db, 'events', `care-band-${id}-${suffix}`), { wardId, category, type, description, severity, requiresAttention: false, createdAt: ago(minutes as number) }, { merge: true }));
  await batch.commit();
}
