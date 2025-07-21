
'use client';

import type { ReactElement } from 'react';
import { useState, useEffect } from 'react'; // Added useEffect
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardFooter, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Brain, Utensils, Soup, ShoppingBasket, Clock, Sparkles, AlertCircle, CookingPot, Hash, Info, PlusCircle, CopyCheck, GitFork, Refrigerator, ShieldCheck, Flame, Gem, Zap } from 'lucide-react'; // Replaced Chili with Flame, added Gem, Zap
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { generateDetailedRecipe, type GenerateDetailedRecipeInput, type GenerateDetailedRecipeOutput, type RecipeIngredient, type RecipeStep, type RecipeMacros } from '@/ai/flows/generate-detailed-recipe-flow';
import { adaptRecipe, type AdaptRecipeInput, type AdaptRecipeOutput } from '@/ai/flows/adapt-recipe-flow';
import { generateRecipeFromIngredients, type GenerateRecipeFromIngredientsInput, type GenerateRecipeFromIngredientsOutput } from '@/ai/flows/generate-recipe-from-ingredients-flow'; 

import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { FoodLog } from '@/types';
import AdaptedRecipeDisplay from '@/components/recipe-generator/AdaptedRecipeDisplay';
import UpgradePrompt from '@/components/premium/UpgradePrompt';


const dietaryPreferences = ["Keto", "Keto Dairy-Free", "Keto Nut-Free", "Keto Vegetarian", "Low-Carb General"] as const;
const mealTypes = ["Breakfast", "Lunch", "Dinner", "Snack", "Dessert", "Side Dish", "Any"] as const;
const cookingTimes = ["Quick (under 30 mins)", "Moderate (30-60 mins)", "No Preference"] as const;
const spiceLevels = ["Mild", "Medium", "Spicy", "Any"] as const; 
const adaptationGoals = [
    { value: "makeKeto", label: "Make it Keto" },
    { value: "makeHalal", label: "Make it Halal" },
    { value: "suggestSubstitutions", label: "Suggest Ingredient Substitutions" },
    { value: "makeKetoHalal", label: "Make it Keto & Halal" }
] as const;
type AdaptationGoalValue = typeof adaptationGoals[number]['value'];


function GeneratedRecipeDisplay({ recipe, onLogRecipe, isLoggingRecipe, recipeSource }: { recipe: GenerateDetailedRecipeOutput; onLogRecipe: (recipeToLog: GenerateDetailedRecipeOutput) => Promise<void>; isLoggingRecipe: boolean; recipeSource?: string; }) {
  const { user } = useAuth();
  return (
    <Card className="mt-8 shadow-xl">
      <CardHeader className="bg-primary/10 p-6 rounded-t-lg">
        <CardTitle className="text-3xl font-headline text-primary flex items-center">
          <Soup className="h-8 w-8 mr-3" /> {recipe.recipeName}
        </CardTitle>
        <CardDescription className="text-base pt-1">{recipe.description}</CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
            <Clock className="h-5 w-5 text-primary" />
            <div>
              <span className="font-semibold">Prep:</span> {recipe.prepTime}
            </div>
          </div>
          <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
            <Clock className="h-5 w-5 text-primary" />
            <div>
              <span className="font-semibold">Cook:</span> {recipe.cookTime}
            </div>
          </div>
          <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
            <Hash className="h-5 w-5 text-primary" />
            <div>
              <span className="font-semibold">Servings:</span> {recipe.servings}
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center"><ShoppingBasket className="h-6 w-6 mr-2 text-primary" />Ingredients</h3>
          <ul className="list-disc list-inside space-y-1.5 pl-2 columns-1 sm:columns-2 text-sm">
            {recipe.ingredients.map((ing, index) => (
              <li key={index}>
                {ing.quantity} {ing.unit} {ing.name}
                {ing.notes && <span className="text-muted-foreground text-xs"> ({ing.notes})</span>}
              </li>
            ))}
          </ul>
        </div>

        <Separator />

        <div>
          <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center"><CookingPot className="h-6 w-6 mr-2 text-primary" />Instructions</h3>
          <ol className="space-y-3">
            {recipe.instructions.map((step) => (
              <li key={step.stepNumber} className="flex">
                <Badge variant="secondary" className="mr-3 h-6 w-6 flex items-center justify-center text-primary font-bold shrink-0">{step.stepNumber}</Badge>
                <p className="text-sm leading-relaxed">{step.instruction}</p>
              </li>
            ))}
          </ol>
        </div>

        <Separator />

        <div>
          <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center"><Sparkles className="h-6 w-6 mr-2 text-primary" />Macros per Serving</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            {(Object.keys(recipe.macrosPerServing) as Array<keyof RecipeMacros>).map(key => (
              <div key={key} className="p-3 bg-muted rounded-lg text-center">
                <p className="font-semibold capitalize">{key}</p>
                <p>{recipe.macrosPerServing[key]}{key === 'calories' ? ' kcal' : ' g'}</p>
              </div>
            ))}
          </div>
        </div>

        {recipe.tips && recipe.tips.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center"><Info className="h-6 w-6 mr-2 text-primary" />Chef Ath's Tips</h3>
              <ul className="list-disc list-inside space-y-1 pl-2 text-sm">
                {recipe.tips.map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))}
              </ul>
            </div>
          </>
        )}
      </CardContent>
      <CardFooter className="p-6 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
        <p className="text-xs text-muted-foreground text-center sm:text-left">Recipe generated by Chef Ath. Nutritional information is an estimate. Always verify ingredients for dietary compliance.</p>
        {user && (
          <Button 
            onClick={() => onLogRecipe(recipe)} 
            disabled={isLoggingRecipe} 
            size="sm"
            className="w-full sm:w-auto"
          >
            {isLoggingRecipe ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
            {isLoggingRecipe ? 'Logging Meal...' : 'Log This Meal (1 Serving)'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

function RecipeGeneratorSkeleton() { // Skeleton for generation
  return (
    <Card className="mt-8 shadow-xl">
      <CardHeader className="bg-primary/10 p-6 rounded-t-lg">
        <Skeleton className="h-8 w-3/4 mb-2" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-2/3 mt-1" />
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
        <Separator />
        <div>
          <Skeleton className="h-7 w-1/3 mb-3" />
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-5 w-full sm:w-1/2" />)}
          </div>
        </div>
        <Separator />
        <div>
          <Skeleton className="h-7 w-1/3 mb-3" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex">
                <Skeleton className="h-6 w-6 mr-3 rounded-full shrink-0" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </div>
        <Separator />
        <div>
          <Skeleton className="h-7 w-1/3 mb-3" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-6 border-t">
        <Skeleton className="h-4 w-3/4" />
      </CardFooter>
    </Card>
  );
}

function RecipeAdaptationSkeleton() { // Skeleton for adaptation
  return (
    <Card className="mt-8 shadow-xl">
      <CardHeader className="bg-secondary/10 p-6 rounded-t-lg">
        <Skeleton className="h-8 w-3/4 mb-2" />
        <Skeleton className="h-5 w-full" />
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <Skeleton className="h-6 w-1/2 mb-2" />
        <Skeleton className="h-4 w-3/4 mb-4" />

        <Skeleton className="h-7 w-1/3 mb-3" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <Skeleton key={`adapt-change-${i}`} className="h-10 w-full" />)}
        </div>
        <Separator />
        <Skeleton className="h-7 w-1/3 mb-3" />
        <div className="space-y-2">
            {[...Array(4)].map((_, i) => <Skeleton key={`adapt-ing-${i}`} className="h-5 w-full sm:w-1/2" />)}
        </div>
        <Separator />
         <Skeleton className="h-7 w-1/3 mb-3" />
         <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <Skeleton key={`adapt-macro-${i}`} className="h-16 w-full" />)}
        </div>
      </CardContent>
       <CardFooter className="p-6 border-t">
        <Skeleton className="h-4 w-3/4" />
      </CardFooter>
    </Card>
  );
}


