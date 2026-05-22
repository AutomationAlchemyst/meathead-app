'use server';

import { verifyIdToken, verifyPremiumOrQuota } from './user';
import { parseNaturalLanguageFoodInput } from '@/ai/flows/parse-natural-language-food-input';
import { estimateMacros } from '@/ai/flows/estimate-macros';
import { getKetoGuidance } from '@/ai/flows/get-keto-guidance';
import { adminDb, admin } from '@/lib/firebaseAdmin';
import { isSameDay, subDays } from 'date-fns';
import { getClientIp, ipRateLimiter, userRateLimiter } from '@/lib/rate-limit';

export async function logFoodWithAIAction(idToken: string, query: string, dateStr: string) {
  try {
    const uid = await verifyIdToken(idToken);
    
    // Rate limit check
    const ip = await getClientIp();
    const ipLimit = ipRateLimiter.check(ip);
    const userLimit = userRateLimiter.check(uid);
    if (!ipLimit.success || !userLimit.success) {
      return { error: 'Rate limit exceeded. Please wait a minute before logging food with AI.' };
    }
    
    // Verify foodLog quota
    await verifyPremiumOrQuota(uid, 'foodLog');

    // 1. Parse food items
    const parsedItems = await parseNaturalLanguageFoodInput({ naturalLanguageQuery: query });
    if (!Array.isArray(parsedItems) && 'error' in parsedItems) {
      throw new Error(`AI Error parsing food: ${parsedItems.error}`);
    }
    if (!parsedItems || parsedItems.length === 0) {
      throw new Error("Could not understand the meal description.");
    }

    // 2. Estimate macros
    const itemsWithMacros = await Promise.all(parsedItems.map(async (item) => {
      const macros = await estimateMacros({ foodItem: item.foodItem, quantity: item.quantity });
      if (macros && 'error' in macros) throw new Error(`AI Error estimating macros for ${item.foodItem}: ${macros.error}`);
      if (!macros || typeof (macros as any).calories !== 'number') {
        throw new Error(`AI returned invalid macros for ${item.foodItem}.`);
      }
      return { ...item, ...(macros as any) };
    }));

    // 3. Get keto guidance
    const finalProcessedItems = await Promise.all(itemsWithMacros.map(async (item) => {
      const guidance = await getKetoGuidance(item as any);
      if (guidance && 'error' in guidance) throw new Error(`AI Error getting keto guidance for ${item.foodItem}: ${guidance.error}`);
      return { ...item, ...guidance };
    }));

    // 4. Batch-write to Firestore using Admin SDK
    const batch = adminDb.batch();
    const parsedDate = new Date(dateStr);
    const loggedAtTimestamp = admin.firestore.Timestamp.fromDate(parsedDate);

    finalProcessedItems.forEach(item => {
      const logRef = adminDb.collection('users').doc(uid).collection('foodLogs').doc();
      const newFoodLog = {
        userId: uid,
        foodItem: item.foodItem,
        quantity: item.quantity,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        loggedAt: loggedAtTimestamp,
        isKetoFriendly: item.isKetoFriendly,
        suggestion: item.suggestion,
      };
      batch.set(logRef, newFoodLog);
    });

    await batch.commit();

    // 5. Update user streak server-side
    const userRef = adminDb.collection('users').doc(uid);
    await adminDb.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (userDoc.exists) {
        const userData = userDoc.data() || {};
        const lastLogDateTimestamp = userData.lastLogDate as admin.firestore.Timestamp | undefined;
        const lastLogDate = lastLogDateTimestamp ? lastLogDateTimestamp.toDate() : undefined;
        const now = new Date();
        const yesterday = subDays(now, 1);
        let newStreak = userData.currentStreak || 0;

        if (lastLogDate) {
          if (isSameDay(lastLogDate, yesterday)) {
            newStreak += 1;
          } else if (!isSameDay(lastLogDate, now)) {
            newStreak = 1;
          }
        } else {
          newStreak = 1;
        }

        transaction.update(userRef, {
          currentStreak: newStreak,
          lastLogDate: admin.firestore.Timestamp.fromDate(now),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    });

    return { success: true, items: finalProcessedItems };
  } catch (error: any) {
    console.error('[logFoodWithAIAction] Error:', error.message);
    return { error: error.message || 'Failed to log food with AI.' };
  }
}
