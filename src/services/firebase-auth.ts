import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FirebaseApp } from 'firebase/app';
import * as firebaseAuth from 'firebase/auth';
import { getAuth, initializeAuth, type Auth, type Persistence } from 'firebase/auth';

// Metro resolves firebase/auth to the React Native build, which exports getReactNativePersistence,
// but the package's public typings (web build) do not declare it.
const { getReactNativePersistence } = firebaseAuth as unknown as {
  getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
};

/** Native (iOS/Android, incl. Expo Go): keep the session between app launches in AsyncStorage. */
export function createAuth(app: FirebaseApp): Auth {
  try {
    return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    // Fast Refresh re-runs this module; initializeAuth throws if Auth already exists for the app.
    return getAuth(app);
  }
}
