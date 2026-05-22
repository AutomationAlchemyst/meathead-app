'use server';

import { verifyIdToken } from './user';
import { generateMealPlan, type GenerateMealPlanInput } from '@/ai/flows/generate-meal-plan-flow';
import { adminDb } from '@/lib/firebaseAdmin';

export async function generateMealPlanAction(idToken: string, input: GenerateMealPlanInput) {
  try {
    const uid = await verifyIdToken(idToken);
    
    // Meal plan is a premium/trial-only feature. Verify entitlement.
    const userDoc = await adminDb.collection('users').doc(uid).get();
    const userData = userDoc.data() || {};
    const isPremium = userData.isPremium === true;
    const trialEndsAt = userData.trialEndsAt;
    const hasActiveTrial = trialEndsAt && trialEndsAt.toDate() > new Date();

    if (!isPremium && !hasActiveTrial) {
      throw new Error('Meal planning is a premium-only feature. Please upgrade to Premium or start a trial.');
    }

    const result = await generateMealPlan(input);
    return { success: true, plan: result };
  } catch (error: any) {
    console.error('[generateMealPlanAction] Error:', error.message);
    return { error: error.message || 'Failed to generate meal plan.' };
  }
}
