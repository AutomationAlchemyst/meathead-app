
'use client';

import type { ReactElement } from 'react';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import WorkoutPlanForm from '@/components/workout-planner/WorkoutPlanForm';
import WorkoutPlanDisplay from '@/components/workout-planner/WorkoutPlanDisplay';
import type { GenerateWorkoutPlanInput, GenerateWorkoutPlanOutput, AdaptWorkoutScheduleInput, AdaptWorkoutScheduleOutput } from '@/ai/schemas/workout-schemas'; 
import { generateWorkoutPlan } from '@/ai/flows/generate-workout-plan-flow';
import { adaptWorkoutSchedule } from '@/ai/flows/adapt-workout-schedule-flow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dumbbell, AlertCircle, Loader2, Gem, Zap, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import WorkoutPlanSkeleton from '@/components/workout-planner/WorkoutPlanSkeleton';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import UpgradePrompt from '@/components/premium/UpgradePrompt';
import { Button } from '@/components/ui/button';

const MAX_FREE_PLAN_GENERATIONS = 1; // Max free AI plan generations per session (simulated)

export default function WorkoutPlannerPage(): ReactElement {
  const { user, userProfile, setUserProfile: updateUserProfileInContext, loading: authLoading, isPremium } = useAuth();
  const [workoutPlan, setWorkoutPlan] = useState<GenerateWorkoutPlanOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false); 
  const [initialLoading, setInitialLoading] = useState(true); 
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Freemium simulation state for Plan Generation
  const [generationTrialDaysRemaining, setGenerationTrialDaysRemaining] = useState(0);
  const [monthlyFreePlanGenerationsUsed, setMonthlyFreePlanGenerationsUsed] = useState(0);
  const [generationTrialAvailable, setGenerationTrialAvailable] = useState(true);

  const canGenerateNewPlan = isPremium || generationTrialDaysRemaining > 0 || monthlyFreePlanGenerationsUsed < MAX_FREE_PLAN_GENERATIONS;
  const freePlanGenerationsLeft = MAX_FREE_PLAN_GENERATIONS - monthlyFreePlanGenerationsUsed;
  // Adaptation is stricter: premium or an active (generation) trial. Free generations don't cover adaptation.
  const canAdaptCurrentPlan = isPremium || generationTrialDaysRemaining > 0;


  useEffect(() => {
    if (!authLoading && userProfile) {
      if (userProfile.activeWorkoutPlan) {
        setWorkoutPlan(userProfile.activeWorkoutPlan);
      }
      setInitialLoading(false);
    } else if (!authLoading && !userProfile) {
      setInitialLoading(false);
    }
  }, [userProfile, authLoading]);

  const incrementPlanGenerationUsage = () => {
    if (!isPremium && generationTrialDaysRemaining <= 0) {
      setMonthlyFreePlanGenerationsUsed(prev => prev + 1);
    }
  };

  const startGenerationTrial = () => {
    setGenerationTrialDaysRemaining(3); 
    setGenerationTrialAvailable(false); 
    toast({ title: "Premium Trial Started!", description: "Enjoy full AI workout planning features for 3 days." });
  };


  const handleGeneratePlan = async (input: GenerateWorkoutPlanInput) => {
    if (!user) {
      toast({ title: "Not Logged In", description: "Please log in to generate a workout plan.", variant: "destructive" });
      return;
    }
    if (!canGenerateNewPlan) {
        toast({ title: "Limit Reached", description: "Upgrade to Premium or start a trial for more AI workout plans.", variant: "destructive" });
        return;
    }
    incrementPlanGenerationUsage();
    
    setIsLoading(true);
    setError(null);

    try {
      const plan = await generateWorkoutPlan(input);
      setWorkoutPlan(plan);

      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        activeWorkoutPlan: plan,
        updatedAt: serverTimestamp()
      });

      if (updateUserProfileInContext && userProfile) {
        updateUserProfileInContext({ ...userProfile, activeWorkoutPlan: plan, updatedAt: serverTimestamp() });
      }
      
      toast({
        title: "Workout Plan Generated & Saved!",
        description: "Coach Ath has designed and saved your personalized plan.",
      });
    } catch (e: any) {
      const errorMessage = e.message || "Failed to generate workout plan. Coach Ath might be taking a nap.";
      setError(errorMessage);
      setWorkoutPlan(initialLoading ? null : workoutPlan); 
      toast({ title: 'Workout Plan Generation Failed', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdaptPlan = async (missedDayNumber: number, currentPlan: GenerateWorkoutPlanOutput) => {
    if (!user || !userProfile) {
      toast({ title: "Error", description: "User or profile data not available for adaptation.", variant: "destructive" });
      return;
    }
    if (!canAdaptCurrentPlan) {
      toast({ title: "Premium Feature", description: "Adapting workout plans is a premium feature. Upgrade or start a trial to use it.", variant: "destructive" });
      return;
    }
    if (!currentPlan.originalFitnessLevel || !currentPlan.originalPrimaryGoal) {
      toast({ title: "Error", description: "Original plan context (fitness level/goal) missing. Cannot adapt.", variant: "destructive" });
      return;
    }

    setIsLoading(true); 
    setError(null);

    const adaptationInput: AdaptWorkoutScheduleInput = {
      originalPlan: currentPlan,
      missedDayNumber: missedDayNumber,
      fitnessLevel: currentPlan.originalFitnessLevel,
      primaryGoal: currentPlan.originalPrimaryGoal,
    };

    try {
      const adaptedOutput: AdaptWorkoutScheduleOutput = await adaptWorkoutSchedule(adaptationInput);
      const newAdaptedPlan: GenerateWorkoutPlanOutput = {
        planName: adaptedOutput.adaptedPlanName,
        planDurationDays: currentPlan.planDurationDays, 
        introduction: currentPlan.introduction, 
        dailyWorkouts: adaptedOutput.updatedDailyWorkouts,
        overallNotes: adaptedOutput.overallNotes || [],
        originalFitnessLevel: currentPlan.originalFitnessLevel, 
        originalPrimaryGoal: currentPlan.originalPrimaryGoal,   
      };
      setWorkoutPlan(newAdaptedPlan);
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { activeWorkoutPlan: newAdaptedPlan, updatedAt: serverTimestamp() });
      if (updateUserProfileInContext) {
        updateUserProfileInContext({ ...userProfile, activeWorkoutPlan: newAdaptedPlan, updatedAt: serverTimestamp() });
      }
      toast({ title: "Workout Plan Adapted!", description: adaptedOutput.adaptationSummary || "Your plan has been adjusted.", duration: 7000 });
    } catch (e: any) {
      const errorMessage = e.message || "Failed to adapt workout plan. Coach Ath might be puzzled.";
      setError(errorMessage);
      toast({ title: 'Workout Plan Adaptation Failed', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const displaySkeleton = initialLoading || (isLoading && !workoutPlan && !error); 

  const renderFreemiumHeader = () => {
    if (isPremium) {
      return (
        <Alert variant="default" className="mb-6 bg-green-50 border-green-300 text-green-700 text-sm">
          <Gem className="h-4 w-4 text-green-600" />
          <AlertTitle className="font-semibold">Premium Workout Planner Active!</AlertTitle>
          <AlertDescription>Unlimited AI plan generation and adaptation.</AlertDescription>
        </Alert>
      );
    }
    if (generationTrialDaysRemaining > 0) {
      return (
        <Alert variant="default" className="mb-6 bg-blue-50 border-blue-300 text-blue-700 text-sm">
          <Zap className="h-4 w-4 text-blue-600" />
          <AlertTitle className="font-semibold">Workout Planner Trial: {generationTrialDaysRemaining} days remaining!</AlertTitle>
          <AlertDescription>Full AI generation and adaptation capabilities unlocked.</AlertDescription>
        </Alert>
      );
    }
    if (freePlanGenerationsLeft > 0) {
      return (
        <Alert variant="default" className="mb-6 bg-orange-50 border-orange-300 text-orange-700 text-sm">
          <Sparkles className="h-4 w-4 text-orange-600" />
          <AlertTitle className="font-semibold">AI Workout Plan Generator</AlertTitle>
          <AlertDescription>You have {freePlanGenerationsLeft} free AI plan generation(s) left this session. Adaptation is a premium feature.</AlertDescription>
        </Alert>
      );
    }
    // If no free generations left and no trial, the form itself will be replaced by UpgradePrompt
    return null; 
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {renderFreemiumHeader()}

          {!canGenerateNewPlan && !isPremium && generationTrialDaysRemaining <= 0 && (
             <div className="mb-6">
               <UpgradePrompt
                   featureName="AI Workout Planner"
                   message="You've used your free AI plan generation. Upgrade to Premium or start a trial for unlimited personalized workout plans and adaptation!"
               />
               {generationTrialAvailable && (
                   <Button onClick={startGenerationTrial} size="lg" className="w-full mt-4">
                       <Sparkles className="mr-2 h-5 w-5" /> Start 3-Day Free Trial for Workout Planner
                   </Button>
               )}
             </div>
           )}

          {canGenerateNewPlan && (
            <Card className="shadow-xl mb-8">
              <CardHeader className="text-center">
                <Dumbbell className="mx-auto h-12 w-12 text-primary mb-2" />
                <CardTitle className="text-3xl font-headline text-primary">Personalized Workout Planner</CardTitle>
                <CardDescription>
                  Let Coach Ath design your plan. Missed a day? Coach can adapt it too! Your last plan is saved.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WorkoutPlanForm 
                    onSubmit={handleGeneratePlan} 
                    isLoading={isLoading || initialLoading}
                    canGenerate={canGenerateNewPlan}
                    freeGenerationsLeft={isPremium || generationTrialDaysRemaining > 0 ? Infinity : freePlanGenerationsLeft}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {displaySkeleton && <WorkoutPlanSkeleton />}

        {error && !isLoading && !initialLoading && (
          <Alert variant="destructive" className="mt-8 max-w-4xl mx-auto">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>Oops! An Error Occurred</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {workoutPlan && !displaySkeleton && (
          <div className="mt-8">
            <WorkoutPlanDisplay 
              plan={workoutPlan} 
              onAdaptPlan={handleAdaptPlan}
              isAdaptingPlan={isLoading}
              canAdaptPlan={canAdaptCurrentPlan} // Pass the ability to adapt
            />
          </div>
        )}
        
        {!workoutPlan && !displaySkeleton && !error && !canGenerateNewPlan && (
           <Card className="mt-8 max-w-4xl mx-auto shadow-lg">
             <CardContent className="p-10 text-center">
                <Dumbbell className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-xl font-medium text-muted-foreground">Upgrade to generate more plans.</p>
                <p className="text-sm text-muted-foreground">Your free AI plan generation limit is reached.</p>
             </CardContent>
           </Card>
        )}
         {!workoutPlan && !displaySkeleton && !error && canGenerateNewPlan && (
           <Card className="mt-8 max-w-4xl mx-auto shadow-lg">
             <CardContent className="p-10 text-center">
                <Dumbbell className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-xl font-medium text-muted-foreground">No active workout plan.</p>
                <p className="text-sm text-muted-foreground">Fill out the form above to generate your personalized plan!</p>
             </CardContent>
           </Card>
        )}
      </div>
    </AppLayout>
  );
}
    