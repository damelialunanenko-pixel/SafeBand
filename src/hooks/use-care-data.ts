import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { auth, db } from '@/services/firebase';
import { listenDevice } from '@/services/care-repository';
import type { DeviceData, Ward } from '@/types/care';

export function usePrimaryCareData() {
  const [wards, setWards] = useState<Ward[]>([]); const [device, setDevice] = useState<DeviceData | null>(null); const [loading, setLoading] = useState(Boolean(auth.currentUser?.uid)); const [error, setError] = useState<string | null>(null);
  useEffect(() => { const uid = auth.currentUser?.uid; if (!uid) return;
    return onSnapshot(query(collection(db, 'wards'), where('guardianId', '==', uid)), s => { setWards(s.docs.map(d => ({ id: d.id, ...d.data() } as Ward))); setLoading(false); }, e => { setError(e.message); setLoading(false); });
  }, []);
  const ward = wards[0] ?? null;
  useEffect(() => { if (!ward?.braceletId) return; return listenDevice(ward.braceletId, setDevice, e => setError(e.message)); }, [ward?.braceletId]);
  return { ward, wards, device, loading, error };
}
