import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfigValues = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Validate essential Firebase config
const essentialKeys: (keyof typeof firebaseConfigValues)[] = ['apiKey', 'authDomain', 'projectId'];
const missingKeys = essentialKeys.filter(key => !firebaseConfigValues[key]);

if (missingKeys.length > 0) {
  const errorMessage = `Firebase config is missing essential keys: ${missingKeys.join(', ')}. Please check your .env file or environment variables.`;
  console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  console.error("ERROR: " + errorMessage);
  console.error("Firebase will not initialize correctly and the app may crash or fail to start.");
  console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  // Not throwing an error here to allow Next.js to potentially log further,
  // but this indicates a critical setup issue.
}

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfigValues);
} else {
  app = getApps()[0];
}

const authInstance: Auth = getAuth(app);
const dbInstance: Firestore = getFirestore(app);

// Exporting with the names 'auth' and 'db' as they are used throughout the app
export { app, authInstance as auth, dbInstance as db };
