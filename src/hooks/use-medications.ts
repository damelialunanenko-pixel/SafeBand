import { useEffect, useMemo, useState } from 'react';
import { addDays, startOfDay, type LogsByKey } from '@/services/medication-schedule';
import { listenMedicationLogs, listenMedications } from '@/services/medications';
import type { Medication, MedicationLog } from '@/types/care';

type Data = { wardId: string; meds: Medication[]; logs: MedicationLog[]; error: string | null; medsLoaded: boolean };

/** Live medications of a ward and their dose logs from 6 days ago on (enough for "today" and the 7-day history). */
export function useMedications(wardId: string | undefined) {
  const [data, setData] = useState<Data | null>(null);
  // Re-subscribe after midnight so "the last 7 days" moves on.
  const [day, setDay] = useState(() => startOfDay(new Date()).getTime());

  useEffect(() => {
    const id = setInterval(() => {
      const today = startOfDay(new Date()).getTime();
      setDay((prev) => (prev === today ? prev : today));
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!wardId) return;
    const patch = (p: Partial<Data>) => setData((prev) => ({ ...(prev?.wardId === wardId ? prev : { wardId, meds: [], logs: [], error: null, medsLoaded: false }), ...p }));
    const fail = (e: Error) => patch({ error: e.message, medsLoaded: true });
    const offMeds = listenMedications(wardId, (meds) => patch({ meds: [...meds].sort((a, b) => a.name.localeCompare(b.name)), medsLoaded: true }), fail);
    const offLogs = listenMedicationLogs(wardId, addDays(new Date(day), -6), (logs) => patch({ logs }), fail);
    return () => { offMeds(); offLogs(); };
  }, [wardId, day]);

  const current = data && data.wardId === wardId ? data : null;
  const logsByKey = useMemo<LogsByKey>(() => Object.fromEntries((current?.logs ?? []).map((l) => [l.id, l])), [current?.logs]);
  return {
    meds: current?.meds ?? [],
    logs: current?.logs ?? [],
    logsByKey,
    loading: Boolean(wardId) && !current?.medsLoaded,
    error: current?.error ?? null,
  };
}
