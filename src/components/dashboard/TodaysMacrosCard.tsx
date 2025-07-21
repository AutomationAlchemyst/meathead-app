'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import type { FoodLog } from '@/types';
// --- NEW ---
// Added a new icon for our proactive CTA.
import { Loader2, Flame, Beef, Wheat, Droplets, Info, CheckCircle2, Circle, Utensils } from 'lucide-react';
import Link from 'next/link';
import { Button } from '../ui/button';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { startOfDay, endOfDay } from 'date-fns';
import { Alert, AlertDescription } from '../ui/alert';

interface AggregatedMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export default function TodaysMacrosCard() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const [todaysMacros, setTodaysMacros] = useState<AggregatedMacros | null>(null);
  const [macrosLoading, setMacrosLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [foodLoggedToday, setFoodLoggedToday] = useState(false);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (user) {
      setMacrosLoading(true);
      setError(null);
      setFoodLoggedToday(false);
      const todayStart = startOfDay(new Date());
      const todayEnd = endOfDay(new Date());

      const foodLogsRef = collection(db, 'users', user.uid, 'foodLogs');
      const q = query(
        foodLogsRef,
        where('loggedAt', '>=', Timestamp.fromDate(todayStart)),
        where('loggedAt', '<=', Timestamp.fromDate(todayEnd))
      );

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const logs: FoodLog[] = [];
        querySnapshot.forEach((doc) => {
          logs.push({ id: doc.id, ...doc.data() } as FoodLog);
        });
        setFoodLoggedToday(logs.length > 0);

        const aggregated = logs.reduce(
          (acc, log) => {
            acc.calories += log.calories;
            acc.protein += log.protein;
            acc.carbs += log.carbs;
            acc.fat += log.fat;
            return acc;
          },
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );
        setTodaysMacros(aggregated);
        setMacrosLoading(false);
        setError(null);
      }, (err) => {
        console.error("[TodaysMacrosCard] Error fetching today's food logs:", err);
        setTodaysMacros(null);
        setError("Could not load today's macros.");
        setMacrosLoading(false);
        setFoodLoggedToday(false);
      });

      return () => unsubscribe();
    } else {
      setTodaysMacros(null);
      setMacrosLoading(false);
      setError(null);
      setFoodLoggedToday(false);
    }
  }, [user, authLoading]);

  const getProgressValue = (consumed?: number, target?: number) => {
    if (target && target > 0 && consumed && consumed > 0) {
      return Math.min((consumed / target) * 100, 100);
    }
    return 0;
  };
  
  const targetCalories = userProfile?.targetCalories;
  const targetProtein = userProfile?.targetProtein;
  const targetCarbs = userProfile?.targetCarbs;
  const targetFat = userProfile?.targetFat;

  if (authLoading) {
    return (
      <Card className="shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Today&apos;s Macros</CardTitle>
            <Flame className="h-5 w-5 text-muted-foreground" />
          </div>
          <CardDescription><Skeleton className="h-4 w-2/3 mt-1" /></CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          {[...Array(4)].map((_, i) => (
            <div key={i}>
              <Skeleton className="h-4 w-1/4 mb-1" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }
  
  if (macrosLoading) {
     return (
      <Card className="shadow-lg">
        <CardHeader className="pb-2">
         <div className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold">Today&apos;s Macros</CardTitle>
            <Flame className="h-6 w-6 text-primary" />
          </div>
          <CardDescription className="flex items-center text-xs text-muted-foreground pt-1">
            <Loader2 className="h-3 w-3 animate-spin mr-1"/>Loading status...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground flex items-center"><Loader2 className="h-4 w-4 animate-spin mr-2"/>Loading macros data...</p>
             {[...Array(4)].map((_, i) => (
            <div key={i} className="pt-2">
              <Skeleton className="h-4 w-1/4 mb-1 opacity-50" />
              <Skeleton className="h-2 w-full rounded-full opacity-50" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold">Today&apos;s Macros</CardTitle>
            <Flame className="h-6 w-6 text-primary" />
          </div>
          <CardDescription className="flex items-center text-xs text-destructive pt-1">
            <Info className="h-3 w-3 mr-1"/>Error loading status
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
           <Alert variant="destructive">
            <Info className="h-5 w-5" />
            <AlertDescription>{error}</AlertDescription>
           </Alert>
        </CardContent>
      </Card>
    );
  }
  
  // --- IMPROVEMENT ---
  // We've simplified the logic. This block now only handles the logged-out state.
  if (!user) {
     return (
      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="pb-2">
          <div className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold">Today's Macros</CardTitle>
            <Flame className="h-6 w-6 text-primary" />
          </div>
           <CardDescription className="flex items-center text-xs text-muted-foreground pt-1">
            <Circle className="h-3 w-3 mr-1 text-muted-foreground/70"/> Login to track.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
            <p className="text-lg text-muted-foreground">Login to track macros.</p>
        </CardContent>
      </Card>
     );
  }

  // This is now the main return block for any logged-in user.
  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="pb-2">
        <div className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold">Today&apos;s Macros</CardTitle>
            <Flame className="h-6 w-6 text-primary" />
        </div>
        {/* The description changes based on whether food has been logged. */}
        {foodLoggedToday ? (
          <CardDescription className="flex items-center text-xs text-green-600 pt-1">
              <CheckCircle2 className="h-3 w-3 mr-1"/> Meals logged today!
          </CardDescription>
        ) : (
          <CardDescription className="flex items-center text-xs text-muted-foreground pt-1">
              <Circle className="h-3 w-3 mr-1 text-muted-foreground/70"/> No meals logged yet.
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4 pt-2">
        <div>
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-sm font-medium text-foreground flex items-center"><Flame className="h-4 w-4 mr-1 text-red-500"/>Calories</span>
            <span className="text-sm text-muted-foreground">
              {todaysMacros?.calories?.toFixed(0)} kcal {targetCalories ? `/ ${targetCalories.toFixed(0)} kcal` : ''}
            </span>
          </div>
          {targetCalories && targetCalories > 0 ? (
            <Progress value={getProgressValue(todaysMacros?.calories, targetCalories)} className="h-2 [&>div]:bg-red-500" />
          ) : (
            <p className="text-xs text-muted-foreground">Set target in profile to see progress.</p>
          )}
        </div>
        <div>
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-sm font-medium text-foreground flex items-center"><Beef className="h-4 w-4 mr-1 text-green-500"/>Protein</span>
            <span className="text-sm text-muted-foreground">
              {todaysMacros?.protein?.toFixed(1)} g {targetProtein ? `/ ${targetProtein.toFixed(1)} g` : ''}
            </span>
          </div>
          {targetProtein && targetProtein > 0 ? (
            <Progress value={getProgressValue(todaysMacros?.protein, targetProtein)} className="h-2 [&>div]:bg-green-500" />
          ) : (
            <p className="text-xs text-muted-foreground">Set target in profile to see progress.</p>
          )}
        </div>
        <div>
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-sm font-medium text-foreground flex items-center"><Wheat className="h-4 w-4 mr-1 text-yellow-500"/>Carbs</span>
            <span className="text-sm text-muted-foreground">
              {todaysMacros?.carbs?.toFixed(1)} g {targetCarbs ? `/ ${targetCarbs.toFixed(1)} g` : ''}
            </span>
          </div>
          {targetCarbs && targetCarbs > 0 ? (
            <Progress value={getProgressValue(todaysMacros?.carbs, targetCarbs)} className="h-2 [&>div]:bg-yellow-500" />
          ) : (
            <p className="text-xs text-muted-foreground">Set target in profile to see progress.</p>
          )}
        </div>
        <div>
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-sm font-medium text-foreground flex items-center"><Droplets className="h-4 w-4 mr-1 text-blue-500"/>Fat</span>
            <span className="text-sm text-muted-foreground">
              {todaysMacros?.fat?.toFixed(1)} g {targetFat ? `/ ${targetFat.toFixed(1)} g` : ''}
            </span>
          </div>
          {targetFat && targetFat > 0 ? (
            <Progress value={getProgressValue(todaysMacros?.fat, targetFat)} className="h-2 [&>div]:bg-blue-500" />
          ) : (
            <p className="text-xs text-muted-foreground">Set target in profile to see progress.</p>
          )}
        </div>
        
        {/* --- IMPROVEMENT ---
            This is our new dynamic button. It replaces the separate buttons from the old logic.
        */}
        <Button 
          variant={foodLoggedToday ? "outline" : "default"} 
          size="sm" 
          asChild 
          className="w-full !mt-6" // Using !mt-6 to ensure spacing is consistent
        >
            <Link href="/food-logging">
              {foodLoggedToday ? (
                <><Utensils className="mr-2 h-4 w-4"/>Log Another Meal</>
              ) : (
                <><Utensils className="mr-2 h-4 w-4"/>Log Breakfast</>
              )}
            </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
