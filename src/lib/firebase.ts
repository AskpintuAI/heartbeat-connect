// Firebase initialization for "माँ से बात"
// IMPORTANT: Replace the placeholder values below with your Firebase Web app config
// from Firebase Console > Project Settings > General > Your apps (Web).
// These keys are SAFE to commit — Firebase web API keys are public; security is
// enforced via Authorized domains, App Check, and Firestore security rules.

import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyCMb8ujtq5F8cmUDwvYBJ3pbYi_h9bQBSU",
  authDomain: "maasebaat.firebaseapp.com",
  databaseURL: "https://maasebaat-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "maasebaat",
  storageBucket: "maasebaat.firebasestorage.app",
  messagingSenderId: "1053821493060",
  appId: "1:1053821493060:web:d23632550ae63290ed4111",
  measurementId: "G-J6KQZ8GEL8",
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);

// Persist login across browser restarts (uses localStorage under the hood)
if (typeof window !== "undefined") {
  setPersistence(auth, browserLocalPersistence).catch(() => {
    /* ignore — persistence may already be set */
  });
}

// Helper: build a deterministic chat-room id from two user uids
export function chatRoomId(a: string, b: string): string {
  return [a, b].sort().join("_");
}
