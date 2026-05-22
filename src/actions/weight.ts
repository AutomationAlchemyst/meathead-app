
'use server';

import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { adminDb, admin } from '@/lib/firebaseAdmin';
import { revalidatePath } from 'next/cache';

// getWeightHistory function is removed as it's now handled by a real-time listener
// in WeightHistoryChart.tsx.

export async function getCurrentWeight(userId: string): Promise<number | null> {
  if (!userId) return null;
  try {
    const userDocRef = doc(db, 'users', userId);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      return userDocSnap.data().currentWeight || null;
    }
    return null;
  } catch (error) {
    console.error("Error fetching current weight:", error);
    return null;
  }
}

export async function deleteWeightLog(userId: string, logId: string) {
  if (!userId || !logId) {
    return { success: false, error: 'User ID and Log ID are required.' };
  }

  try {
    const userRef = adminDb.collection('users').doc(userId);
    const weightLogRef = userRef.collection('weightLogs').doc(logId);

    await adminDb.runTransaction(async (transaction) => {
      // 1. Get the log to delete
      const logSnap = await transaction.get(weightLogRef);
      if (!logSnap.exists) {
        throw new Error('Weight log not found.');
      }

      // 2. Query the latest weight logs to see if this is the newest one.
      const querySnapshot = await transaction.get(
        userRef.collection('weightLogs').orderBy('loggedAt', 'desc').limit(2)
      );

      const docs = querySnapshot.docs;
      if (docs.length > 0) {
        const latestDoc = docs[0];
        if (latestDoc.id === logId) {
          // The log we are deleting is the latest log.
          // Check if there is a second latest log.
          if (docs.length > 1) {
            const secondLatestDoc = docs[1];
            const secondLatestWeight = secondLatestDoc.data().weight;
            transaction.update(userRef, {
              currentWeight: secondLatestWeight,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          } else {
            // No other weight logs exist, reset currentWeight to null
            transaction.update(userRef, {
              currentWeight: null,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
        }
      }

      // 3. Delete the log
      transaction.delete(weightLogRef);
    });

    revalidatePath('/weight-tracking');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting weight log:', error);
    return { success: false, error: error.message || 'Failed to delete weight log.' };
  }
}

