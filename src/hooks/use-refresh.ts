import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Pull-to-refresh for screens fed by live Firestore listeners: the data is already
 * current, so the gesture only shows the indicator briefly as confirmation.
 */
export function useLiveRefresh(duration = 700) {
  const [refreshing, setRefreshing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    timer.current = setTimeout(() => setRefreshing(false), duration);
  }, [duration]);
  return { refreshing, onRefresh };
}
