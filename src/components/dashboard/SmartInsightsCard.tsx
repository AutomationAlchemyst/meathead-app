
'use client';

import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import type { FoodLog as FoodLogType, UserProfile as UserProfileType, WeightLog as WeightLogType, WorkoutLog as WorkoutLogType, WaterLog as WaterLogType } from '@/types'; // Original types
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, Timestamp, limit } from 'firebase/firestore';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { Brain, Sparkles, Info } from 'lucide-react';
import { generateDashboardInsights, type GenerateDashboardInsightsOutput } from '@/ai/flows/generate-dashboard-insights-flow';
import { Alert, AlertDescription } from '../ui/alert';
import UpgradePrompt from '@/components/premium/UpgradePrompt'; // Import the UpgradePrompt component

// Define plain types for data passed to server function
interface UserProfilePlain extends Omit<UserProfileType, 'createdAt' | 'journeyStartDate' | 'updatedAt' | 'activeWorkoutPlan'> {
  uid: string;
  createdAt: string; 
  journeyStartDate?: string | null;
  updatedAt?: string | null;
  targetWaterIntake?: number | null;
}

interface FoodLogPlain extends Omit<FoodLogType, 'loggedAt' | 'id' | 'userId'> {
  loggedAt: string;
}

interface WeightLogPlain extends Omit<WeightLogType, 'loggedAt' | 'id' | 'userId'> {
  loggedAt: string;
}

interface WorkoutLogPlain extends Omit<WorkoutLogType, 'completedAt' | 'id' | 'userId'> {
  completedAt: string;
}

interface WaterLogPlain extends Omit<WaterLogType, 'loggedAt' | 'id' | 'userId'> {
  amount: number;
  loggedAt: string;
}


const formatTimestampToISO = (ts: Timestamp | Date | null | undefined): string | null => {
    if (ts instanceof Timestamp) return ts.toDate().toISOString();
    if (ts instanceof Date) return ts.toISOString();
    if (typeof ts === 'string') { try { return new Date(ts).toISOString(); } catch (e) { return null; }}
    return null;
};

const convertUserProfileToPlain = (profile: UserProfileType): UserProfilePlain => {
    const createdAtISO = formatTimestampToISO(profile.createdAt);
    return {
        uid: profile.uid,
        email: profile.email,
        displayName: profile.displayName,
        currentWeight: profile.currentWeight,
        targetCalories: profile.targetCalories,
        targetProtein: profile.targetProtein,
        targetCarbs: profile.targetCarbs,
        targetFat: profile.targetFat,
        targetWeight: profile.targetWeight,
        targetWaterIntake: profile.targetWaterIntake,
        activityLevel: profile.activityLevel,
        estimatedGoalDate: profile.estimatedGoalDate,
        startingWeight: profile.startingWeight,
        createdAt: createdAtISO || new Date(0).toISOString(),
        journeyStartDate: formatTimestampToISO(profile.journeyStartDate),
        updatedAt: formatTimestampToISO(profile.updatedAt),
    };
};

const convertFoodLogsToPlain = (logs: FoodLogType[]): FoodLogPlain[] => {
    return (logs || []).map(log => { const { userId, id, ...rest } = log; return { ...rest, loggedAt: formatTimestampToISO(log.loggedAt)! }; });
};

const convertWeightLogsToPlain = (logs: WeightLogType[]): WeightLogPlain[] => {
    return (logs || []).map(log => { const { userId, id, ...rest } = log; return { ...rest, loggedAt: formatTimestampToISO(log.loggedAt)! }; });
};

const convertWorkoutLogsToPlain = (logs: WorkoutLogType[]): WorkoutLogPlain[] => {
    return (logs || []).map(log => { const { userId, id, ...rest } = log; return { ...rest, completedAt: formatTimestampToISO(log.completedAt)! }; });
};

const convertWaterLogsToPlain = (logs: WaterLogType[]): WaterLogPlain[] => {
    return (logs || []).map(log => { const { userId, id, ...rest } = log; return { ...rest, loggedAt: formatTimestampToISO(log.loggedAt)! }; });
};


