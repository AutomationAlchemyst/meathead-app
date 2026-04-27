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

    // FoodLogs is a subcollection under users/{userId}/foodLogs
    const foodLogsCollection = collection(db, 'users', userId, 'foodLogs');
    
    const q = query(
      foodLogsCollection,
      where('loggedAt', '>=', todayTimestamp),
      where('loggedAt', '<', tomorrowTimestamp),
      orderBy('loggedAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const logs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FoodLog));
    return logs;
  } catch (error) {
    console.error("Error fetching today's food logs:", error);
    return [];
  }
}

export async function addMultipleFoodLogs(userId: string, foodItems: Omit<FoodLog, 'id' | 'userId' | 'loggedAt'>[]) {
  if (!userId) {
    return { success: false, error: "User not authenticated." };
  }
  try {
    const batch = writeBatch(db);
    // FoodLogs is a subcollection under users/{userId}/foodLogs
    const foodLogsCollection = collection(db, 'users', userId, 'foodLogs');
    
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

export async function deleteFoodLog(userId: string, logId: string) {
  if (!logId || !userId) {
    return { success: false, error: "No log ID or user ID provided." };
  }
  try {
    await deleteDoc(doc(db, 'users', userId, 'foodLogs', logId));
    revalidatePath('/food-logging');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting food log:", error);
    return { success: false, error: error.message };
  }
}
