'use server';

import { db } from '@/lib/firebase';
// --- IMPROVEMENT ---
// We've removed the unused imports related to the old streak function.
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';

import type { UserProfile, ActivityLevel } from '@/types';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const UserProfileUpdateSchema = z.object({
  displayName: z.string().min(2, "Display name must be at least 2 characters.").optional().or(z.literal('')),
  currentWeight: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
    z.number().positive("Weight must be a positive number.").optional().nullable()
  ),
  targetWeight: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
    z.number().positive("Target weight must be a positive number.").optional().nullable()
  ),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'very'] as [ActivityLevel, ...ActivityLevel[]]).optional().nullable(),
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

// --- REMOVED ---
// The old updateUserStreak server action has been deleted from this file.
// The logic now lives in the client-side utility at src/lib/streakUtils.ts
