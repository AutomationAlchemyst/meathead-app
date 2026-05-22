'use server';

import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import type { UserProfile, ActivityLevel } from '@/types';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { adminAuth, adminDb, admin } from '@/lib/firebaseAdmin';

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
  const processedData: Record<string, any> = { ...rawData };
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
  if (parsedData.data.myWhy !== undefined) dataToUpdate.myWhy = parsedData.data.myWhy === '' ? '' : parsedData.data.myWhy;
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

export async function verifyIdToken(idToken: string): Promise<string> {
  if (!idToken) {
    throw new Error('ID Token is required for server actions.');
  }
  const decodedToken = await adminAuth.verifyIdToken(idToken);
  return decodedToken.uid;
}

export async function verifyPremiumOrQuota(uid: string, feature: 'recipe' | 'workout' | 'foodLog'): Promise<{ success: boolean; isPremium: boolean }> {
  const userRef = adminDb.collection('users').doc(uid);
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const quotaRef = userRef.collection('quotas').doc(currentMonth);

  return await adminDb.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists) {
      throw new Error('User profile not found.');
    }

    const userData = userDoc.data() || {};
    const isPremium = userData.isPremium === true;
    const trialEndsAt = userData.trialEndsAt;
    const hasActiveTrial = trialEndsAt && trialEndsAt.toDate() > now;

    if (isPremium || hasActiveTrial) {
      return { success: true, isPremium: true };
    }

    // Check quota
    const quotaDoc = await transaction.get(quotaRef);
    const quotaData = quotaDoc.data() || {};

    let limit = 3; // recipes and foodLogs
    let field = 'recipesUsed';

    if (feature === 'workout') {
      limit = 1;
      field = 'workoutsUsed';
    } else if (feature === 'foodLog') {
      limit = 3;
      field = 'foodLogsUsed';
    }

    const currentUsed = quotaData[field] || 0;
    if (currentUsed >= limit) {
      throw new Error(`You have reached your free monthly limit of ${limit} ${feature}s. Please upgrade to Premium or start a trial!`);
    }

    // Increment count
    transaction.set(quotaRef, {
      [field]: currentUsed + 1,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return { success: true, isPremium: false };
  });
}

export async function startTrialAction(idToken: string) {
  try {
    const uid = await verifyIdToken(idToken);
    const userRef = adminDb.collection('users').doc(uid);
    const now = new Date();
    const trialDurationMs = 3 * 24 * 60 * 60 * 1000; // 3 days
    const trialEnds = new Date(now.getTime() + trialDurationMs);

    const result = await adminDb.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new Error('User profile not found.');
      }

      const userData = userDoc.data() || {};
      if (userData.trialUsed === true) {
        throw new Error('You have already used your free trial.');
      }

      transaction.update(userRef, {
        trialStartedAt: admin.firestore.Timestamp.fromDate(now),
        trialEndsAt: admin.firestore.Timestamp.fromDate(trialEnds),
        trialUsed: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { success: true };
    });

    revalidatePath('/profile');
    revalidatePath('/dashboard');
    return result;
  } catch (error: any) {
    console.error('[startTrialAction] Error starting trial:', error.message);
    return { error: error.message || 'Failed to start trial.' };
  }
}

export async function incrementFreeGenerationsUsed(userId: string): Promise<{ success: boolean; generationsLeft: number }> {
  if (!userId) return { success: false, generationsLeft: 0 };

  try {
    await verifyPremiumOrQuota(userId, 'recipe');
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const quotaDoc = await adminDb.collection('users').doc(userId).collection('quotas').doc(currentMonth).get();
    const recipesUsed = quotaDoc.exists ? (quotaDoc.data()?.recipesUsed || 0) : 0;
    return { success: true, generationsLeft: Math.max(0, 3 - recipesUsed) };
  } catch (error) {
    console.error('Error incrementing free generations:', error);
    return { success: false, generationsLeft: 0 };
  }
}
