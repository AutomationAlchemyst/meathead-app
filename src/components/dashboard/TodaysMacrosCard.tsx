'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import type { FoodLog } from '@/types';
// NEW: Imported Target and Egg, removed Droplets.
import { Target, Flame, Beef, Wheat, Egg, CheckCircle2, Circle, Utensils } from 'lucide-react';
import Link from 'next/link';
import { Button } from '../ui/button';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { startOfDay, endOfDay } from 'date-fns';

interface AggregatedMacros {
  calories: number; protein: number; carbs: number; fat: number;
}

export const TodaysMacrosCard = () => {
  const { user, userProfile, loading: authLoading } = useAuth();
  const [todaysMacros, setTodaysMacros] = useState<AggregatedMacros | null>(null);
  const [macrosLoading, setMacrosLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [foodLoggedToday, setFoodLoggedToday] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      setMacrosLoading(true);
      const todayStart = startOfDay(new Date());
      const todayEnd = endOfDay(new Date());
      const foodLogsRef = collection(db, 'users', user.uid, 'foodLogs');
      const q = query(foodLogsRef, where('loggedAt', '>=', Timestamp.fromDate(todayStart)), where('loggedAt', '<=', Timestamp.fromDate(todayEnd)));

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const logs: FoodLog[] = [];
        querySnapshot.forEach((doc) => { logs.push({ id: doc.id, ...doc.data() } as FoodLog); });
        setFoodLoggedToday(logs.length > 0);
        const aggregated = logs.reduce((acc, log) => {
          acc.calories += log.calories; acc.protein += log.protein; acc.carbs += log.carbs; acc.fat += log.fat;
          return acc;
        }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
        setTodaysMacros(aggregated);
        setMacrosLoading(false);
      }, (err) => {
        setError("Could not load today's macros.");
        setMacrosLoading(false);
      });
      return () => unsubscribe();
    } else {
      setMacrosLoading(false);
    }
  }, [user, authLoading]);

  const getProgressValue = (consumed?: number | null, target?: number | null) => {
    if (target && target > 0 && consumed && consumed > 0) { return Math.min((consumed / target) * 100, 100); }
    return 0;
  };
  
  const targetCalories = userProfile?.targetCalories;
  const targetProtein = userProfile?.targetProtein;
  const targetCarbs = userProfile?.targetCarbs;
  const targetFat = userProfile?.targetFat;

  if (authLoading || macrosLoading) {
    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="flex flex-col flex-grow space-y-4 pt-2">
                <div className="space-y-4 flex-grow">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                </div>
                <Skeleton className="h-9 w-full !mt-6" />
            </CardContent>
        </Card>
    );
  }

  if (error) return <p>{error}</p>;
  if (!user) return <p>Please log in</p>;

  return (
    <Card className="h-full flex flex-col relative overflow-hidden group">
      <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <CardHeader className="pb-2 relative z-10">
        <div className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Today&apos;s Macros</CardTitle>
          <Target className="h-5 w-5 text-primary drop-shadow-[0_0_8px_rgba(13,242,89,0.5)]" />
        </div>
        {foodLoggedToday ? (
          <CardDescription className="flex items-center text-xs text-primary font-medium pt-1">
            <CheckCircle2 className="h-3 w-3 mr-1"/> Meals logged today!
          </CardDescription>
        ) : (
          <CardDescription className="flex items-center text-xs text-muted-foreground pt-1">
            <Circle className="h-3 w-3 mr-1 text-muted-foreground/70"/> No meals logged yet.
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex flex-col flex-grow pt-2 relative z-10">
        {targetCalories && targetProtein && targetCarbs && targetFat ? (
          <>
            <div className="flex-grow space-y-4">
              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-sm font-medium text-foreground flex items-center"><Flame className="h-4 w-4 mr-1 text-primary"/>Calories</span>
                  <span className="text-sm text-muted-foreground"><span className="text-foreground font-bold">{todaysMacros?.calories?.toFixed(0)}</span> / {targetCalories?.toFixed(0)} kcal</span>
                </div>
                <Progress value={getProgressValue(todaysMacros?.calories, targetCalories)} className="h-2 [&>div]:bg-primary" />
              </div>
              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-sm font-medium text-foreground flex items-center"><Beef className="h-4 w-4 mr-1 text-chart-2"/>Protein</span>
                  <span className="text-sm text-muted-foreground"><span className="text-foreground font-bold">{todaysMacros?.protein?.toFixed(1)}</span> / {targetProtein?.toFixed(1)} g</span>
                </div>
                <Progress value={getProgressValue(todaysMacros?.protein, targetProtein)} className="h-2 [&>div]:bg-chart-2" />
              </div>
              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-sm font-medium text-foreground flex items-center"><Wheat className="h-4 w-4 mr-1 text-chart-3"/>Carbs</span>
                  <span className="text-sm text-muted-foreground"><span className="text-foreground font-bold">{todaysMacros?.carbs?.toFixed(1)}</span> / {targetCarbs?.toFixed(1)} g</span>
                </div>
                <Progress value={getProgressValue(todaysMacros?.carbs, targetCarbs)} className="h-2 [&>div]:bg-chart-3" />
              </div>
              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-sm font-medium text-foreground flex items-center"><Egg className="h-4 w-4 mr-1 text-chart-4"/>Fat</span>
                  <span className="text-sm text-muted-foreground"><span className="text-foreground font-bold">{todaysMacros?.fat?.toFixed(1)}</span> / {targetFat?.toFixed(1)} g</span>
                </div>
                <Progress value={getProgressValue(todaysMacros?.fat, targetFat)} className="h-2 [&>div]:bg-chart-4" />
              </div>
            </div>
            <Button variant={foodLoggedToday ? "outline" : "default"} size="sm" asChild className="w-full !mt-6 bg-card/40 border-primary/20 hover:bg-primary/20 hover:text-primary transition-all duration-300">
              <Link href="/food-logging">
                {foodLoggedToday ? ( <><Utensils className="mr-2 h-4 w-4"/>Log Another Meal</> ) : ( <><Utensils className="mr-2 h-4 w-4"/>Log Breakfast</> )}
              </Link>
            </Button>
          </>
        ) : (
          <div className="flex-grow flex flex-col justify-center items-center text-center p-4 space-y-3">
            <Utensils className="h-10 w-10 text-muted-foreground mb-1" />
            <p className="text-sm font-semibold text-foreground">Targets Not Configured</p>
            <p className="text-xs text-muted-foreground max-w-[200px]">
              Set your target calories and macronutrients in your profile to start tracking your daily progress.
            </p>
            <Button size="sm" asChild className="w-full mt-2 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all duration-300">
              <Link href="/profile">Configure Targets</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
