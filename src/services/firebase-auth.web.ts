import type { FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

/** Web: the browser SDK persists the session in IndexedDB by default. */
export const createAuth = (app: FirebaseApp): Auth => getAuth(app);