const MAX_FREE_GENERATIONS = 3; 

export default function RecipeGeneratorPage() {
  const { user, userProfile, loading: authLoading, isPremium } = useAuth();
  const { toast } = useToast();

  // State for "Generate New Recipe" Tab
  const [generatedRecipe, setGeneratedRecipe] = useState<GenerateDetailedRecipeOutput | null>(null);
  const [isLoadingGeneration, setIsLoadingGeneration] = useState(false);
  const [isLoggingGeneratedRecipe, setIsLoggingGeneratedRecipe] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [mainIngredients, setMainIngredients] = useState<string>('');
  const [excludedIngredients, setExcludedIngredients] = useState<string>('');
  const [generationFormState, setGenerationFormState] = useState<Partial<GenerateDetailedRecipeInput>>({
    dietaryPreference: "Keto",
    servings: 2,
    cookingTimePreference: "No Preference",
    mealType: "Any",
    ensureHalal: false,
    spiceLevel: "Any", 
  });

  // State for "Adapt Existing Recipe" Tab
  const [adaptedRecipeOutput, setAdaptedRecipeOutput] = useState<AdaptRecipeOutput | null>(null);
  const [isLoadingAdaptation, setIsLoadingAdaptation] = useState(false);
  const [isLoggingAdaptedRecipe, setIsLoggingAdaptedRecipe] = useState(false); 
  const [adaptationError, setAdaptationError] = useState<string | null>(null);
  const [adaptationFormState, setAdaptationFormState] = useState<Partial<AdaptRecipeInput>>({
    adaptationGoal: "makeKeto",
    servings: 2,
  });
  const [originalRecipeText, setOriginalRecipeText] = useState('');
  const [specificIngredientToSubstitute, setSpecificIngredientToSubstitute] = useState('');
  const [preferredSubstitution, setPreferredSubstitution] = useState('');
  const [additionalDietaryRestrictions, setAdditionalDietaryRestrictions] = useState('');

  // State for "What's In My Fridge?" Tab
  const [fromIngredientsRecipe, setFromIngredientsRecipe] = useState<GenerateRecipeFromIngredientsOutput | null>(null);
  const [isLoadingFromIngredients, setIsLoadingFromIngredients] = useState(false);
  const [isLoggingFromIngredientsRecipe, setIsLoggingFromIngredientsRecipe] = useState(false);
  const [fromIngredientsError, setFromIngredientsError] = useState<string | null>(null);
  const [availableFridgeIngredients, setAvailableFridgeIngredients] = useState<string>('');
  const [excludedFridgeIngredients, setExcludedFridgeIngredients] = useState<string>('');
  const [fromIngredientsFormState, setFromIngredientsFormState] = useState<Partial<Omit<GenerateRecipeFromIngredientsInput, 'availableIngredients' | 'excludedIngredients'>>>({
    dietaryPreference: "Keto",
    servings: 2,
    mealType: "Any",
  });

  // Freemium simulation state
  const [trialDaysRemaining, setTrialDaysRemaining] = useState(0);
  const [monthlyFreeGenerationsUsed, setMonthlyFreeGenerationsUsed] = useState(0);
  const [trialAvailable, setTrialAvailable] = useState(true); 

  const canUseFeature = isPremium || trialDaysRemaining > 0 || monthlyFreeGenerationsUsed < MAX_FREE_GENERATIONS;
  const freeGenerationsLeft = MAX_FREE_GENERATIONS - monthlyFreeGenerationsUsed;

  console.log(`[RecipeGeneratorPage] Render. Auth: user: ${user?.uid}, authLoading: ${authLoading}, isPremium (from context): ${isPremium}`);
  console.log(`[RecipeGeneratorPage] Freemium state: trialDays: ${trialDaysRemaining}, usedGenerations: ${monthlyFreeGenerationsUsed}, trialAvailable: ${trialAvailable}, canUseFeature: ${canUseFeature}`);


  const handleGenerationInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setGenerationFormState(prev => ({ ...prev, [name]: value }));
  };
  const handleGenerationSelectChange = (name: keyof GenerateDetailedRecipeInput) => (value: string) => {
    setGenerationFormState(prev => ({ ...prev, [name]: value }));
  };
  const handleGenerationNumberInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setGenerationFormState(prev => ({ ...prev, [name]: parseInt(value, 10) || undefined }));
  };
   const handleGenerationCheckboxChange = (name: keyof GenerateDetailedRecipeInput) => (checked: boolean) => {
    setGenerationFormState(prev => ({ ...prev, [name]: checked }));
  };

  const handleAdaptationInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAdaptationFormState(prev => ({ ...prev, [name]: value }));
  };
  const handleAdaptationSelectChange = (name: keyof AdaptRecipeInput) => (value: string) => {
    setAdaptationFormState(prev => ({ ...prev, [name]: value as AdaptationGoalValue }));
  };
   const handleAdaptationNumberInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAdaptationFormState(prev => ({ ...prev, [name]: parseInt(value, 10) || undefined }));
  };

  const handleFromIngredientsInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFromIngredientsFormState(prev => ({ ...prev, [name]: value }));
  };
  const handleFromIngredientsSelectChange = (name: keyof GenerateRecipeFromIngredientsInput) => (value: string) => {
    setFromIngredientsFormState(prev => ({ ...prev, [name]: value }));
  };
  const handleFromIngredientsNumberInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFromIngredientsFormState(prev => ({ ...prev, [name]: parseInt(value, 10) || undefined }));
  };

  const incrementUsageAndCheckLimit = () => {
    if (!isPremium && trialDaysRemaining <= 0) {
      setMonthlyFreeGenerationsUsed(prev => {
        console.log(`[RecipeGeneratorPage] Incrementing free generations used. Old: ${prev}, New: ${prev + 1}`);
        return prev + 1;
      });
    }
  };

  const handleGenerateRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log(`[RecipeGeneratorPage] handleGenerateRecipe called. canUseFeature: ${canUseFeature}, isPremium: ${isPremium}, trialDaysRemaining: ${trialDaysRemaining}`);
    if (!canUseFeature && !isPremium && trialDaysRemaining <= 0) {
      toast({ title: "Limit Reached", description: "You've used all your free generations. Upgrade to Premium or start a trial for unlimited access!", variant: "destructive" });
      return;
    }
    incrementUsageAndCheckLimit();

    setIsLoadingGeneration(true);
    setGenerationError(null);
    setGeneratedRecipe(null);

    const inputForAI: GenerateDetailedRecipeInput = {
      dietaryPreference: generationFormState.dietaryPreference || "Keto",
      cuisinePreference: generationFormState.cuisinePreference || "Any",
      mealType: generationFormState.mealType || "Any",
      mainIngredients: mainIngredients.split(',').map(s => s.trim()).filter(Boolean),
      excludedIngredients: excludedIngredients.split(',').map(s => s.trim()).filter(Boolean),
      cookingTimePreference: generationFormState.cookingTimePreference || "No Preference",
      servings: generationFormState.servings || 2,
      specificRequests: generationFormState.specificRequests,
      ensureHalal: generationFormState.ensureHalal || false,
      spiceLevel: generationFormState.spiceLevel || "Any", 
    };

    try {
      const recipe = await generateDetailedRecipe(inputForAI);
      setGeneratedRecipe(recipe);
    } catch (e: any) {
      console.error("Error generating detailed recipe:", e);
      const errorMessage = e.message || "Failed to generate recipe. Chef Ath might be busy. Please try again.";
      setGenerationError(errorMessage);
      toast({ title: 'Recipe Generation Failed', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsLoadingGeneration(false);
    }
  };

  const handleLogRecipe = async (recipeToLog: GenerateDetailedRecipeOutput | null, source: 'generate' | 'fridge') => {
    if (!user) {
      toast({ title: "Login Required", description: "Please log in to save this meal to your food log.", variant: "destructive" });
      return;
    }
    if (!recipeToLog) {
      toast({ title: "No Recipe", description: "Please generate a recipe first.", variant: "destructive" });
      return;
    }

    if (source === 'generate') setIsLoggingGeneratedRecipe(true);
    if (source === 'fridge') setIsLoggingFromIngredientsRecipe(true);

    try {
      const foodLogEntry: Omit<FoodLog, 'id' | 'userId'> = {
        foodItem: recipeToLog.recipeName,
        quantity: `1 serving (original recipe for ${recipeToLog.servings})`,
        calories: recipeToLog.macrosPerServing.calories,
        protein: recipeToLog.macrosPerServing.protein,
        carbs: recipeToLog.macrosPerServing.carbs,
        fat: recipeToLog.macrosPerServing.fat,
        loggedAt: serverTimestamp(),
      };

      const foodLogWithUser: Omit<FoodLog, 'id'> = { ...foodLogEntry, userId: user.uid };
      await addDoc(collection(db, 'users', user.uid, 'foodLogs'), foodLogWithUser);
      toast({ title: "Meal Logged!", description: `${recipeToLog.recipeName} (1 serving) added to your food log.` });
    } catch (error: any) {
      console.error("Error logging recipe to Firestore:", error);
      toast({ title: "Logging Failed", description: error.message || "Could not log this meal.", variant: "destructive" });
    } finally {
      if (source === 'generate') setIsLoggingGeneratedRecipe(false);
      if (source === 'fridge') setIsLoggingFromIngredientsRecipe(false);
    }
  };

  const handleLogAdaptedRecipe = async (macros: RecipeMacros, recipeName: string, servingsFromRecipe: number) => {
    if (!user) {
      toast({ title: "Login Required", description: "Please log in to save this meal.", variant: "destructive" });
      return;
    }
    setIsLoggingAdaptedRecipe(true);
    try {
      const foodLogEntry: Omit<FoodLog, 'id' | 'userId'> = {
        foodItem: recipeName,
        quantity: `1 serving (adapted from recipe for ${servingsFromRecipe})`,
        calories: macros.calories,
        protein: macros.protein,
        carbs: macros.carbs,
        fat: macros.fat,
        loggedAt: serverTimestamp(),
      };
      const foodLogWithUser: Omit<FoodLog, 'id'> = { ...foodLogEntry, userId: user.uid };
      await addDoc(collection(db, 'users', user.uid, 'foodLogs'), foodLogWithUser);
      toast({ title: "Meal Logged!", description: `${recipeName} (1 serving of adapted recipe) added to your food log.` });
    } catch (error: any) {
      console.error("Error logging adapted recipe:", error);
      toast({ title: "Logging Failed", description: error.message || "Could not log this adapted meal.", variant: "destructive" });
    } finally {
      setIsLoggingAdaptedRecipe(false);
    }
  };


  const handleAdaptRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log(`[RecipeGeneratorPage] handleAdaptRecipe called. canUseFeature: ${canUseFeature}, isPremium: ${isPremium}, trialDaysRemaining: ${trialDaysRemaining}`);
     if (!canUseFeature && !isPremium && trialDaysRemaining <= 0) {
      toast({ title: "Limit Reached", description: "You've used all your free adaptations. Upgrade or start a trial!", variant: "destructive" });
      return;
    }
    incrementUsageAndCheckLimit();

    setIsLoadingAdaptation(true);
    setAdaptationError(null);
    setAdaptedRecipeOutput(null);

    if (!originalRecipeText.trim()) {
        setAdaptationError("Original recipe text cannot be empty.");
        toast({ title: 'Input Error', description: "Please provide the original recipe text.", variant: 'destructive' });
        setIsLoadingAdaptation(false);
        return;
    }

    const inputForAI: AdaptRecipeInput = {
        originalRecipeText,
        adaptationGoal: adaptationFormState.adaptationGoal || "makeKeto",
        specificIngredientToSubstitute: adaptationFormState.adaptationGoal === "suggestSubstitutions" ? specificIngredientToSubstitute : undefined,
        preferredSubstitution: preferredSubstitution || undefined,
        dietaryRestrictions: additionalDietaryRestrictions.split(',').map(s => s.trim()).filter(Boolean),
        servings: adaptationFormState.servings || 2,
    };

    try {
      const result = await adaptRecipe(inputForAI);
      setAdaptedRecipeOutput(result);
    } catch (e: any) {
      console.error("Error adapting recipe:", e);
      const errorMessage = e.message || "Failed to adapt recipe. Chef Ath might be stumped. Please check the recipe and try again.";
      setAdaptationError(errorMessage);
      toast({ title: 'Recipe Adaptation Failed', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsLoadingAdaptation(false);
    }
  };

  const handleGenerateFromIngredients = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log(`[RecipeGeneratorPage] handleGenerateFromIngredients called. canUseFeature: ${canUseFeature}, isPremium: ${isPremium}, trialDaysRemaining: ${trialDaysRemaining}`);
     if (!canUseFeature && !isPremium && trialDaysRemaining <= 0) {
      toast({ title: "Limit Reached", description: "You've used all your free 'Fridge' generations. Upgrade or start a trial!", variant: "destructive" });
      return;
    }
    incrementUsageAndCheckLimit();

    setIsLoadingFromIngredients(true);
    setFromIngredientsError(null);
    setFromIngredientsRecipe(null);

    if (!availableFridgeIngredients.trim()) {
        setFromIngredientsError("Please list some available ingredients.");
        toast({ title: 'Input Error', description: "Please provide at least one ingredient you have.", variant: 'destructive' });
        setIsLoadingFromIngredients(false);
        return;
    }

    const inputForAI: GenerateRecipeFromIngredientsInput = {
      availableIngredients: availableFridgeIngredients.split(',').map(s => s.trim()).filter(Boolean),
      dietaryPreference: fromIngredientsFormState.dietaryPreference || "Keto",
      cuisinePreference: fromIngredientsFormState.cuisinePreference || "Any",
      mealType: fromIngredientsFormState.mealType || "Any",
      servings: fromIngredientsFormState.servings || 2,
      specificRequests: fromIngredientsFormState.specificRequests,
      excludedIngredients: excludedFridgeIngredients.split(',').map(s => s.trim()).filter(Boolean),
    };

    if (inputForAI.availableIngredients.length === 0) {
        setFromIngredientsError("Please list some available ingredients.");
        toast({ title: 'Input Error', description: "Available ingredients list cannot be empty after parsing.", variant: 'destructive' });
        setIsLoadingFromIngredients(false);
        return;
    }

    try {
      const recipe = await generateRecipeFromIngredients(inputForAI);
      setFromIngredientsRecipe(recipe);
    } catch (e: any) {
      console.error("Error generating recipe from ingredients:", e);
      const errorMessage = e.message || "Failed to generate recipe from your ingredients. Chef Ath might be busy. Please try again.";
      setFromIngredientsError(errorMessage);
      toast({ title: 'Recipe Generation Failed', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsLoadingFromIngredients(false);
    }
  };

  const startTrial = () => {
    console.log("[RecipeGeneratorPage] Starting 3-day trial.");
    setTrialDaysRemaining(3); 
    setTrialAvailable(false); 
    toast({ title: "Premium Trial Started!", description: "Enjoy full access to Recipe Genie for 3 days." });
  };

  const currentActiveTabDefault = "generate";
  const isLoadingAnyFeature = isLoadingGeneration || isLoadingAdaptation || isLoadingFromIngredients;

  if (authLoading) {
     console.log("[RecipeGeneratorPage] Auth loading. Rendering full page skeleton.");
     return (
      <AppLayout>
        <div className="container mx-auto py-8 px-4 flex justify-center items-center h-[calc(100vh-150px)]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }
  
  const renderFreemiumHeader = () => {
    if (isPremium) {
      console.log("[RecipeGeneratorPage] Render Freemium Header: User IS Premium.");
      return (
        <Alert variant="default" className="mb-6 max-w-3xl mx-auto bg-green-50 border-green-300 text-green-700">
          <Gem className="h-5 w-5 text-green-600" />
          <AlertTitle className="font-semibold">Premium Access Active!</AlertTitle>
          <AlertDescription>You have unlimited access to all Recipe Genie features. Enjoy!</AlertDescription>
        </Alert>
      );
    }
    if (trialDaysRemaining > 0) {
      console.log(`[RecipeGeneratorPage] Render Freemium Header: Trial active, ${trialDaysRemaining} days remaining.`);
      return (
        <Alert variant="default" className="mb-6 max-w-3xl mx-auto bg-blue-50 border-blue-300 text-blue-700">
          <Zap className="h-5 w-5 text-blue-600" />
          <AlertTitle className="font-semibold">Premium Trial Active: {trialDaysRemaining} days remaining!</AlertTitle>
          <AlertDescription>Enjoy full access to the Recipe Genie during your trial.</AlertDescription>
        </Alert>
      );
    }
    if (freeGenerationsLeft > 0) {
      console.log(`[RecipeGeneratorPage] Render Freemium Header: Free tier, ${freeGenerationsLeft} generations left.`);
      return (
        <Alert variant="default" className="mb-6 max-w-3xl mx-auto bg-orange-50 border-orange-300 text-orange-700">
          <Info className="h-5 w-5 text-orange-600" />
          <AlertTitle className="font-semibold">Recipe Genie - Free Tier</AlertTitle>
          <AlertDescription>You have {freeGenerationsLeft} free AI recipe generations left this month. Upgrade for unlimited access!</AlertDescription>
        </Alert>
      );
    }
    console.log("[RecipeGeneratorPage] Render Freemium Header: No specific header (likely limits reached, no trial).");
    return null; 
  };


  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4">
        {renderFreemiumHeader()}

        {!canUseFeature && !isPremium && trialDaysRemaining <= 0 && (
           console.log("[RecipeGeneratorPage] Render: CANNOT use feature, NOT premium, NO trial. Showing UpgradePrompt and Trial Button."),
          <div className="max-w-3xl mx-auto mb-6">
            <UpgradePrompt
                featureName="Recipe Genie"
                message="You've used all your free AI recipe generations. Upgrade to Premium for unlimited access, or start a free trial!"
            />
            {trialAvailable && (
                <Button onClick={startTrial} size="lg" className="w-full mt-4">
                    <Sparkles className="mr-2 h-5 w-5" /> Start 3-Day Free Trial
                </Button>
            )}
          </div>
        )}


        <Tabs defaultValue={currentActiveTabDefault} className="max-w-3xl mx-auto mt-6">
          <TabsList className="flex flex-wrap w-full h-auto sm:h-10 gap-1 mb-6 p-1 rounded-md bg-muted text-muted-foreground">
            <TabsTrigger value="generate" className="flex-1 min-w-[150px] sm:flex-auto">
                <CopyCheck className="hidden sm:inline-block mr-2 h-5 w-5" />Generate New
            </TabsTrigger>
            <TabsTrigger value="fridge" className="flex-1 min-w-[150px] sm:flex-auto">
                <Refrigerator className="hidden sm:inline-block mr-2 h-5 w-5" />What's In My Fridge?
            </TabsTrigger>
            <TabsTrigger value="adapt" className="flex-1 min-w-[150px] sm:flex-auto">
                <GitFork className="hidden sm:inline-block mr-2 h-5 w-5" />Adapt Existing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate">
            <Card className="shadow-xl">
              <CardHeader className="text-center">
                <Utensils className="mx-auto h-12 w-12 text-primary mb-2" />
                <CardTitle className="text-3xl font-headline text-primary">Chef Ath's Recipe Genie</CardTitle>
                <CardDescription>
                  Tell Chef Ath your preferences, and get a custom Keto-focused recipe!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleGenerateRecipe} className="space-y-6">
                  {/* Form fields for Generate New Recipe */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="dietaryPreference">Dietary Preference</Label>
                      <Select name="dietaryPreference" value={generationFormState.dietaryPreference} onValueChange={handleGenerationSelectChange('dietaryPreference')} disabled={isLoadingAnyFeature || authLoading}>
                        <SelectTrigger id="dietaryPreference"><SelectValue placeholder="Select diet" /></SelectTrigger>
                        <SelectContent>
                          {dietaryPreferences.map(dp => <SelectItem key={dp} value={dp}>{dp}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cuisinePreference">Cuisine Preference</Label>
                      <Input id="cuisinePreference" name="cuisinePreference" placeholder="e.g., Italian, Singaporean Local, Any" value={generationFormState.cuisinePreference || ''} onChange={handleGenerationInputChange} disabled={isLoadingAnyFeature || authLoading} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="mealType">Meal Type</Label>
                      <Select name="mealType" value={generationFormState.mealType} onValueChange={handleGenerationSelectChange('mealType')} disabled={isLoadingAnyFeature || authLoading}>
                        <SelectTrigger id="mealType"><SelectValue placeholder="Select meal type" /></SelectTrigger>
                        <SelectContent>
                          {mealTypes.map(mt => <SelectItem key={mt} value={mt}>{mt}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cookingTimePreference">Cooking Time</Label>
                      <Select name="cookingTimePreference" value={generationFormState.cookingTimePreference} onValueChange={handleGenerationSelectChange('cookingTimePreference')} disabled={isLoadingAnyFeature || authLoading}>
                        <SelectTrigger id="cookingTimePreference"><SelectValue placeholder="Select cooking time" /></SelectTrigger>
                        <SelectContent>
                          {cookingTimes.map(ct => <SelectItem key={ct} value={ct}>{ct}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mainIngredients">Main Ingredients to Feature (comma-separated, optional)</Label>
                    <Input id="mainIngredients" name="mainIngredients" placeholder="e.g., chicken breast, broccoli, eggs" value={mainIngredients} onChange={(e) => setMainIngredients(e.target.value)} disabled={isLoadingAnyFeature || authLoading} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="excludedIngredients">Ingredients to Exclude (comma-separated, optional)</Label>
                    <Input id="excludedIngredients" name="excludedIngredients" placeholder="e.g., nuts, mushrooms" value={excludedIngredients} onChange={(e) => setExcludedIngredients(e.target.value)} disabled={isLoadingAnyFeature || authLoading} />
                  </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="spiceLevel" className="flex items-center">
                            <Flame className="mr-2 h-4 w-4 text-muted-foreground" />
                            Spice Level
                        </Label>
                        <Select name="spiceLevel" value={generationFormState.spiceLevel} onValueChange={handleGenerationSelectChange('spiceLevel')} disabled={isLoadingAnyFeature || authLoading}>
                            <SelectTrigger id="spiceLevel"><SelectValue placeholder="Select spice level" /></SelectTrigger>
                            <SelectContent>
                            {spiceLevels.map(sl => <SelectItem key={sl} value={sl}>{sl}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="servings">Number of Servings</Label>
                        <Input id="servings" name="servings" type="number" min="1" max="12" value={generationFormState.servings || ''} onChange={handleGenerationNumberInputChange} disabled={isLoadingAnyFeature || authLoading} />
                        <p className="text-xs text-muted-foreground">Note: Logging will always be for 1 serving's macros.</p>
                    </div>
                  </div>
                  <div className="space-y-2 flex items-center">
                    <Checkbox
                        id="ensureHalal"
                        checked={generationFormState.ensureHalal}
                        onCheckedChange={(checked) => handleGenerationCheckboxChange('ensureHalal')(!!checked)}
                        disabled={isLoadingAnyFeature || authLoading}
                    />
                    <Label htmlFor="ensureHalal" className="ml-2 font-normal flex items-center cursor-pointer">
                        <ShieldCheck className="mr-1.5 h-4 w-4 text-muted-foreground" />
                        Ensure Halal Compliance
                    </Label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="specificRequests">Other Specific Requests / Notes</Label>
                    <Textarea id="specificRequests" name="specificRequests" placeholder="e.g., one-pan meal, air fryer friendly, make it Halal, use local herbs" value={generationFormState.specificRequests || ''} onChange={handleGenerationInputChange} disabled={isLoadingAnyFeature || authLoading} />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoadingAnyFeature || authLoading || (!isPremium && trialDaysRemaining <=0 && freeGenerationsLeft <= 0)}>
                    {isLoadingGeneration ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Brain className="mr-2 h-5 w-5" />}
                    {isLoadingGeneration ? 'Chef Ath is Thinking...' : 'Generate My Recipe!'}
                  </Button>
                </form>
              </CardContent>
            </Card>
            {isLoadingGeneration && <RecipeGeneratorSkeleton />}
            {generationError && !isLoadingGeneration && (
              <Alert variant="destructive" className="mt-8">
                <AlertCircle className="h-5 w-5" />
                <AlertTitle>Oops! Something went wrong with generation.</AlertTitle>
                <AlertDescription>{generationError}</AlertDescription>
              </Alert>
            )}
            {generatedRecipe && !isLoadingGeneration && (
              <GeneratedRecipeDisplay
                recipe={generatedRecipe}
                onLogRecipe={(recipe) => handleLogRecipe(recipe, 'generate')}
                isLoggingRecipe={isLoggingGeneratedRecipe}
                recipeSource="generate"
              />
            )}
          </TabsContent>

          <TabsContent value="fridge">
            <Card className="shadow-xl">
              <CardHeader className="text-center">
                <Refrigerator className="mx-auto h-12 w-12 text-primary mb-2" />
                <CardTitle className="text-3xl font-headline text-primary">What's In My Fridge?</CardTitle>
                <CardDescription>
                  List your available ingredients, and Chef Ath will whip up a Keto recipe!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleGenerateFromIngredients} className="space-y-6">
                  {/* Form fields for What's In My Fridge? */}
                   <div className="space-y-2">
                    <Label htmlFor="availableFridgeIngredients">Available Ingredients (comma-separated)</Label>
                    <Textarea
                        id="availableFridgeIngredients"
                        name="availableFridgeIngredients"
                        placeholder="e.g., chicken thighs, spinach, eggs, cheese, olive oil"
                        value={availableFridgeIngredients}
                        onChange={(e) => setAvailableFridgeIngredients(e.target.value)}
                        rows={4}
                        disabled={isLoadingAnyFeature || authLoading}
                        required
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="fridgeDietaryPreference">Dietary Preference</Label>
                      <Select name="dietaryPreference" value={fromIngredientsFormState.dietaryPreference} onValueChange={handleFromIngredientsSelectChange('dietaryPreference')} disabled={isLoadingAnyFeature || authLoading}>
                        <SelectTrigger id="fridgeDietaryPreference"><SelectValue placeholder="Select diet" /></SelectTrigger>
                        <SelectContent>
                          {dietaryPreferences.map(dp => <SelectItem key={dp} value={dp}>{dp}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fridgeCuisinePreference">Cuisine Preference</Label>
                      <Input id="fridgeCuisinePreference" name="cuisinePreference" placeholder="e.g., Quick & Easy, Asian, Any" value={fromIngredientsFormState.cuisinePreference || ''} onChange={handleFromIngredientsInputChange} disabled={isLoadingAnyFeature || authLoading} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-2">
                      <Label htmlFor="fridgeMealType">Meal Type</Label>
                      <Select name="mealType" value={fromIngredientsFormState.mealType} onValueChange={handleFromIngredientsSelectChange('mealType')} disabled={isLoadingAnyFeature || authLoading}>
                        <SelectTrigger id="fridgeMealType"><SelectValue placeholder="Select meal type" /></SelectTrigger>
                        <SelectContent>
                          {mealTypes.map(mt => <SelectItem key={mt} value={mt}>{mt}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fridgeServings">Number of Servings</Label>
                      <Input id="fridgeServings" name="servings" type="number" min="1" max="12" value={fromIngredientsFormState.servings || ''} onChange={handleFromIngredientsNumberInputChange} disabled={isLoadingAnyFeature || authLoading}/>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="excludedFridgeIngredients">Ingredients to Strictly Exclude (comma-separated, optional)</Label>
                    <Input id="excludedFridgeIngredients" name="excludedFridgeIngredients" placeholder="e.g., nuts, mushrooms, dairy" value={excludedFridgeIngredients} onChange={(e) => setExcludedFridgeIngredients(e.target.value)} disabled={isLoadingAnyFeature || authLoading} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fridgeSpecificRequests">Other Specific Requests / Notes</Label>
                    <Textarea id="fridgeSpecificRequests" name="specificRequests" placeholder="e.g., quick meal, spicy, use air fryer" value={fromIngredientsFormState.specificRequests || ''} onChange={handleFromIngredientsInputChange} disabled={isLoadingAnyFeature || authLoading} />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoadingAnyFeature || authLoading || (!isPremium && trialDaysRemaining <=0 && freeGenerationsLeft <= 0)}>
                    {isLoadingFromIngredients ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Brain className="mr-2 h-5 w-5" />}
                    {isLoadingFromIngredients ? 'Chef Ath is Inventing...' : 'Generate Recipe From My Ingredients!'}
                  </Button>
                </form>
              </CardContent>
            </Card>
            {isLoadingFromIngredients && <RecipeGeneratorSkeleton />}
            {fromIngredientsError && !isLoadingFromIngredients && (
              <Alert variant="destructive" className="mt-8">
                <AlertCircle className="h-5 w-5" />
                <AlertTitle>Oops! Something went wrong with this generation.</AlertTitle>
                <AlertDescription>{fromIngredientsError}</AlertDescription>
              </Alert>
            )}
            {fromIngredientsRecipe && !isLoadingFromIngredients && (
              <GeneratedRecipeDisplay
                recipe={fromIngredientsRecipe}
                onLogRecipe={(recipe) => handleLogRecipe(recipe, 'fridge')}
                isLoggingRecipe={isLoggingFromIngredientsRecipe}
                recipeSource="fridge"
              />
            )}
          </TabsContent>

          <TabsContent value="adapt">
            <Card className="shadow-xl">
              <CardHeader className="text-center">
                <GitFork className="mx-auto h-12 w-12 text-secondary mb-2" />
                <CardTitle className="text-3xl font-headline text-secondary">Adapt Existing Recipe</CardTitle>
                <CardDescription>
                  Have a recipe? Let Chef Ath adapt it for your needs (Keto, Halal, etc.) or suggest substitutions!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAdaptRecipe} className="space-y-6">
                    {/* Form fields for Adapt Existing Recipe */}
                    <div className="space-y-2">
                        <Label htmlFor="originalRecipeText">Original Recipe Text</Label>
                        <Textarea
                            id="originalRecipeText"
                            name="originalRecipeText"
                            placeholder="Paste your full recipe here (ingredients and instructions)..."
                            value={originalRecipeText}
                            onChange={(e) => setOriginalRecipeText(e.target.value)}
                            rows={10}
                            disabled={isLoadingAnyFeature || authLoading}
                            required
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="adaptationGoal">Adaptation Goal</Label>
                            <Select
                                name="adaptationGoal"
                                value={adaptationFormState.adaptationGoal}
                                onValueChange={handleAdaptationSelectChange('adaptationGoal')}
                                disabled={isLoadingAnyFeature || authLoading}
                            >
                                <SelectTrigger id="adaptationGoal"><SelectValue placeholder="Select adaptation goal" /></SelectTrigger>
                                <SelectContent>
                                {adaptationGoals.map(goal => <SelectItem key={goal.value} value={goal.value}>{goal.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="adaptServings">Desired Servings (for adapted recipe)</Label>
                            <Input
                                id="adaptServings"
                                name="servings"
                                type="number"
                                min="1" max="12"
                                value={adaptationFormState.servings || ''}
                                onChange={handleAdaptationNumberInputChange}
                                disabled={isLoadingAnyFeature || authLoading}
                            />
                        </div>
                    </div>
                    {adaptationFormState.adaptationGoal === "suggestSubstitutions" && (
                        <div className="space-y-2">
                            <Label htmlFor="specificIngredientToSubstitute">Ingredient to Substitute</Label>
                            <Input
                                id="specificIngredientToSubstitute"
                                name="specificIngredientToSubstitute"
                                placeholder="e.g., all-purpose flour, sugar"
                                value={specificIngredientToSubstitute}
                                onChange={(e) => setSpecificIngredientToSubstitute(e.target.value)}
                                disabled={isLoadingAnyFeature || authLoading}
                            />
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="preferredSubstitution">Preferred Substitution (Optional)</Label>
                        <Input
                            id="preferredSubstitution"
                            name="preferredSubstitution"
                            placeholder="e.g., almond flour, erythritol"
                            value={preferredSubstitution}
                            onChange={(e) => setPreferredSubstitution(e.target.value)}
                            disabled={isLoadingAnyFeature || authLoading}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="additionalDietaryRestrictions">Additional Dietary Restrictions (comma-separated, optional)</Label>
                        <Input
                            id="additionalDietaryRestrictions"
                            name="additionalDietaryRestrictions"
                            placeholder="e.g., dairy-free, nut-free"
                            value={additionalDietaryRestrictions}
                            onChange={(e) => setAdditionalDietaryRestrictions(e.target.value)}
                            disabled={isLoadingAnyFeature || authLoading}
                        />
                    </div>
                  <Button type="submit" className="w-full" disabled={isLoadingAnyFeature || authLoading || (!isPremium && trialDaysRemaining <=0 && freeGenerationsLeft <= 0)}>
                    {isLoadingAdaptation ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Brain className="mr-2 h-5 w-5" />}
                    {isLoadingAdaptation ? 'Chef Ath is Adapting...' : 'Adapt My Recipe!'}
                  </Button>
                </form>
              </CardContent>
            </Card>
            {isLoadingAdaptation && <RecipeAdaptationSkeleton />}
            {adaptationError && !isLoadingAdaptation && (
              <Alert variant="destructive" className="mt-8">
                <AlertCircle className="h-5 w-5" />
                <AlertTitle>Oops! Something went wrong with adaptation.</AlertTitle>
                <AlertDescription>{adaptationError}</AlertDescription>
              </Alert>
            )}
            {adaptedRecipeOutput && !isLoadingAdaptation && (
              <AdaptedRecipeDisplay
                adaptedRecipe={adaptedRecipeOutput}
                onLogAdaptedRecipe={handleLogAdaptedRecipe}
                isLoggingAdaptedRecipe={isLoggingAdaptedRecipe}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

    
