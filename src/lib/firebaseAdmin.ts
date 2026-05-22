import admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';

// Initialize the Admin SDK if not already initialized
function getAdminApp() {
  if (admin.apps.length > 0) {
    return admin.apps[0];
  }

  const serviceAccountJsonString = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_STRING;

  if (serviceAccountJsonString) {
    try {
      const serviceAccount: ServiceAccount = JSON.parse(serviceAccountJsonString);
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (e: any) {
      console.error('[FirebaseAdmin] Error parsing FIREBASE_SERVICE_ACCOUNT_JSON_STRING:', e.message);
    }
  }

  // Fallback for emulator environment (e.g. testing or local dev)
  if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'meathead-hxwk0';
    return admin.initializeApp({
      projectId,
    });
  }

  console.warn('[FirebaseAdmin] FIREBASE_SERVICE_ACCOUNT_JSON_STRING is not set and no emulator environment detected.');
  // Attempt default credentials if available
  try {
    return admin.initializeApp();
  } catch (e: any) {
    console.error('[FirebaseAdmin] Failed to initialize default app:', e.message);
  }
  return null;
}

const app = getAdminApp();

export const adminAuth = admin.auth(app || undefined);
export const adminDb = admin.firestore(app || undefined);
export { admin };
