import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // ← добавь

const firebaseConfig = {
  apiKey: "AIzaSyAgvZPW0bK-AUoNHo2fpPyaI-b7P_kuxIw",
  authDomain: "bracelet-app-1c542.firebaseapp.com",
  projectId: "bracelet-app-1c542",
  storageBucket: "bracelet-app-1c542.firebasestorage.app",
  messagingSenderId: "291592062626",
  appId: "1:291592062626:web:46ec1a8d41006cc4f2f9fb"
};


const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);