
'use server';

import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

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
