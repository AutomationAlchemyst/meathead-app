'use server';

import { verifyIdToken, verifyPremiumOrQuota } from './user';
import { generateWorkoutPlan, type GenerateWorkoutPlanInput } from '@/ai/flows/generate-workout-plan-flow';
import { adaptWorkoutSchedule, type AdaptWorkoutScheduleInput } from '@/ai/flows/adapt-workout-schedule-flow';
import { adminDb } from '@/lib/firebaseAdmin';

export async function generateWorkoutPlanAction(idToken: string, input: GenerateWorkoutPlanInput) {
  try {
    const uid = await verifyIdToken(idToken);
    await verifyPremiumOrQuota(uid, 'workout');
    const result = await generateWorkoutPlan(input);
    return { success: true, plan: result };
  } catch (error: any) {
    console.error('[generateWorkoutPlanAction] Error:', error.message);
    return { error: error.message || 'Failed to generate workout plan.' };
  }
}

export async function adaptWorkoutScheduleAction(idToken: string, input: AdaptWorkoutScheduleInput) {
  try {
    const uid = await verifyIdToken(idToken);
    
    // Adaptation is a premium/trial-only feature. Verify entitlement.
    const userDoc = await adminDb.collection('users').doc(uid).get();
    const userData = userDoc.data() || {};
    const isPremium = userData.isPremium === true;
    const trialEndsAt = userData.trialEndsAt;
    const hasActiveTrial = trialEndsAt && trialEndsAt.toDate() > new Date();

    if (!isPremium && !hasActiveTrial) {
      throw new Error('Workout plan adaptation is a premium-only feature. Please upgrade to Premium or start a trial.');
    }

    const result = await adaptWorkoutSchedule(input);
    return { success: true, plan: result };
  } catch (error: any) {
    console.error('[adaptWorkoutScheduleAction] Error:', error.message);
    return { error: error.message || 'Failed to adapt workout schedule.' };
  }
}
