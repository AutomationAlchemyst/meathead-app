'use client';

import type { ReactElement } from 'react';
import { useState, useEffect } from 'react';
import type { GenerateWorkoutPlanOutput, DailyWorkout, Exercise } from '@/ai/schemas/workout-schemas';
import { Card, CardContent, CardDescription, CardHeader, CardFooter, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CalendarDays, Zap, Moon, Dumbbell, Info, ShieldAlert, CheckCircle, Loader2, Youtube, HelpCircle, Activity as ActivityIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
// --- THE FIX ---
// We explicitly import Timestamp to use Timestamp.now()
import { collection, addDoc, query, where, getDocs, Timestamp, limit } from 'firebase/firestore';
import type { WorkoutLog } from '@/types';
import { updateUserStreakClientSide } from '@/lib/streakUtils';


interface WorkoutPlanDisplayProps {
  plan: GenerateWorkoutPlanOutput;
  onAdaptPlan: (missedDayNumber: number, currentPlan: GenerateWorkoutPlanOutput) => Promise<void>;
  isAdaptingPlan: boolean;
  canAdaptPlan: boolean;
}

function ExerciseDisplay({ exercise }: { exercise: Exercise }): ReactElement {
  const youtubeSearchBaseUrl = "https://www.youtube.com/results?search_query=";
  return (
    <div className="py-3 border-b border-border/50 last:border-b-0">
      <h4 className="font-semibold text-base text-primary">{exercise.name}</h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-sm mt-1">
        <p><span className="font-medium text-muted-foreground">Sets:</span> {exercise.sets}</p>
        <p><span className="font-medium text-muted-foreground">Reps:</span> {exercise.reps}</p>
        <p><span className="font-medium text-muted-foreground">Rest:</span> {exercise.restSeconds}</p>
      </div>
      {exercise.notes && <p className="text-xs text-muted-foreground mt-1.5 italic">Notes: {exercise.notes}</p>}
      {exercise.videoSearchQuery && (
        <p className="text-xs text-muted-foreground mt-1.5">
          <a
            href={`${youtubeSearchBaseUrl}${encodeURIComponent(exercise.videoSearchQuery)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-primary hover:text-primary/80 hover:underline"
          >
            <Youtube className="h-3.5 w-3.5 mr-1" /> Watch form: {exercise.videoSearchQuery}
          </a>
        </p>
      )}
    </div>
  );
}

function DailyWorkoutDisplay({
  dailyWorkout,
  plan,
  onAdaptPlan,
  isAdaptingPlanParent,
  canAdaptPlan
}: {
  dailyWorkout: DailyWorkout;
  plan: GenerateWorkoutPlanOutput;
  onAdaptPlan: (missedDayNumber: number, currentPlan: GenerateWorkoutPlanOutput) => Promise<void>;
  isAdaptingPlanParent: boolean;
  canAdaptPlan: boolean;
}): ReactElement {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLogging, setIsLogging] = useState(false);
  const [isLoggedForPlan, setIsLoggedForPlan] = useState(false);
  const [isAdaptingDay, setIsAdaptingDay] = useState(false);

  const isRestDay = dailyWorkout.focus.toLowerCase() === 'rest' || dailyWorkout.focus.toLowerCase() === 'rest day';
  const isActiveRecoveryDay = dailyWorkout.focus.toLowerCase().includes('active recovery');
  const isEffectivelyEmptyWorkout = (!dailyWorkout.exercises || dailyWorkout.exercises.length === 0) &&
                                      (!dailyWorkout.warmUp || dailyWorkout.warmUp.length === 0) &&
                                      (!dailyWorkout.coolDown || dailyWorkout.coolDown.length === 0);

  useEffect(() => {
    if (user && !isRestDay) {
      const checkLoggedStatus = async () => {
        const workoutLogsRef = collection(db, 'users', user.uid, 'workoutLogs');
        const q = query(
          workoutLogsRef,
          where("planName", "==", plan.planName),
          where("dayNumber", "==", dailyWorkout.dayNumber),
          limit(1)
        );
        try {
          const querySnapshot = await getDocs(q);
          setIsLoggedForPlan(!querySnapshot.empty);
        } catch (error) {
          console.error("Error checking logged status:", error);
          setIsLoggedForPlan(false);
        }
      };
      checkLoggedStatus();
    } else if (isRestDay) {
        setIsLoggedForPlan(false);
    }
  }, [user, dailyWorkout.dayNumber, plan.planName, isRestDay]);


  const handleLogWorkout = async () => {
    if (!user) {
      toast({ title: "Not Logged In", description: "Please log in to record your workout.", variant: "destructive" });
      return;
    }
    if (isRestDay) {
      toast({ title: "Rest Day", description: "No need to log a rest day!", variant: "default" });
      return;
    }

    setIsLogging(true);
    try {
      const workoutLogEntry: Omit<WorkoutLog, 'id'> = {
        userId: user.uid,
        planName: plan.planName,
        dayNumber: dailyWorkout.dayNumber,
        dayName: dailyWorkout.dayName,
        focus: dailyWorkout.focus,
        // --- THE FIX ---
        // We replace the complex serverTimestamp() with a simple, client-side Timestamp.now()
        completedAt: Timestamp.now(),
      };
      await addDoc(collection(db, 'users', user.uid, 'workoutLogs'), workoutLogEntry);
      
      await updateUserStreakClientSide(user.uid);

      toast({ title: "Workout Logged!", description: `${dailyWorkout.dayName} marked as completed.` });
      setIsLoggedForPlan(true);
    } catch (error: any) {
      toast({ title: "Logging Failed", description: error.message || "Could not log workout.", variant: "destructive" });
    } finally {
      setIsLogging(false);
    }
  };

  const handleMissedDay = async () => {
    if (!canAdaptPlan) {
        toast({ 
            title: "Premium Feature", 
            description: "Adapting workout plans is a premium feature. Please upgrade or start a trial.", 
            variant: "destructive",
            duration: 7000 
        });
        return;
    }
    setIsAdaptingDay(true);
    await onAdaptPlan(dailyWorkout.dayNumber, plan);
    setIsAdaptingDay(false);
  };

  const DayIcon = isActiveRecoveryDay ? ActivityIcon : (isRestDay ? Moon : Zap);

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow bg-card/80">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold text-accent flex items-center">
           <DayIcon className="h-5 w-5 mr-2" />
           {dailyWorkout.dayName}
        </CardTitle>
        <CardDescription className="text-sm">{dailyWorkout.focus}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {dailyWorkout.warmUp && dailyWorkout.warmUp.length > 0 && (
          <div>
            <h5 className="text-sm font-medium text-muted-foreground mb-1">Warm-up:</h5>
            <ul className="list-disc list-inside pl-2 text-xs">
              {dailyWorkout.warmUp.map((item, idx) => <li key={`warmup-${idx}`}>{item}</li>)}
            </ul>
          </div>
        )}

        {!isRestDay && dailyWorkout.exercises && dailyWorkout.exercises.length > 0 && (
          <div className="space-y-2">
            {dailyWorkout.exercises.map((ex, idx) => <ExerciseDisplay key={`ex-${idx}`} exercise={ex} />)}
          </div>
        )}

        {(isRestDay || (isEffectivelyEmptyWorkout && !isRestDay && !isActiveRecoveryDay)) && (
            <p className="text-center text-lg font-medium py-6 text-muted-foreground">
                {isRestDay ? "Enjoy your rest day!" : "No specific exercises listed for this day."}
            </p>
        )}
        {isActiveRecoveryDay && isEffectivelyEmptyWorkout && (
             <p className="text-center text-md font-medium py-4 text-muted-foreground">
                Focus on the warm-up and cool-down for active recovery.
            </p>
        )}


        {dailyWorkout.coolDown && dailyWorkout.coolDown.length > 0 && (
           <div>
            <h5 className="text-sm font-medium text-muted-foreground mt-3 mb-1">Cool-down:</h5>
            <ul className="list-disc list-inside pl-2 text-xs">
              {dailyWorkout.coolDown.map((item, idx) => <li key={`cooldown-${idx}`}>{item}</li>)}
            </ul>
          </div>
        )}
      </CardContent>
      {!isRestDay && (
        <CardFooter className="pt-4 border-t border-border/30 flex flex-col sm:flex-row sm:justify-between gap-2">
          <Button
            onClick={handleLogWorkout}
            disabled={isLogging || isLoggedForPlan || isAdaptingDay || isAdaptingPlanParent}
            variant={isLoggedForPlan ? "ghost" : "default"}
            className="w-full sm:w-auto"
          >
            {isLogging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isLoggedForPlan ? <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> : <CheckCircle className="mr-2 h-4 w-4" />)}
            {isLogging ? "Logging..." : (isLoggedForPlan ? "Completed" : "Mark as Completed")}
          </Button>
          {!isLoggedForPlan && (
            <Button
                onClick={handleMissedDay}
                disabled={isAdaptingDay || isLogging || isAdaptingPlanParent}
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
            >
                {isAdaptingDay ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <HelpCircle className="mr-2 h-4 w-4" />}
                {isAdaptingDay ? "Adapting..." : "Missed this Day?"}
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}

export default function WorkoutPlanDisplay({ plan, onAdaptPlan, isAdaptingPlan, canAdaptPlan }: WorkoutPlanDisplayProps): ReactElement {
  const defaultOpenDay = plan.dailyWorkouts.find(dw => dw.focus.toLowerCase() !== 'rest' && dw.focus.toLowerCase() !== 'rest day');
  const defaultAccordionValue = defaultOpenDay ? [`day-${defaultOpenDay.dayNumber}`] : [];

  return (
    <Card className="shadow-xl bg-card/90">
      <CardHeader className="bg-primary/10 p-6 rounded-t-lg">
        <CardTitle className="text-3xl font-headline text-primary flex items-center">
          <Dumbbell className="h-8 w-8 mr-3" /> {plan.planName}
        </CardTitle>
        <CardDescription className="text-base pt-1">{plan.introduction}</CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <Alert variant="default" className="bg-background/50 border-accent/30">
            <ShieldAlert className="h-5 w-5 text-accent"/>
            <AlertTitle className="text-sm text-accent">Important Disclaimer</AlertTitle>
            <AlertDescription className="text-xs">
            This workout plan is AI-generated. Consult with a healthcare professional or certified fitness trainer before starting any new exercise program, especially if you have pre-existing health conditions. Modify exercises as needed and prioritize safety.
            </AlertDescription>
        </Alert>

        <Accordion type="multiple" defaultValue={defaultAccordionValue} className="w-full space-y-4">
          {plan.dailyWorkouts.map((dailyWorkout) => (
            <AccordionItem key={`day-${dailyWorkout.dayNumber}`} value={`day-${dailyWorkout.dayNumber}`} className="border border-border rounded-lg overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline bg-card/50 hover:bg-card/70 [&[data-state=open]]:bg-card/70">
                <div className="flex items-center text-lg">
                  <CalendarDays className="h-5 w-5 mr-2 text-primary" /> Day {dailyWorkout.dayNumber}: {dailyWorkout.dayName.replace(/^Day \d+: /, '')}
                  <Badge variant="outline" className="ml-3 text-xs">{dailyWorkout.focus}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 bg-background/30">
                <DailyWorkoutDisplay
                  dailyWorkout={dailyWorkout}
                  plan={plan}
                  onAdaptPlan={onAdaptPlan}
                  isAdaptingPlanParent={isAdaptingPlan}
                  canAdaptPlan={canAdaptPlan}
                />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {plan.overallNotes && plan.overallNotes.length > 0 && (
          <>
            <Separator className="my-6" />
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center">
                <Info className="h-6 w-6 mr-2 text-primary" /> Coach Ath's Overall Notes
              </h3>
              <ul className="list-disc list-inside space-y-1.5 pl-2 text-sm">
                {plan.overallNotes.map((note, index) => (
                  <li key={`note-${index}`}>{note}</li>
                ))}
              </ul>
            </div>
          </>
        )}
      </CardContent>
      <CardFooter className="p-6 border-t">
        <p className="text-xs text-muted-foreground">
          Plan generated by Coach Ath. Consistency is key! Remember to listen to your body.
        </p>
      </CardFooter>
    </Card>
  );
}
