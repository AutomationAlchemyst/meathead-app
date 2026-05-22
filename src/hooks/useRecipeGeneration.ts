'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { FoodLog } from '@/types';
import type { GenerateDetailedRecipeOutput, RecipeMacros } from '@/ai/schemas/recipe-schemas';
import type { GenerateRecipeFromIngredientsOutput } from '@/ai/flows/generate-recipe-from-ingredients-flow';
import type { AdaptRecipeOutput } from '@/ai/flows/adapt-recipe-flow';
import { 
  generateDetailedRecipeAction, 
  generateRecipeFromIngredientsAction, 
  adaptRecipeAction 
} from '@/actions/recipe';
import { startTrialAction } from '@/actions/user';

const MAX_FREE_GENERATIONS = 3;

export function useRecipeGeneration() {
  const { user, userProfile, loading: authLoading, isPremium } = useAuth();
  const { toast } = useToast();

  // Recipe quota tracking from nested quotas subcollection
  const [recipesUsed, setRecipesUsed] = useState(0);

  // States for generation
  const [generatedRecipe, setGeneratedRecipe] = useState<GenerateDetailedRecipeOutput | null>(null);
  const [isLoadingGeneration, setIsLoadingGeneration] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isLoggingGeneratedRecipe, setIsLoggingGeneratedRecipe] = useState(false);

  // States for fridge-ingredients generation
  const [fromIngredientsRecipe, setFromIngredientsRecipe] = useState<GenerateRecipeFromIngredientsOutput | null>(null);
  const [isLoadingFromIngredients, setIsLoadingFromIngredients] = useState(false);
  const [fromIngredientsError, setFromIngredientsError] = useState<string | null>(null);
  const [isLoggingFromIngredientsRecipe, setIsLoggingFromIngredientsRecipe] = useState(false);

  // States for adaptation
  const [adaptedRecipeOutput, setAdaptedRecipeOutput] = useState<AdaptRecipeOutput | null>(null);
  const [isLoadingAdaptation, setIsLoadingAdaptation] = useState(false);
  const [adaptationError, setAdaptationError] = useState<string | null>(null);
  const [isLoggingAdaptedRecipe, setIsLoggingAdaptedRecipe] = useState(false);

  const [isStartingTrial, setIsStartingTrial] = useState(false);

  // Trial duration calculations
  const trialEndsAt = userProfile?.trialEndsAt;
  const trialUsed = userProfile?.trialUsed;
  const trialDaysRemaining = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.toDate().getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;
  const trialAvailable = !trialUsed && !isPremium;

  const freeGenerationsLeft = Math.max(0, MAX_FREE_GENERATIONS - recipesUsed);
  const canUseFeature = isPremium || trialDaysRemaining > 0 || freeGenerationsLeft > 0;

  // Listen to recipe quota
  useEffect(() => {
    if (!user) return;
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const quotaDocRef = doc(db, 'users', user.uid, 'quotas', currentMonth);

    const unsubscribe = onSnapshot(quotaDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setRecipesUsed(data.recipesUsed || 0);
      } else {
        setRecipesUsed(0);
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Start trial handler
  const startTrial = async () => {
    if (!user) return;
    setIsStartingTrial(true);
    try {
      const idToken = await user.getIdToken();
      const res = await startTrialAction(idToken);
      if ('error' in res && res.error) {
        throw new Error(res.error);
      }
      toast({ title: "Trial Started", description: "Your 3-day free trial has been activated!" });
    } catch (e: any) {
      toast({ title: "Failed to start trial", description: e.message, variant: "destructive" });
    } finally {
      setIsStartingTrial(false);
    }
  };

  // Generate detailed recipe
  const generateRecipe = async (input: any) => {
    if (!user) return;
    setIsLoadingGeneration(true);
    setGenerationError(null);
    setGeneratedRecipe(null);

    try {
      const idToken = await user.getIdToken();
      const result = await generateDetailedRecipeAction(idToken, input);
      if ('error' in result && result.error) {
        throw new Error(result.error);
      }
      if ('success' in result && result.success && result.recipe) {
        setGeneratedRecipe(result.recipe);
      }
    } catch (e: any) {
      setGenerationError(e.message);
      toast({ title: 'Recipe Generation Failed', description: e.message, variant: 'destructive' });
    } finally {
      setIsLoadingGeneration(false);
    }
  };

  // Generate from ingredients
  const generateFromIngredients = async (input: any) => {
    if (!user) return;
    setIsLoadingFromIngredients(true);
    setFromIngredientsError(null);
    setFromIngredientsRecipe(null);

    try {
      const idToken = await user.getIdToken();
      const result = await generateRecipeFromIngredientsAction(idToken, input);
      if ('error' in result && result.error) {
        throw new Error(result.error);
      }
      if ('success' in result && result.success && result.recipe) {
        setFromIngredientsRecipe(result.recipe);
      }
    } catch (e: any) {
      setFromIngredientsError(e.message);
      toast({ title: 'Recipe Generation Failed', description: e.message, variant: 'destructive' });
    } finally {
      setIsLoadingFromIngredients(false);
    }
  };

  // Adapt recipe
  const adaptRecipe = async (input: any) => {
    if (!user) return;
    setIsLoadingAdaptation(true);
    setAdaptationError(null);
    setAdaptedRecipeOutput(null);

    try {
      const idToken = await user.getIdToken();
      const result = await adaptRecipeAction(idToken, input);
      if ('error' in result && result.error) {
        throw new Error(result.error);
      }
      if ('success' in result && result.success && result.recipe) {
        setAdaptedRecipeOutput(result.recipe);
      }
    } catch (e: any) {
      setAdaptationError(e.message);
      toast({ title: 'Recipe Adaptation Failed', description: e.message, variant: 'destructive' });
    } finally {
      setIsLoadingAdaptation(false);
    }
  };

  // Log recipe to food log
  const logRecipe = async (recipeToLog: GenerateDetailedRecipeOutput, servingsToLog: number, source: 'generate' | 'fridge') => {
    if (!user) {
      toast({ title: "Login Required", description: "Please log in to save this meal to your food log.", variant: "destructive" });
      return;
    }

    if (source === 'generate') setIsLoggingGeneratedRecipe(true);
    if (source === 'fridge') setIsLoggingFromIngredientsRecipe(true);

    try {
      const scale = servingsToLog / recipeToLog.servings;
      const foodLogEntry: Omit<FoodLog, 'id' | 'userId'> = {
        foodItem: recipeToLog.recipeName,
        quantity: `${servingsToLog} of ${recipeToLog.servings} servings`,
        calories: Math.round(recipeToLog.macrosPerServing.calories * scale),
        protein: Math.round(recipeToLog.macrosPerServing.protein * scale * 10) / 10,
        carbs: Math.round(recipeToLog.macrosPerServing.carbs * scale * 10) / 10,
        fat: Math.round(recipeToLog.macrosPerServing.fat * scale * 10) / 10,
        loggedAt: serverTimestamp() as any as Timestamp,
      };

      const foodLogWithUser: Omit<FoodLog, 'id'> = { ...foodLogEntry, userId: user.uid };
      await addDoc(collection(db, 'users', user.uid, 'foodLogs'), foodLogWithUser);
      toast({ title: "Meal Logged!", description: `${recipeToLog.recipeName} (${servingsToLog} serving${servingsToLog !== 1 ? 's' : ''}) added to your food log.` });
    } catch (error: any) {
      toast({ title: "Logging Failed", description: error.message || "Could not log this meal.", variant: "destructive" });
    } finally {
      if (source === 'generate') setIsLoggingGeneratedRecipe(false);
      if (source === 'fridge') setIsLoggingFromIngredientsRecipe(false);
    }
  };

  // Log adapted recipe
  const logAdaptedRecipe = async (macros: RecipeMacros, recipeName: string, servingsToLog: number) => {
    if (!user) {
      toast({ title: "Login Required", description: "Please log in to save this meal.", variant: "destructive" });
      return;
    }
    setIsLoggingAdaptedRecipe(true);
    try {
      const foodLogEntry: Omit<FoodLog, 'id' | 'userId'> = {
        foodItem: recipeName,
        quantity: `${servingsToLog} serving(s)`,
        calories: macros.calories,
        protein: macros.protein,
        carbs: macros.carbs,
        fat: macros.fat,
        loggedAt: serverTimestamp() as any as Timestamp,
      };
      const foodLogWithUser: Omit<FoodLog, 'id'> = { ...foodLogEntry, userId: user.uid };
      await addDoc(collection(db, 'users', user.uid, 'foodLogs'), foodLogWithUser);
      toast({ title: "Meal Logged!", description: `${recipeName} (${servingsToLog} serving${servingsToLog !== 1 ? 's' : ''}) added to your food log.` });
    } catch (error: any) {
      toast({ title: "Logging Failed", description: error.message || "Could not log this adapted meal.", variant: "destructive" });
    } finally {
      setIsLoggingAdaptedRecipe(false);
    }
  };

  return {
    user,
    userProfile,
    authLoading,
    isPremium,
    trialDaysRemaining,
    trialAvailable,
    recipesUsed,
    freeGenerationsLeft,
    canUseFeature,
    generatedRecipe,
    isLoadingGeneration,
    generationError,
    isLoggingGeneratedRecipe,
    fromIngredientsRecipe,
    isLoadingFromIngredients,
    fromIngredientsError,
    isLoggingFromIngredientsRecipe,
    adaptedRecipeOutput,
    isLoadingAdaptation,
    adaptationError,
    isLoggingAdaptedRecipe,
    isStartingTrial,
    startTrial,
    generateRecipe,
    generateFromIngredients,
    adaptRecipe,
    logRecipe,
    logAdaptedRecipe,
  };
}
