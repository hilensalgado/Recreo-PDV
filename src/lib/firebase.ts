import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App conditionally if apiKey exists
const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.apiKey.trim() !== '');

const app = isFirebaseConfigured
  ? (getApps().length > 0 ? getApp() : initializeApp({
      apiKey: firebaseConfig.apiKey,
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket,
      messagingSenderId: firebaseConfig.messagingSenderId,
      appId: firebaseConfig.appId,
    }))
  : null;

// Initialize Firestore if configured
export const db = (app && isFirebaseConfigured) 
  ? (firebaseConfig.firestoreDatabaseId ? getFirestore(app, firebaseConfig.firestoreDatabaseId) : getFirestore(app))
  : null;

// Initialize Firebase Auth if configured
export const auth = (app && isFirebaseConfigured) ? getAuth(app) : null;
export const googleProvider = new GoogleAuthProvider();

export default app;

