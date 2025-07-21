'use server';

import { db } from '@/lib/firebase';
// --- IMPROVEMENT ---
// We've removed the unused 'updateUserStreak' import and simplified the others.
import { collection, query, where, getDocs, Timestamp, orderBy, doc, updateDoc, deleteDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import type { WaterLog } from '@/types';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const AddWaterLogSchema = z.object({
  amount: z.coerce.number().positive("Amount must be a positive number.").min(1, "Minimum amount is 1ml."),
});

// This function is no longer responsible for the streak logic.
export async function addWaterLog(
  userId: string,
  formData: FormData
): Promise<{ success?: boolean; error?: string | z.ZodError['formErrors'] }> {
  if (!userId) {
    return { error: "User not authenticated." };
  }

  const rawData = Object.fromEntries(formData);
  const parsedData = AddWaterLogSchema.safeParse(rawData);

  if (!parsedData.success) {
    return { error: parsedData.error.flatten().fieldErrors };
  }

  try {
    const waterLogsRef = collection(db, 'users', userId, 'waterLogs');
    
    await addDoc(waterLogsRef, {
      amount: parsedData.data.amount,
      loggedAt: serverTimestamp(),
    });

    // The call to updateUserStreak has been removed from here.
    
    revalidatePath('/water-tracking');
    revalidatePath('/dashboard');
    return { success: true };

  } catch (error: any) {
    console.error("Error adding water log:", error);
    return { error: error.message || "Failed to add water log." };
  }
}


const UpdateWaterLogSchema = z.object({
  amount: z.coerce.number().positive("Amount must be a positive number.").min(1, "Minimum amount is 1ml."),
});

export async function getTodaysWaterLogs(userId: string): Promise<WaterLog[]> {
  if (!userId) return [];

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const waterLogsRef = collection(db, 'users', userId, 'waterLogs');
  const q = query(
    waterLogsRef,
    where('loggedAt', '>=', Timestamp.fromDate(todayStart)),
    where('loggedAt', '<=', Timestamp.fromDate(todayEnd)),
    orderBy('loggedAt', 'desc')
  );

  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WaterLog));
  } catch (error) {
    console.error("Error fetching today's water logs:", error);
    return [];
  }
}

export async function updateWaterLog(
  logId: string, 
  userId: string, 
  newAmount: number
): Promise<{ success?: boolean; error?: string | z.ZodError['formErrors'] }> {
  if (!userId) {
    return { error: "User not authenticated." };
  }
  if (!logId) {
    return { error: "Log ID is missing." };
  }

  const parsedData = UpdateWaterLogSchema.safeParse({ amount: newAmount });
  if (!parsedData.success) {
    return { error: parsedData.error.flatten().fieldErrors };
  }

  try {
    const waterLogRef = doc(db, 'users', userId, 'waterLogs', logId);
    await updateDoc(waterLogRef, { 
      amount: parsedData.data.amount,
      loggedAt: serverTimestamp()
    });
    revalidatePath('/water-tracking');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error("Error updating water log:", error);
    return { error: error.message || "Failed to update water log." };
  }
}

export async function deleteWaterLog(
  logId: string, 
  userId: string
): Promise<{ success?: boolean; error?: string }> {
  if (!userId) {
    return { error: "User not authenticated." };
  }
  if (!logId) {
    return { error: "Log ID is missing." };
  }

  try {
    const waterLogRef = doc(db, 'users', userId, 'waterLogs', logId);
    await deleteDoc(waterLogRef);
    revalidatePath('/water-tracking');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting water log:", error);
    return { error: error.message || "Failed to delete water log." };
  }
}
