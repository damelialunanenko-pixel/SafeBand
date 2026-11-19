import { useEffect, useRef, useState } from 'react';
import { clearDraft, draftKey, loadDraft, saveDraft } from '@/services/local-store';

/**
 * Form state mirrored to AsyncStorage so input survives closing the app.
 * `ready` is false until the stored draft (if any) has been applied.
 * `prefill` runs when there is no draft, e.g. to load existing Firestore data.
 */
export function useDraft<T extends object>(name: string, uid: string | undefined, initial: T, prefill?: () => Promise<Partial<T> | null>) {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  const key = uid ? draftKey(name, uid) : null;
  const prefillRef = useRef(prefill);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    (async () => {
      const stored = (await loadDraft<T>(key)) ?? (await prefillRef.current?.().catch(() => null)) ?? null;
      if (cancelled) return;
      if (stored) setValue((prev) => ({ ...prev, ...stored }));
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, [key]);

  useEffect(() => {
    if (!key || !ready) return;
    const id = setTimeout(() => void saveDraft(key, value), 400);
    return () => clearTimeout(id);
  }, [key, ready, value]);

  const discard = async () => { if (key) await clearDraft(key); };
  return { value, setValue, ready, discard };
}
