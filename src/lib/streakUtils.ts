import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { isSameDay, subDays } from 'date-fns';

/**
 * A client-side utility to intelligently update a user's logging streak.
 * This function must be called from a client component after a successful log.
 * @param userId The UID of the currently authenticated user.
 */
export async function updateUserStreakClientSide(userId: string) {
  console.log(`[StreakUtils] Running streak check for user: ${userId}`);
  
  const userDocRef = doc(db, 'users', userId);

  try {
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) {
      console.error("User document not found for streak update.");
      return;
    }
    const userData = userDoc.data();

    const now = new Date();
    const lastLogDate = (userData.lastLogDate as Timestamp)?.toDate();
    const yesterday = subDays(now, 1);

    let newStreak = userData.currentStreak || 0;
    
    // --- IMPROVED LOGIC ---
    // We now decide whether to update the streak number and the date separately.

    if (lastLogDate) {
      // If the last log was yesterday, increment the streak.
      if (isSameDay(lastLogDate, yesterday)) {
        newStreak += 1;
        console.log(`[StreakUtils] Streak continued. New streak: ${newStreak}`);
      // If the last log was NOT today, the streak is broken. Reset to 1.
      } else if (!isSameDay(lastLogDate, now)) {
        newStreak = 1;
        console.log(`[StreakUtils] Streak broken. Resetting to 1.`);
      }
      // If last log was today, the streak number does not change.
    } else {
      // First log ever.
      newStreak = 1;
      console.log(`[StreakUtils] First log ever. Starting streak at 1.`);
    }

    // We ALWAYS update the document to set the most recent log date.
    await updateDoc(userDocRef, {
      currentStreak: newStreak,
      lastLogDate: Timestamp.fromDate(now)
    });
    console.log(`[StreakUtils] Firestore updated successfully. New lastLogDate: ${now.toLocaleTimeString()}`);

  } catch (error) {
    console.error("Error updating user streak from client:", error);
    throw error;
  }
}
