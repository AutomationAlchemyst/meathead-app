
'use client';

// This page is effectively deprecated and replaced by /recipe-generator.
// It can be removed in a future cleanup, or kept as a simpler alternative if desired.
// For now, redirecting or showing a message might be good.
// For simplicity of this step, I will leave it as is, but the navbar now points to the new generator.

import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Brain, Utensils, Beef, Wheat, Droplets, Flame, Info, BookOpen } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { generateMealPlan, type GenerateMealPlanInput, type GenerateMealPlanOutput, type MealItem } from '@/ai/flows/generate-meal-plan-flow';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Link from 'next/link';


function MealItemDisplay({ meal, mealType }: { meal: MealItem; mealType: string }) {
  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-primary">{mealType}: {meal.name}</CardTitle>
        <CardDescription className="text-sm pt-1">{meal.description}</CardDescription>
      </CardHeader>
      <CardContent className="text-xs space-y-1 pb-4">
        <p className="flex items-center"><Flame className="h-3.5 w-3.5 mr-1.5 text-red-500" /> Calories: {meal.calories.toFixed(0)} kcal</p>
        <p className="flex items-center"><Beef className="h-3.5 w-3.5 mr-1.5 text-green-500" /> Protein: {meal.protein.toFixed(1)} g</p>
        <p className="flex items-center"><Wheat className="h-3.5 w-3.5 mr-1.5 text-yellow-500" /> Carbs: {meal.carbs.toFixed(1)} g</p>
        <p className="flex items-center"><Droplets className="h-3.5 w-3.5 mr-1.5 text-blue-500" /> Fat: {meal.fat.toFixed(1)} g</p>
        {meal.preparationNotes && (
          <Accordion type="single" collapsible className="w-full mt-3">
            <AccordionItem value="item-1" className="border-t pt-2">
              <AccordionTrigger className="text-xs py-2 hover:no-underline text-primary">
                <BookOpen className="h-3.5 w-3.5 mr-1.5" /> Show Preparation Notes
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground pt-1 pb-0">
                {meal.preparationNotes}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}

function SnackItemDisplay({ snack }: { snack: MealItem }) {
    return (
      <div className="border-b last:border-b-0 pb-3 last:pb-0">
        <h4 className="font-medium text-md">{snack.name}</h4>
        <p className="text-xs text-muted-foreground pt-0.5 pb-1">{snack.description}</p>
        <div className="text-xs space-y-0.5">
          <p className="flex items-center"><Flame className="h-3 w-3 mr-1 text-red-500" /> Calories: {snack.calories.toFixed(0)} kcal</p>
          <p className="flex items-center"><Beef className="h-3 w-3 mr-1 text-green-500" /> Protein: {snack.protein.toFixed(1)} g</p>
          <p className="flex items-center"><Wheat className="h-3 w-3 mr-1 text-yellow-500" /> Carbs: {snack.carbs.toFixed(1)} g</p>
          <p className="flex items-center"><Droplets className="h-3 w-3 mr-1 text-blue-500" /> Fat: {snack.fat.toFixed(1)} g</p>
        </div>
        {snack.preparationNotes && (
          <Accordion type="single" collapsible className="w-full mt-2">
            <AccordionItem value={`snack-prep-${snack.name}`} className="border-t pt-1">
              <AccordionTrigger className="text-xs py-1.5 hover:no-underline text-primary">
                 <BookOpen className="h-3.5 w-3.5 mr-1.5" /> Show Preparation Notes
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground pt-1 pb-0">
                {snack.preparationNotes}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </div>
    );
}


function MealPlanSkeleton() {
  return (
    <Card className="mt-6 shadow-lg">
      <CardHeader>
        <Skeleton className="h-8 w-1/2 mb-2" />
        <Skeleton className="h-4 w-3/4" />
      </CardHeader>
      <CardContent className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <Skeleton className="h-6 w-1/3 mb-1" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3 mt-1" />
            </CardHeader>
            <CardContent className="text-xs space-y-1 pb-4">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-8 w-1/3 mt-2" /> {/* Skeleton for Accordion Trigger */}
            </CardContent>
          </Card>
        ))}
         <Card>
            <CardHeader className="pb-3">
                <Skeleton className="h-6 w-1/4 mb-1" />
            </CardHeader>
            <CardContent className="space-y-2">
                <div className="border-b pb-3">
                    <Skeleton className="h-5 w-1/2 mb-1" />
                    <Skeleton className="h-3 w-full mb-1" />
                    <Skeleton className="h-3 w-1/2 mb-1" />
                    <Skeleton className="h-3 w-1/2 mb-1" />
                    <Skeleton className="h-3 w-1/2 mb-1" />
                    <Skeleton className="h-3 w-1/2 mb-1" />
                    <Skeleton className="h-7 w-1/3 mt-1.5" />
                </div>
                 <div className="pb-3">
                    <Skeleton className="h-5 w-1/2 mb-1" />
                    <Skeleton className="h-3 w-full mb-1" />
                    <Skeleton className="h-3 w-1/2 mb-1" />
                    <Skeleton className="h-3 w-1/2 mb-1" />
                    <Skeleton className="h-3 w-1/2 mb-1" />
                    <Skeleton className="h-3 w-1/2 mb-1" />
                    <Skeleton className="h-7 w-1/3 mt-1.5" />
                </div>
            </CardContent>
         </Card>
      </CardContent>
      <CardFooter>
        <Skeleton className="h-6 w-1/4" />
      </CardFooter>
    </Card>
  );
}


export default function MealPlanPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [mealPlan, setMealPlan] = useState<GenerateMealPlanOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // This page is now secondary to the new /recipe-generator.
    // You might want to add a more prominent message or redirect.
    toast({
      title: "New Feature Available!",
      description: (
        <span>
          Check out our new <Link href="/recipe-generator" className="underline text-primary">Advanced Recipe Genie</Link> for more detailed recipe generation!
        </span>
      ),
      duration: 10000,
    });
  }, [toast]);


  const handleGeneratePlan = async () => {
    setIsLoading(true);
    setError(null);
    setMealPlan(null);

    if (!user) {
      toast({ title: 'Authentication Required', description: 'Please log in to generate a meal plan.', variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    const targetCalories = userProfile?.targetCalories || 2000; // Default to 2000 if not in profile
    if (!userProfile?.targetCalories) {
        toast({ title: 'Using Default Calories', description: `No target calories set in profile. Generating plan for ${targetCalories} kcal. For a more personalized plan, please set your goals in your profile.`, variant: 'default' });
    }

    try {
      const input: GenerateMealPlanInput = { targetCalories };
      const plan = await generateMealPlan(input);
      setMealPlan(plan);
    } catch (e: any) {
      console.error("Error generating meal plan:", e);
      setError(e.message || "Failed to generate meal plan. Please try again.");
      toast({ title: 'Generation Failed', description: e.message || "An unexpected error occurred.", variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4">
        <Alert variant="default" className="mb-6 max-w-3xl mx-auto">
          <Info className="h-5 w-5" />
          <AlertTitle>Looking for More Detailed Recipes?</AlertTitle>
          <AlertDescription>
            This page provides a simple 1-day meal plan. For advanced, customizable recipe generation, please visit our new{" "}
            <Link href="/recipe-generator" className="font-semibold text-primary hover:underline">
              Recipe Genie page
            </Link>
            .
          </AlertDescription>
        </Alert>
        
        <Card className="max-w-3xl mx-auto shadow-xl bg-card">
          <CardHeader className="text-center">
            <Utensils className="mx-auto h-10 w-10 text-primary mb-1" />
            <CardTitle className="text-2xl font-headline text-primary">Simple 1-Day Keto Meal Plan</CardTitle>
            <CardDescription>
              Get a basic 1-day Keto meal plan based on your target calories.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={handleGeneratePlan} disabled={isLoading || authLoading} size="lg" className="shadow-md hover:shadow-lg transition-shadow">
              {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Brain className="mr-2 h-5 w-5" />}
              {isLoading ? 'Generating Plan...' : 'Generate Simple 1-Day Plan'}
            </Button>
          </CardContent>
        </Card>

        {isLoading && <MealPlanSkeleton />}

        {error && (
          <Alert variant="destructive" className="mt-6 max-w-3xl mx-auto">
            <Info className="h-5 w-5" />
            <AlertTitle>Error Generating Meal Plan</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {mealPlan && !isLoading && (
          <Card className="mt-6 max-w-3xl mx-auto shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold text-center text-accent">Your Simple Keto Meal Plan ({mealPlan.day})</CardTitle>
              <CardDescription className="text-center">
                Targeting approx. {userProfile?.targetCalories || 2000} kcal. Remember, these are estimates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <MealItemDisplay meal={mealPlan.breakfast} mealType="Breakfast" />
              <MealItemDisplay meal={mealPlan.lunch} mealType="Lunch" />
              <MealItemDisplay meal={mealPlan.dinner} mealType="Dinner" />
              
              {mealPlan.snacks && mealPlan.snacks.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg font-semibold text-primary">Snacks</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {mealPlan.snacks.map((snack, index) => (
                           <SnackItemDisplay key={index} snack={snack} />
                        ))}
                    </CardContent>
                </Card>
              )}
            </CardContent>
            <CardFooter className="flex flex-col items-center space-y-2 pt-4 border-t">
              <p className="text-sm font-semibold text-primary">Daily Totals:</p>
              <div className="text-xs text-center grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1">
                <span><Flame className="inline h-3.5 w-3.5 mr-1 text-red-500" />Cal: {mealPlan.totalCalories.toFixed(0)} kcal</span>
                <span><Beef className="inline h-3.5 w-3.5 mr-1 text-green-500" />Prot: {mealPlan.totalProtein.toFixed(1)} g</span>
                <span><Wheat className="inline h-3.5 w-3.5 mr-1 text-yellow-500" />Carb: {mealPlan.totalCarbs.toFixed(1)} g</span>
                <span><Droplets className="inline h-3.5 w-3.5 mr-1 text-blue-500" />Fat: {mealPlan.totalFat.toFixed(1)} g</span>
              </div>
              <p className="text-xs text-muted-foreground pt-2">This meal plan is system-generated. Consult with a healthcare professional for personalized advice.</p>
            </CardFooter>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

    