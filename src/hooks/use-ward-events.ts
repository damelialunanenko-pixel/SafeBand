import { collection, limit, onSnapshot, orderBy, query, where, type QueryConstraint } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '@/services/firebase';
import type { CareEvent, Ward } from '@/types/care';

/** Live `events` of a ward, newest first (optionally limited). Same query the screens used inline before. */
export function useWardEvents(ward: Ward | null, max?: number) {
  const [events, setEvents] = useState<CareEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const wardId = ward?.id;

  useEffect(() => {
    if (!wardId) return;
    const constraints: QueryConstraint[] = [where('wardId', '==', wardId), orderBy('createdAt', 'desc')];
    if (max) constraints.push(limit(max));
    return onSnapshot(
      query(collection(db, 'events'), ...constraints),
      (snap) => { setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CareEvent))); setLoading(false); },
      (e) => { setError(e.message); setLoading(false); },
    );
  }, [wardId, max]);

  return { events, loading, error };
}
