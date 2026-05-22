'use server';

import { verifyIdToken, verifyPremiumOrQuota } from './user';
import { generateDetailedRecipe, type GenerateDetailedRecipeInput } from '@/ai/flows/generate-detailed-recipe-flow';
import { generateRecipeFromIngredients, type GenerateRecipeFromIngredientsInput } from '@/ai/flows/generate-recipe-from-ingredients-flow';
import { adaptRecipe, type AdaptRecipeInput } from '@/ai/flows/adapt-recipe-flow';
import { getClientIp, ipRateLimiter, userRateLimiter } from '@/lib/rate-limit';

export async function generateDetailedRecipeAction(idToken: string, input: GenerateDetailedRecipeInput) {
  try {
    const uid = await verifyIdToken(idToken);
    
    // Rate limit check
    const ip = await getClientIp();
    const ipLimit = ipRateLimiter.check(ip);
    const userLimit = userRateLimiter.check(uid);
    if (!ipLimit.success || !userLimit.success) {
      return { error: 'Rate limit exceeded. Please wait a minute before generating another recipe.' };
    }

    await verifyPremiumOrQuota(uid, 'recipe');
    const result = await generateDetailedRecipe(input);
    return { success: true, recipe: result };
  } catch (error: any) {
    console.error('[generateDetailedRecipeAction] Error:', error.message);
    return { error: error.message || 'Failed to generate recipe.' };
  }
}

export async function generateRecipeFromIngredientsAction(idToken: string, input: GenerateRecipeFromIngredientsInput) {
  try {
    const uid = await verifyIdToken(idToken);
    
    // Rate limit check
    const ip = await getClientIp();
    const ipLimit = ipRateLimiter.check(ip);
    const userLimit = userRateLimiter.check(uid);
    if (!ipLimit.success || !userLimit.success) {
      return { error: 'Rate limit exceeded. Please wait a minute before generating another recipe.' };
    }

    await verifyPremiumOrQuota(uid, 'recipe');
    const result = await generateRecipeFromIngredients(input);
    return { success: true, recipe: result };
  } catch (error: any) {
    console.error('[generateRecipeFromIngredientsAction] Error:', error.message);
    return { error: error.message || 'Failed to generate recipe from ingredients.' };
  }
}

export async function adaptRecipeAction(idToken: string, input: AdaptRecipeInput) {
  try {
    const uid = await verifyIdToken(idToken);
    
    // Rate limit check
    const ip = await getClientIp();
    const ipLimit = ipRateLimiter.check(ip);
    const userLimit = userRateLimiter.check(uid);
    if (!ipLimit.success || !userLimit.success) {
      return { error: 'Rate limit exceeded. Please wait a minute before adapting this recipe.' };
    }

    await verifyPremiumOrQuota(uid, 'recipe');
    const result = await adaptRecipe(input);
    return { success: true, recipe: result };
  } catch (error: any) {
    console.error('[adaptRecipeAction] Error:', error.message);
    return { error: error.message || 'Failed to adapt recipe.' };
  }
}

