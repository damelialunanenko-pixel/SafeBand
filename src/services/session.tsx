import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { SessionSnapshot } from './auth-flow';
import { auth, db } from './firebase';
import { isTrustedDevice, setTrustedDevice } from './local-store';
import type { GuardianProfile } from '@/types/care';

type Session = {
  user: User | null | undefined;
  /** users/{uid}; `undefined` while loading, `null` when the document does not exist. */
  profile: GuardianProfile | null | undefined;
  snapshot: SessionSnapshot;
  /** Reloads the Firebase user (e.g. after the email link was opened) and refreshes the ID token. */
  refreshUser: () => Promise<void>;
  markDeviceTrusted: () => Promise<void>;
};

const SessionContext = createContext<Session | null>(null);

type ProfileState = { uid: string; data: GuardianProfile | null } | null;

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  // Kept in state: user.reload() mutates the same User object, so React would not notice.
  const [emailVerified, setEmailVerified] = useState(false);
  const [profileState, setProfileState] = useState<ProfileState>(null);
  const [trusted, setTrusted] = useState<{ uid: string; value: boolean } | null>(null);

  useEffect(() => onAuthStateChanged(auth, (u) => { setUser(u); setEmailVerified(Boolean(u?.emailVerified)); }), []);

  const uid = user?.uid;

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    void isTrustedDevice(uid).then((value) => { if (!cancelled) setTrusted({ uid, value }); });
    return () => { cancelled = true; };
  }, [uid]);

  useEffect(() => {
    const current = auth.currentUser;
    if (!uid || !emailVerified || !current) return;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    (async () => {
      // Firestore rules check the token's email_verified claim. A token issued before the
      // email was confirmed still says false, so force a refresh once.
      try {
        const token = await current.getIdTokenResult();
        if (!token.claims.email_verified) await current.getIdToken(true);
      } catch { /* offline: try with the cached token */ }
      if (cancelled) return;
      unsubscribe = onSnapshot(
        doc(db, 'users', uid),
        (snap) => setProfileState({ uid, data: snap.exists() ? (snap.data() as GuardianProfile) : null }),
        () => setProfileState({ uid, data: null }),
      );
    })();
    return () => { cancelled = true; unsubscribe?.(); };
  }, [uid, emailVerified]);

  const refreshUser = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) return;
    await current.reload();
    if (current.emailVerified) await current.getIdToken(true);
    setEmailVerified(current.emailVerified);
  }, []);

  const markDeviceTrusted = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) return;
    await setTrustedDevice(current.uid);
    setTrusted({ uid: current.uid, value: true });
  }, []);

  const profile = profileState && profileState.uid === uid ? profileState.data : undefined;
  const trustedValue = trusted && trusted.uid === uid ? trusted.value : undefined;

  const snapshot = useMemo<SessionSnapshot>(() => {
    if (user === undefined) return { status: 'loading' };
    if (!user) return { status: 'signedOut' };
    return {
      status: 'signedIn',
      emailVerified,
      profile: profile === undefined ? 'loading' : (profile ?? {}),
      trustedDevice: trustedValue === undefined ? 'loading' : trustedValue,
    };
  }, [user, emailVerified, profile, trustedValue]);

  const value = useMemo(() => ({ user, profile, snapshot, refreshUser, markDeviceTrusted }), [user, profile, snapshot, refreshUser, markDeviceTrusted]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('SessionProvider is missing.');
  return value;
}
