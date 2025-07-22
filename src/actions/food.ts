'use server';

import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, serverTimestamp, Timestamp, writeBatch, doc, orderBy } from 'firebase/firestore';
import type { FoodLog } from '@/types';
import { revalidatePath } from 'next/cache';

export async function getTodaysFoodLogs(userId: string): Promise<FoodLog[]> {
  if (!userId) {
    console.error("getTodaysFoodLogs: No user ID provided.");
    return [];
  }
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayTimestamp = Timestamp.fromDate(today);
    const tomorrowTimestamp = Timestamp.fromDate(tomorrow);

    const foodLogsCollection = collection(db, 'foodlogs');
    
    // --- THE FIX ---
    // We've added a 'where' clause to ensure we only query for logs
    // belonging to the currently authenticated user (userId).
    // This now satisfies the Firestore security rules.
    const q = query(
      foodLogsCollection,
      where('userId', '==', userId),
      where('loggedAt', '>=', todayTimestamp),
      where('loggedAt', '<', tomorrowTimestamp),
      orderBy('loggedAt', 'desc') // Also good practice to order the logs
    );

    const querySnapshot = await getDocs(q);
    const logs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FoodLog));
    return logs;
  } catch (error) {
    console.error("Error fetching today's food logs:", error);
    // We return an empty array but the error will be logged on the server.
    return [];
  }
}

export async function addMultipleFoodLogs(userId: string, foodItems: Omit<FoodLog, 'id' | 'userId' | 'loggedAt'>[]) {
  if (!userId) {
    return { success: false, error: "User not authenticated." };
  }
  try {
    const batch = writeBatch(db);
    const foodLogsCollection = collection(db, 'foodlogs');
    
    foodItems.forEach(log => {
      const newLogRef = doc(foodLogsCollection);
      batch.set(newLogRef, { ...log, userId, loggedAt: serverTimestamp() });
    });

    await batch.commit();
    revalidatePath('/food-logging');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error("Error adding multiple food logs:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteFoodLog(logId: string) {
  if (!logId) {
    return { success: false, error: "No log ID provided." };
  }
  try {
    await deleteDoc(doc(db, 'foodlogs', logId));
    revalidatePath('/food-logging');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting food log:", error);
    return { success: false, error: error.message };
  }
}
