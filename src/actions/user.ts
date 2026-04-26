'use server';

import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import type { UserProfile, ActivityLevel } from '@/types';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const FREE_GENERATIONS_PER_MONTH = 3;

const UserProfileUpdateSchema = z.object({
  displayName: z.string().min(2, "Display name must be at least 2 characters.").optional().or(z.literal('')),
  myWhy: z.string().max(500, "Your 'Why' cannot be more than 500 characters.").optional().or(z.literal('')), // Added myWhy validation
  currentWeight: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
    z.number().positive("Weight must be a positive number.").optional().nullable()
  ),
  targetWeight: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
    z.number().positive("Target weight must be a positive number.").optional().nullable()
  ),
  // Corrected the enum to match the ActivityLevel type
  activityLevel: z.enum(['sedentary', 'lightlyActive', 'active', 'veryActive'] as [ActivityLevel, ...ActivityLevel[]]).optional().nullable(),
  targetCalories: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
    z.number().int().min(0, "Calories must be a non-negative integer.").optional().nullable()
  ),
  targetProtein: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
    z.number().int().min(0, "Protein must be a non-negative integer.").optional().nullable()
  ),
  targetCarbs: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
    z.number().int().min(0, "Carbs must be a non-negative integer.").optional().nullable()
  ),
  targetFat: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
    z.number().int().min(0, "Fat must be a non-negative integer.").optional().nullable()
  ),
  targetWaterIntake: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
    z.number().int().min(0, "Water intake must be a non-negative integer.").optional().nullable()
  ),
});


export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (!userId) return null;
  try {
    const userDocRef = doc(db, 'users', userId);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      return { uid: userId, ...userDocSnap.data() } as UserProfile;
    }
    return null;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}

export async function updateUserProfile(userId: string, formData: FormData) {
  if (!userId) {
    return { error: "User not authenticated." };
  }

  const rawData = Object.fromEntries(formData);
  const processedData = { ...rawData };
  ['currentWeight', 'targetWeight', 'targetCalories', 'targetProtein', 'targetCarbs', 'targetFat', 'targetWaterIntake'].forEach(key => {
    if (processedData[key] === '') {
      processedData[key] = null;
    }
  });
  
  const parsedData = UserProfileUpdateSchema.safeParse(processedData);

  if (!parsedData.success) {
    console.error("Profile update validation error:", parsedData.error.flatten().fieldErrors);
    return { error: parsedData.error.flatten().fieldErrors };
  }
  
  const dataToUpdate: Partial<UserProfile> = {};
  if (parsedData.data.displayName !== undefined) dataToUpdate.displayName = parsedData.data.displayName === '' ? null : parsedData.data.displayName;
  if (parsedData.data.myWhy !== undefined) dataToUpdate.myWhy = parsedData.data.myWhy === '' ? null : parsedData.data.myWhy; // Added myWhy to the update object
  if (parsedData.data.currentWeight !== undefined) dataToUpdate.currentWeight = parsedData.data.currentWeight;
  if (parsedData.data.targetWeight !== undefined) dataToUpdate.targetWeight = parsedData.data.targetWeight;
  if (parsedData.data.activityLevel !== undefined) dataToUpdate.activityLevel = parsedData.data.activityLevel;
  if (parsedData.data.targetCalories !== undefined) dataToUpdate.targetCalories = parsedData.data.targetCalories;
  if (parsedData.data.targetProtein !== undefined) dataToUpdate.targetProtein = parsedData.data.targetProtein;
  if (parsedData.data.targetCarbs !== undefined) dataToUpdate.targetCarbs = parsedData.data.targetCarbs;
  if (parsedData.data.targetFat !== undefined) dataToUpdate.targetFat = parsedData.data.targetFat;
  if (parsedData.data.targetWaterIntake !== undefined) dataToUpdate.targetWaterIntake = parsedData.data.targetWaterIntake;

  if (Object.keys(dataToUpdate).length === 0) {
    return { error: "No changes to update."};
  }

  try {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, { ...dataToUpdate, updatedAt: serverTimestamp() });
    revalidatePath('/profile');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error("Error updating user profile:", error);
    return { error: error.message };
  }
}

export async function incrementFreeGenerationsUsed(userId: string): Promise<{ success: boolean; generationsLeft: number }> {
  if (!userId) return { success: false, generationsLeft: 0 };

  try {
    const userDocRef = doc(db, 'users', userId);
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) {
      return { success: false, generationsLeft: FREE_GENERATIONS_PER_MONTH };
    }

    const userData = userDoc.data();
    const storedMonth = userData.freeGenerationsMonth;
    const storedCount = userData.freeGenerationsUsedThisMonth || 0;

    // Reset count if it's a new month
    const newCount = storedMonth === currentMonth ? storedCount + 1 : 1;

    await updateDoc(userDocRef, {
      freeGenerationsUsedThisMonth: newCount,
      freeGenerationsMonth: currentMonth,
      updatedAt: serverTimestamp(),
    });

    return { success: true, generationsLeft: Math.max(0, FREE_GENERATIONS_PER_MONTH - newCount) };
  } catch (error) {
    console.error('Error incrementing free generations:', error);
    return { success: false, generationsLeft: 0 };
  }
}
