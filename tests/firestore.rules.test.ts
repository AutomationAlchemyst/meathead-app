import {
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import { createConnection } from 'net';

function checkEmulatorRunning(port = 8080, host = '127.0.0.1'): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection(port, host);
    socket.setTimeout(500);
    socket.on('connect', () => {
      socket.end();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      resolve(false);
    });
  });
}

const isEmulatorRunning = await checkEmulatorRunning();
if (!isEmulatorRunning) {
  console.warn('⚠️ Firestore emulator not detected at 127.0.0.1:8080. Skipping Firestore rules tests.');
}

describe.runIf(isEmulatorRunning)('Firestore Security Rules', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'meathead-test',
      firestore: {
        rules: readFileSync(resolve(__dirname, '../firestore.rules'), 'utf8'),
        host: '127.0.0.1',
        port: 8080,
      },
    });
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    if (testEnv) {
      await testEnv.clearFirestore();
    }
  });
  const aliceUid = 'alice_user';
  const bobUid = 'bob_user';
  const adminUid = 'admin_user';

  // Helper to get authenticated context
  const getFirestoreForUser = (uid: string | null) => {
    if (uid) {
      return testEnv.authenticatedContext(uid).firestore();
    }
    return testEnv.unauthenticatedContext().firestore();
  };

  describe('Users collection rules', () => {
    it('allows a user to read their own profile', async () => {
      // Set up document via admin context (rules bypassed)
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'users', aliceUid), {
          displayName: 'Alice',
          isAdmin: false,
          isPremium: false,
        });
      });

      const aliceDb = getFirestoreForUser(aliceUid);
      const snap = await getDoc(doc(aliceDb, 'users', aliceUid));
      expect(snap.exists()).toBe(true);
    });

    it('denies a user from reading another user profile', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'users', aliceUid), {
          displayName: 'Alice',
        });
      });

      const bobDb = getFirestoreForUser(bobUid);
      await expect(getDoc(doc(bobDb, 'users', aliceUid))).rejects.toThrow();
    });

    it('allows an admin to read any user profile', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'users', aliceUid), {
          displayName: 'Alice',
        });
        await setDoc(doc(adminDb, 'users', adminUid), {
          displayName: 'Admin User',
          isAdmin: true,
        });
      });

      const adminDb = getFirestoreForUser(adminUid);
      const snap = await getDoc(doc(adminDb, 'users', aliceUid));
      expect(snap.exists()).toBe(true);
    });

    it('allows owner to create profile with isAdmin/isPremium set to false', async () => {
      const aliceDb = getFirestoreForUser(aliceUid);
      await expect(setDoc(doc(aliceDb, 'users', aliceUid), {
        displayName: 'Alice',
        isAdmin: false,
        isPremium: false,
      })).resolves.not.toThrow();
    });

    it('denies owner from creating profile with isAdmin/isPremium set to true', async () => {
      const aliceDb = getFirestoreForUser(aliceUid);
      await expect(setDoc(doc(aliceDb, 'users', aliceUid), {
        displayName: 'Alice',
        isAdmin: true,
        isPremium: false,
      })).rejects.toThrow();

      await expect(setDoc(doc(aliceDb, 'users', aliceUid), {
        displayName: 'Alice',
        isAdmin: false,
        isPremium: true,
      })).rejects.toThrow();
    });

    it('allows owner to update profile only with allowlisted fields', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'users', aliceUid), {
          displayName: 'Alice',
          isAdmin: false,
          isPremium: false,
        });
      });

      const aliceDb = getFirestoreForUser(aliceUid);
      await expect(updateDoc(doc(aliceDb, 'users', aliceUid), {
        displayName: 'Alice Updated',
        myWhy: 'To stay healthy',
        currentWeight: 75,
      })).resolves.not.toThrow();
    });

    it('denies owner from updating protected fields', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'users', aliceUid), {
          displayName: 'Alice',
          isAdmin: false,
          isPremium: false,
        });
      });

      const aliceDb = getFirestoreForUser(aliceUid);
      await expect(updateDoc(doc(aliceDb, 'users', aliceUid), {
        isPremium: true,
      })).rejects.toThrow();

      await expect(updateDoc(doc(aliceDb, 'users', aliceUid), {
        isAdmin: true,
      })).rejects.toThrow();
    });
  });

  describe('FeedbackSubmissions rules', () => {
    it('allows authenticated user to submit feedback with their own UID', async () => {
      const aliceDb = getFirestoreForUser(aliceUid);
      await expect(addDoc(collection(aliceDb, 'feedbackSubmissions'), {
        userId: aliceUid,
        message: 'Great app!',
        timestamp: new Date().toISOString(),
      })).resolves.not.toThrow();
    });

    it('denies authenticated user from submitting feedback with another UID', async () => {
      const aliceDb = getFirestoreForUser(aliceUid);
      await expect(addDoc(collection(aliceDb, 'feedbackSubmissions'), {
        userId: bobUid,
        message: 'Impersonation!',
        timestamp: new Date().toISOString(),
      })).rejects.toThrow();
    });

    it('allows owner to read their own feedback', async () => {
      let docId = '';
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        const ref = await addDoc(collection(adminDb, 'feedbackSubmissions'), {
          userId: aliceUid,
          message: 'My secret feedback',
        });
        docId = ref.id;
      });

      const aliceDb = getFirestoreForUser(aliceUid);
      const snap = await getDoc(doc(aliceDb, 'feedbackSubmissions', docId));
      expect(snap.exists()).toBe(true);
    });

    it('denies non-owner from reading feedback', async () => {
      let docId = '';
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        const ref = await addDoc(collection(adminDb, 'feedbackSubmissions'), {
          userId: aliceUid,
          message: 'My secret feedback',
        });
        docId = ref.id;
      });

      const bobDb = getFirestoreForUser(bobUid);
      await expect(getDoc(doc(bobDb, 'feedbackSubmissions', docId))).rejects.toThrow();
    });

    it('allows admin to read any feedback', async () => {
      let docId = '';
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        const ref = await addDoc(collection(adminDb, 'feedbackSubmissions'), {
          userId: aliceUid,
          message: 'My feedback',
        });
        docId = ref.id;
        await setDoc(doc(adminDb, 'users', adminUid), {
          isAdmin: true,
        });
      });

      const adminDb = getFirestoreForUser(adminUid);
      const snap = await getDoc(doc(adminDb, 'feedbackSubmissions', docId));
      expect(snap.exists()).toBe(true);
    });
  });
});
