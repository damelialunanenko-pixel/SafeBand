import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { createAuth } from "./firebase-auth";

const firebaseConfig = {
  apiKey: "AIzaSyAgvZPW0bK-AUoNHo2fpPyaI-b7P_kuxIw",
  authDomain: "bracelet-app-1c542.firebaseapp.com",
  projectId: "bracelet-app-1c542",
  storageBucket: "bracelet-app-1c542.firebasestorage.app",
  messagingSenderId: "291592062626",
  appId: "1:291592062626:web:46ec1a8d41006cc4f2f9fb"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

/** Native: initializeAuth + AsyncStorage persistence; web: getAuth (see firebase-auth*.ts). */
export const auth = createAuth(app);
export const db = getFirestore(app);
/** Callable Cloud Functions (functions/src/index.ts), default region us-central1. */
export const functions = getFunctions(app);
