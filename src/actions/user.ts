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

export interface UserEntitlement {
  type: 'premium' | 'trial' | 'free';
  isActive: boolean;
}

/**
 * Canonical entitlement evaluation.
 * Precedence rule: Premium Active > Trial Active > Free Quota
 */
export async function evaluateEntitlement(userData: any): Promise<UserEntitlement> {
  const now = new Date();
  
  // 1. Premium check (status is 'active' or isPremium flag is true)
  const isPremium = userData.isPremium === true || userData.premiumSubscriptionStatus === 'active';
  if (isPremium) {
    return { type: 'premium', isActive: true };
  }
  
  // 2. Trial check (trial ends in the future)
  const trialEndsAt = userData.trialEndsAt;
  const trialEndsDate = trialEndsAt && (typeof trialEndsAt.toDate === 'function' ? trialEndsAt.toDate() : new Date(trialEndsAt));
  const hasActiveTrial = trialEndsDate && trialEndsDate > now;
  if (hasActiveTrial) {
    return { type: 'trial', isActive: true };
  }
  
  // 3. Free Tier
  return { type: 'free', isActive: true };
}

export async function verifyIdToken(idToken: string): Promise<string> {
  if (!idToken) {
    throw new Error('Authentication is required. Please log in.');
  }
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    // Strict age check: enforce that the token is not older than 1 hour (Firebase tokens are valid for 1 hour)
    const now = Math.floor(Date.now() / 1000);
    if (decodedToken.exp < now) {
      throw new Error('Your session has expired. Please sign in again.');
    }
    
    return decodedToken.uid;
  } catch (error: any) {
    console.error('[verifyIdToken] Token verification failed:', error.code || error.message);
    if (error.code === 'auth/id-token-expired') {
      throw new Error('Your session has expired. Please sign in again.');
    }
    if (error.code === 'auth/id-token-revoked') {
      throw new Error('Your session was revoked. Please sign in again.');
    }
    if (error.code === 'auth/argument-error') {
      throw new Error('Invalid authentication token.');
    }
    throw new Error('Authentication failed. Please log in.');
  }
}

export async function verifyPremiumOrQuota(uid: string, feature: 'recipe' | 'workout' | 'foodLog'): Promise<{
  success: boolean;
  isPremium: boolean;
  limit: number;
  currentUsed: number;
}> {
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
    const entitlement = await evaluateEntitlement(userData);

    let limit = 3; // recipes and foodLogs
    let field = 'recipesUsed';

    if (feature === 'workout') {
      limit = 1;
      field = 'workoutsUsed';
    } else if (feature === 'foodLog') {
      limit = 3;
      field = 'foodLogsUsed';
    }

    // Check quota doc inside the transaction
    const quotaDoc = await transaction.get(quotaRef);
    const quotaData = quotaDoc.data() || {};
    const currentUsed = quotaData[field] || 0;

    if (entitlement.type === 'premium' || entitlement.type === 'trial') {
      // Premium and trial users have unlimited quota, return limit as Infinity but track count
      return { success: true, isPremium: true, limit: Infinity, currentUsed };
    }

    // Check quota limit for free tier
    if (currentUsed >= limit) {
      throw new Error(`You have reached your free monthly limit of ${limit} ${feature}s. Please upgrade to Premium or start a trial!`);
    }

    const newUsed = currentUsed + 1;
    // Increment count transactionally
    transaction.set(quotaRef, {
      monthKey: currentMonth,
      [field]: newUsed,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return { success: true, isPremium: false, limit, currentUsed: newUsed };
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
    const result = await verifyPremiumOrQuota(userId, 'recipe');
    if (result.isPremium) {
      return { success: true, generationsLeft: 999 }; // Unlimited for premium/trial
    }
    return { success: true, generationsLeft: Math.max(0, result.limit - result.currentUsed) };
  } catch (error) {
    console.error('Error incrementing free generations:', error);
    return { success: false, generationsLeft: 0 };
  }
}
