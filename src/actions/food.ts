
'use server';

import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import type { FoodLog } from '@/types';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';


export async function getTodaysFoodLogs(userId: string): Promise<FoodLog[]> {
  if (!userId) return [];

  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

  const foodLogsRef = collection(db, 'users', userId, 'foodLogs');
  const q = query(
    foodLogsRef,
    where('loggedAt', '>=', Timestamp.fromDate(startOfDay)),
    where('loggedAt', '<=', Timestamp.fromDate(endOfDay))
  );

  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FoodLog));
  } catch (error) {
    console.error("Error fetching today's food logs:", error);
    return [];
  }
}

const UpdateFoodLogSchema = z.object({
  foodItem: z.string().min(1, "Food item cannot be empty."),
  quantity: z.string().min(1, "Quantity cannot be empty."),
  calories: z.coerce.number().min(0, "Calories must be non-negative."),
  protein: z.coerce.number().min(0, "Protein must be non-negative."),
  carbs: z.coerce.number().min(0, "Carbs must be non-negative."),
  fat: z.coerce.number().min(0, "Fat must be non-negative."),
});

export async function updateFoodLog(
  logId: string,
  userId: string,
  formData: FormData
): Promise<{ success?: boolean; error?: string | z.ZodError['formErrors'] }> {
  if (!userId) {
    return { error: "User not authenticated." };
  }
  if (!logId) {
    return { error: "Log ID is missing." };
  }

  const rawData = Object.fromEntries(formData);
  const parsedData = UpdateFoodLogSchema.safeParse(rawData);

  if (!parsedData.success) {
    return { error: parsedData.error.flatten().fieldErrors };
  }

  try {
    const foodLogRef = doc(db, 'users', userId, 'foodLogs', logId);
    // Note: Server-side validation for user ownership should be handled by Firestore security rules.
    await updateDoc(foodLogRef, parsedData.data);
    
    revalidatePath('/food-logging');
    revalidatePath('/dashboard'); // TodaysMacrosCard might need an update
    return { success: true };
  } catch (error: any) {
    console.error("Error updating food log:", error);
    return { error: error.message || "Failed to update food log." };
  }
}

export async function deleteFoodLog(
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
    const foodLogRef = doc(db, 'users', userId, 'foodLogs', logId);
    // Note: Server-side validation for user ownership should be handled by Firestore security rules.
    await deleteDoc(foodLogRef);
    
    revalidatePath('/food-logging');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting food log:", error);
    return { error: error.message || "Failed to delete food log." };
  }
}
