'use server';

import { verifyIdToken } from './user';
import { generateDashboardInsights } from '@/ai/flows/generate-dashboard-insights-flow';
import { adminDb } from '@/lib/firebaseAdmin';

export async function getDashboardInsightsAction(
  idToken: string,
  profile: any,
  foodLogs: any[],
  timeOfDay: 'morning' | 'afternoon' | 'evening'
) {
  try {
    const uid = await verifyIdToken(idToken);
    
    // Insights is a premium/trial-only feature. Verify entitlement.
    const userDoc = await adminDb.collection('users').doc(uid).get();
    const userData = userDoc.data() || {};
    const isPremium = userData.isPremium === true;
    const trialEndsAt = userData.trialEndsAt;
    const hasActiveTrial = trialEndsAt && trialEndsAt.toDate() > new Date();

    if (!isPremium && !hasActiveTrial) {
      throw new Error('Dashboard insights are a premium-only feature. Please upgrade to Premium or start a trial.');
    }

    const result = await generateDashboardInsights(profile, foodLogs, timeOfDay);
    return { success: true, insights: result };
  } catch (error: any) {
    console.error('[getDashboardInsightsAction] Error:', error.message);
    return { error: error.message || 'Failed to generate dashboard insights.' };
  }
}
