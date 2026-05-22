'use server';

import { evaluateEntitlement, verifyIdToken, verifyPremiumOrQuota } from './user';
import { generateWorkoutPlan, type GenerateWorkoutPlanInput } from '@/ai/flows/generate-workout-plan-flow';
import { adaptWorkoutSchedule, type AdaptWorkoutScheduleInput } from '@/ai/flows/adapt-workout-schedule-flow';
import { adminDb } from '@/lib/firebaseAdmin';
import { getClientIp, ipRateLimiter, userRateLimiter } from '@/lib/rate-limit';

export async function generateWorkoutPlanAction(idToken: string, input: GenerateWorkoutPlanInput) {
  try {
    const uid = await verifyIdToken(idToken);

    // Rate limit check
    const ip = await getClientIp();
    const ipLimit = ipRateLimiter.check(ip);
    const userLimit = userRateLimiter.check(uid);
    if (!ipLimit.success || !userLimit.success) {
      return { error: 'Rate limit exceeded. Please wait a minute before generating another workout plan.' };
    }

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

    // Rate limit check
    const ip = await getClientIp();
    const ipLimit = ipRateLimiter.check(ip);
    const userLimit = userRateLimiter.check(uid);
    if (!ipLimit.success || !userLimit.success) {
      return { error: 'Rate limit exceeded. Please wait a minute before adapting this workout schedule.' };
    }

    // Adaptation is a premium/trial-only feature. Verify entitlement.
    const userDoc = await adminDb.collection('users').doc(uid).get();
    const userData = userDoc.data() || {};
    const entitlement = await evaluateEntitlement(userData);

    if (entitlement.type === 'free') {
      throw new Error('Workout plan adaptation is a premium-only feature. Please upgrade to Premium or start a trial.');
    }

    const result = await adaptWorkoutSchedule(input);
    return { success: true, plan: result };
  } catch (error: any) {
    console.error('[adaptWorkoutScheduleAction] Error:', error.message);
    return { error: error.message || 'Failed to adapt workout schedule.' };
  }
}