export default function SmartInsightsCard() {
  const { user, userProfile, loading: authLoadingFromContext, isPremium } = useAuth(); 
  const [aiInsights, setAiInsights] = useState<GenerateDashboardInsightsOutput | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(true); // Specific loading for AI insights generation
  const [error, setError] = useState<string | null>(null);

  const [fetchedFoodLogs, setFetchedFoodLogs] = useState<FoodLogType[]>([]);
  const [recentWeightLogs, setRecentWeightLogs] = useState<WeightLogType[]>([]);
  const [recentWorkoutLogs, setRecentWorkoutLogs] = useState<WorkoutLogType[]>([]);
  const [fetchedWaterLogs, setFetchedWaterLogs] = useState<WaterLogType[]>([]); 
  
  const [foodLogsLoading, setFoodLogsLoading] = useState(true);
  const [weightLogsLoading, setWeightLogsLoading] = useState(true);
  const [workoutLogsLoading, setWorkoutLogsLoading] = useState(true);
  const [waterLogsLoading, setWaterLogsLoading] = useState(true); 

  console.log(`[SmartInsightsCard] Render. AuthContext: user: ${user?.uid}, authLoading: ${authLoadingFromContext}, isPremium: ${isPremium}`);

  // Effect for fetching food logs (last 14 days)
  useEffect(() => {
    console.log(`[SmartInsightsCard] Food logs useEffect. isPremium: ${isPremium}, user: ${user?.uid}, authLoadingFromContext: ${authLoadingFromContext}`);
    if (!isPremium || !user || authLoadingFromContext) { setFoodLogsLoading(false); return; }
    setFoodLogsLoading(true);
    const queryStartDate = startOfDay(subDays(new Date(), 13));
    const foodLogsRef = collection(db, 'users', user.uid, 'foodLogs');
    const foodQuery = query(foodLogsRef, where('loggedAt', '>=', Timestamp.fromDate(queryStartDate)), orderBy('loggedAt', 'desc'), limit(50));
    console.log(`[SmartInsightsCard] Food logs: Subscribing for user ${user.uid}.`);
    const unsubscribe = onSnapshot(foodQuery, (snap) => {
      setFetchedFoodLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as FoodLogType)));
      setFoodLogsLoading(false);
      console.log(`[SmartInsightsCard] Food logs: Loaded ${snap.docs.length} logs.`);
    }, (err) => { console.error("[SmartInsightsCard] Error fetching food logs for insights:", err); setError("Could not load food history."); setFoodLogsLoading(false); });
    return () => { console.log("[SmartInsightsCard] Food logs: Unsubscribing."); unsubscribe(); };
  }, [user, authLoadingFromContext, isPremium]);

  // Effect for fetching weight logs (last 30 days)
  useEffect(() => {
    console.log(`[SmartInsightsCard] Weight logs useEffect. isPremium: ${isPremium}, user: ${user?.uid}, authLoadingFromContext: ${authLoadingFromContext}`);
    if (!isPremium || !user || authLoadingFromContext) { setWeightLogsLoading(false); return; }
    setWeightLogsLoading(true);
    const queryStartDate = startOfDay(subDays(new Date(), 29));
    const weightLogsRef = collection(db, 'users', user.uid, 'weightLogs');
    const weightQuery = query(weightLogsRef, where('loggedAt', '>=', Timestamp.fromDate(queryStartDate)), orderBy('loggedAt', 'asc'), limit(60));
    console.log(`[SmartInsightsCard] Weight logs: Subscribing for user ${user.uid}.`);
    const unsubscribe = onSnapshot(weightQuery, (snap) => {
      setRecentWeightLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as WeightLogType)));
      setWeightLogsLoading(false);
      console.log(`[SmartInsightsCard] Weight logs: Loaded ${snap.docs.length} logs.`);
    }, (err) => { console.error("[SmartInsightsCard] Error fetching weight logs for insights:", err); setError("Could not load weight history."); setWeightLogsLoading(false); });
    return () => { console.log("[SmartInsightsCard] Weight logs: Unsubscribing."); unsubscribe(); };
  }, [user, authLoadingFromContext, isPremium]);

  // Effect for fetching workout logs (last 30 days)
  useEffect(() => {
    console.log(`[SmartInsightsCard] Workout logs useEffect. isPremium: ${isPremium}, user: ${user?.uid}, authLoadingFromContext: ${authLoadingFromContext}`);
    if (!isPremium || !user || authLoadingFromContext) { setWorkoutLogsLoading(false); return; }
    setWorkoutLogsLoading(true);
    const queryStartDate = startOfDay(subDays(new Date(), 29)); 
    const workoutLogsRef = collection(db, 'users', user.uid, 'workoutLogs');
    const workoutQuery = query(workoutLogsRef, where('completedAt', '>=', Timestamp.fromDate(queryStartDate)), orderBy('completedAt', 'desc'), limit(50));
    console.log(`[SmartInsightsCard] Workout logs: Subscribing for user ${user.uid}.`);
    const unsubscribe = onSnapshot(workoutQuery, (snap) => {
      setRecentWorkoutLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as WorkoutLogType)));
      setWorkoutLogsLoading(false);
      console.log(`[SmartInsightsCard] Workout logs: Loaded ${snap.docs.length} logs.`);
    }, (err) => { console.error("[SmartInsightsCard] Error fetching workout logs for insights:", err); setError("Could not load workout history."); setWorkoutLogsLoading(false); });
    return () => { console.log("[SmartInsightsCard] Workout logs: Unsubscribing."); unsubscribe(); };
  }, [user, authLoadingFromContext, isPremium]);

  // Effect for fetching water logs (last 7 days)
  useEffect(() => {
    console.log(`[SmartInsightsCard] Water logs useEffect. isPremium: ${isPremium}, user: ${user?.uid}, authLoadingFromContext: ${authLoadingFromContext}`);
    if (!isPremium || !user || authLoadingFromContext) { setWaterLogsLoading(false); return; }
    setWaterLogsLoading(true);
    const queryStartDate = startOfDay(subDays(new Date(), 6)); 
    const waterLogsRef = collection(db, 'users', user.uid, 'waterLogs');
    const waterQuery = query(waterLogsRef, where('loggedAt', '>=', Timestamp.fromDate(queryStartDate)), orderBy('loggedAt', 'desc'), limit(100)); 
    console.log(`[SmartInsightsCard] Water logs: Subscribing for user ${user.uid}.`);
    const unsubscribe = onSnapshot(waterQuery, (snap) => {
      setFetchedWaterLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as WaterLogType)));
      setWaterLogsLoading(false);
      console.log(`[SmartInsightsCard] Water logs: Loaded ${snap.docs.length} logs.`);
    }, (err) => { console.error("[SmartInsightsCard] Error fetching water logs for insights:", err); setError("Could not load water intake history."); setWaterLogsLoading(false); });
    return () => { console.log("[SmartInsightsCard] Water logs: Unsubscribing."); unsubscribe(); };
  }, [user, authLoadingFromContext, isPremium]);


  // Effect for generating AI insights once all data is loaded (if premium)
  useEffect(() => {
    console.log(`[SmartInsightsCard] AI Insights useEffect. isPremium: ${isPremium}, user: ${user?.uid}, authLoadingFromContext: ${authLoadingFromContext}, userProfile: ${!!userProfile}`);
    if (!isPremium) { setIsLoadingInsights(false); setAiInsights(null); console.log("[SmartInsightsCard] AI Insights: Not premium, skipping AI generation."); return; }
    if (authLoadingFromContext) { setIsLoadingInsights(true); console.log("[SmartInsightsCard] AI Insights: Auth loading, waiting."); return; }
    if (!user || !userProfile) { setAiInsights(null); setIsLoadingInsights(false); console.log("[SmartInsightsCard] AI Insights: No user or profile, skipping."); return; }

    if (!foodLogsLoading && !weightLogsLoading && !workoutLogsLoading && !waterLogsLoading) { 
      console.log("[SmartInsightsCard] AI Insights: All data dependencies loaded. Attempting to generate insights.");
      setIsLoadingInsights(true); 
      setError(null);
      
      if (!userProfile.uid) {
          console.error("[SmartInsightsCard] AI Insights: FATAL: userProfile missing UID!");
          setError("User profile is missing ID."); setIsLoadingInsights(false); return;
      }

      const plainProfile = convertUserProfileToPlain(userProfile);
      const plainFoodLogs = convertFoodLogsToPlain(fetchedFoodLogs);
      const plainWeightLogs = convertWeightLogsToPlain(recentWeightLogs);
      const plainWorkoutLogs = convertWorkoutLogsToPlain(recentWorkoutLogs);
      const plainWaterLogs = convertWaterLogsToPlain(fetchedWaterLogs); 

      generateDashboardInsights(plainProfile, plainFoodLogs, plainWeightLogs, plainWorkoutLogs, plainWaterLogs) 
        .then(insightsOutput => {
            setAiInsights(insightsOutput);
            console.log("[SmartInsightsCard] AI Insights: Successfully generated insights.");
        })
        .catch(e => {
          console.error("[SmartInsightsCard] AI Insights: Error generating AI insights:", e);
          let message = e.message || "Failed to generate smart insights.";
          if (message.includes("Schema validation failed")) message = `AI data format error. Check console.`;
          setError(message); setAiInsights(null);
        })
        .finally(() => {
            setIsLoadingInsights(false);
            console.log("[SmartInsightsCard] AI Insights: Generation process finished.");
        });
    } else {
        console.log(`[SmartInsightsCard] AI Insights: Waiting for data dependencies. foodLogsLoading: ${foodLogsLoading}, weightLogsLoading: ${weightLogsLoading}, workoutLogsLoading: ${workoutLogsLoading}, waterLogsLoading: ${waterLogsLoading}`);
    }
  }, [user, userProfile, authLoadingFromContext, fetchedFoodLogs, recentWeightLogs, recentWorkoutLogs, fetchedWaterLogs, foodLogsLoading, weightLogsLoading, workoutLogsLoading, waterLogsLoading, isPremium]);


  if (!authLoadingFromContext && !isPremium) {
    console.log("[SmartInsightsCard] Render condition: NOT authLoading AND NOT isPremium. Rendering UpgradePrompt.");
    return (
      <UpgradePrompt 
        featureName="Ath's Personalized Insights" 
        message="Unlock AI-driven feedback on your progress, tailored tips, and motivation to help you crush your Keto & Fitness goals!"
      />
    );
  }
  
  // Show skeleton if auth is loading OR if it's a premium user and ANY data for insights is still loading OR insights generation is in progress.
  const overallLoading = authLoadingFromContext || (isPremium && (foodLogsLoading || weightLogsLoading || workoutLogsLoading || waterLogsLoading || isLoadingInsights));
  if (overallLoading) {
    console.log(`[SmartInsightsCard] Render condition: Overall loading is true. Rendering Skeleton. authLoadingFromContext: ${authLoadingFromContext}, isPremium: ${isPremium}, foodLogsLoading: ${foodLogsLoading}, weightLogsLoading: ${weightLogsLoading}, workoutLogsLoading: ${workoutLogsLoading}, waterLogsLoading: ${waterLogsLoading}, isLoadingInsights: ${isLoadingInsights}`);
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-primary flex items-center">
            <Brain className="mr-2 h-6 w-6" /> Ath's Insights
          </CardTitle>
          <CardDescription>Personalized feedback on your journey...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-6 w-3/4 mb-3" /> 
          {[...Array(3)].map((_, i) => ( 
            <div key={i} className="flex items-start space-x-3">
              <Sparkles className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
           <Skeleton className="h-3 w-full mt-3" />
        </CardContent>
      </Card>
    );
  }
  
  if (error && isPremium) { 
    console.log("[SmartInsightsCard] Render condition: Error present AND isPremium. Rendering Error Alert.");
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-primary flex items-center">
            <Brain className="mr-2 h-6 w-6" /> Ath's Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
           <Alert variant="destructive">
            <Info className="h-5 w-5" />
            <AlertDescription>{error}</AlertDescription>
           </Alert>
        </CardContent>
      </Card>
    );
  }

  console.log("[SmartInsightsCard] Render condition: Fallthrough to showing insights content. isPremium:", isPremium, "aiInsights:", !!aiInsights, "isLoadingInsights:", isLoadingInsights);
  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-primary flex items-center">
          <Brain className="mr-2 h-6 w-6" /> Ath's Insights
        </CardTitle>
        <CardDescription>Personalized feedback to guide your Keto & Fitness journey.</CardDescription>
      </CardHeader>
      <CardContent>
        {aiInsights && aiInsights.mainHighlight && (
          <p className="text-base font-semibold text-accent mb-4 leading-relaxed">{aiInsights.mainHighlight}</p>
        )}
        {aiInsights && aiInsights.detailedInsights && aiInsights.detailedInsights.length > 0 ? (
          <ul className="space-y-3">
            {aiInsights.detailedInsights.map((insightText, index) => (
              <li key={index} className="flex items-start space-x-3">
                <Sparkles className="h-5 w-5 text-purple-500 mt-1 flex-shrink-0" />
                <p className="text-sm text-foreground leading-relaxed">{insightText}</p>
              </li>
            ))}
          </ul>
        ) : (
          isPremium && !isLoadingInsights && <p className="text-sm text-muted-foreground"> {/* Only show this if premium and not loading */}
            Log meals, weight, water, and workouts, then set targets in your profile to see personalized insights from Ath here!
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-4 pt-3 border-t border-border">
            Insights are AI-generated. Consult a professional for medical advice.
        </p>
      </CardContent>
    </Card>
  );
}
    
    
