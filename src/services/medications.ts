import {
  addDoc, collection, deleteDoc, doc, onSnapshot, query, runTransaction, serverTimestamp, Timestamp, updateDoc, where,
} from 'firebase/firestore';
import type { Medication, MedicationLog, MedicationLogStatus } from '@/types/care';
import { db } from './firebase';
import { doseKey } from './medication-schedule';

/**
 * wards/{wardId}/medications/{id} — shared by all of the caregiver's devices.
 * wards/{wardId}/medicationLogs/{doseKey} — one document per dose (taken / skipped / missed).
 * Firestore rules: only the caregiver of the ward.
 */
const medsCol = (wardId: string) => collection(db, 'wards', wardId, 'medications');
const logsCol = (wardId: string) => collection(db, 'wards', wardId, 'medicationLogs');

export const listenMedications = (wardId: string, onData: (meds: Medication[]) => void, onError: (e: Error) => void) =>
  onSnapshot(medsCol(wardId), (s) => onData(s.docs.map((d) => ({ id: d.id, ...d.data() }) as Medication)), onError);

export const listenMedicationLogs = (wardId: string, since: Date, onData: (logs: MedicationLog[]) => void, onError: (e: Error) => void) =>
  onSnapshot(
    query(logsCol(wardId), where('scheduledAt', '>=', Timestamp.fromDate(since))),
    (s) => onData(s.docs.map((d) => ({ id: d.id, ...d.data() }) as MedicationLog)),
    onError,
  );

export async function saveMedication(wardId: string, id: string | undefined, data: Omit<Medication, 'id'>) {
  if (id) await updateDoc(doc(medsCol(wardId), id), { ...data, updatedAt: serverTimestamp() });
  else await addDoc(medsCol(wardId), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export const setMedicationEnabled = (wardId: string, id: string, enabled: boolean) =>
  updateDoc(doc(medsCol(wardId), id), { enabled, updatedAt: serverTimestamp() });

export const deleteMedication = (wardId: string, id: string) => deleteDoc(doc(medsCol(wardId), id));

export type MarkResult = { name: string; stock: number | null; stockDecreased: boolean };

/**
 * Marks a dose. "Taken" decreases `stock` by one — only on the first transition to taken, so
 * pressing the button twice (or on two phones) does not count twice.
 */
export async function markDose(wardId: string, medicationId: string, scheduledAt: Date, status: MedicationLogStatus, uid: string): Promise<MarkResult> {
  const logRef = doc(logsCol(wardId), doseKey(medicationId, scheduledAt));
  const medRef = doc(medsCol(wardId), medicationId);
  return runTransaction(db, async (tx) => {
    const [logSnap, medSnap] = await Promise.all([tx.get(logRef), tx.get(medRef)]);
    const med = medSnap.data() as Medication | undefined;
    const wasTaken = logSnap.exists() && logSnap.data().status === 'taken';
    tx.set(logRef, { medicationId, scheduledAt: Timestamp.fromDate(scheduledAt), status, at: serverTimestamp(), byUid: uid });
    let stock = typeof med?.stock === 'number' ? med.stock : null;
    let stockDecreased = false;
    if (status === 'taken' && !wasTaken && stock !== null && stock > 0) {
      stock -= 1;
      stockDecreased = true;
      tx.update(medRef, { stock });
    }
    return { name: med?.name ?? '', stock, stockDecreased };
  });
}
