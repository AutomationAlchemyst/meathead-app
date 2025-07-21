
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import type { WaterLog } from '@/types';
import { Loader2, Droplet, Info, PlusCircle, CheckCircle2, Circle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '../ui/button';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { startOfDay, endOfDay } from 'date-fns';
import { Alert, AlertDescription } from '../ui/alert';

interface AggregatedWater {
  totalAmount: number;
}

export default function TodaysWaterCard() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const [todaysWater, setTodaysWater] = useState<AggregatedWater | null>(null);
  const [waterLoading, setWaterLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [waterLoggedToday, setWaterLoggedToday] = useState(false);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (user) {
      setWaterLoading(true);
      setError(null);
      setWaterLoggedToday(false);
      const todayStart = startOfDay(new Date());
      const todayEnd = endOfDay(new Date());

      const waterLogsRef = collection(db, 'users', user.uid, 'waterLogs');
      const q = query(
        waterLogsRef,
        where('loggedAt', '>=', Timestamp.fromDate(todayStart)),
        where('loggedAt', '<=', Timestamp.fromDate(todayEnd))
      );

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const logs: WaterLog[] = [];
        querySnapshot.forEach((doc) => {
          logs.push({ id: doc.id, ...doc.data() } as WaterLog);
        });
        setWaterLoggedToday(logs.length > 0);

        const aggregated = logs.reduce(
          (acc, log) => {
            acc.totalAmount += log.amount;
            return acc;
          },
          { totalAmount: 0 }
        );
        setTodaysWater(aggregated);
        setWaterLoading(false);
        setError(null);
      }, (err) => {
        console.error("[TodaysWaterCard] Error fetching today's water logs:", err);
        setTodaysWater(null);
        setError("Could not load today's water intake.");
        setWaterLoading(false);
        setWaterLoggedToday(false);
      });

      return () => unsubscribe();
    } else {
      setTodaysWater(null);
      setWaterLoading(false);
      setError(null);
      setWaterLoggedToday(false);
    }
  }, [user, authLoading]);

  const getProgressValue = (consumed?: number, target?: number) => {
    if (target && target > 0 && consumed && consumed >= 0) { // consumed can be 0
      return Math.min((consumed / target) * 100, 100);
    }
    return 0;
  };
  
  const targetWater = userProfile?.targetWaterIntake;
  const consumedWater = todaysWater?.totalAmount || 0;

  if (authLoading || (user && waterLoading && !userProfile)) { 
    return (
      <Card className="shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Today's Water</CardTitle>
            <Droplet className="h-5 w-5 text-muted-foreground" />
          </div>
          <CardDescription><Skeleton className="h-4 w-2/3 mt-1" /></CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          <Skeleton className="h-6 w-3/4 mb-1" />
          <Skeleton className="h-4 w-full rounded-full" />
          <Skeleton className="h-8 w-1/2 mt-3" />
        </CardContent>
      </Card>
    );
  }
  
  if (waterLoading && user) { 
     return (
      <Card className="shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold">Today's Water</CardTitle>
            <Droplet className="h-6 w-6 text-primary" />
          </div>
           <CardDescription className="flex items-center text-xs text-muted-foreground pt-1">
            <Loader2 className="h-3 w-3 animate-spin mr-1"/>Loading status...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground flex items-center"><Loader2 className="h-4 w-4 animate-spin mr-2"/>Loading water data...</p>
            <Skeleton className="h-4 w-1/4 mb-1 opacity-50" />
            <Skeleton className="h-2 w-full rounded-full opacity-50" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-lg">
        <CardHeader className="pb-2">
           <div className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold">Today's Water</CardTitle>
            <Droplet className="h-6 w-6 text-primary" />
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
  
  if (!user) {
     return (
      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="pb-2">
          <div className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold">Today's Water</CardTitle>
            <Droplet className="h-6 w-6 text-primary" />
          </div>
           <CardDescription className="flex items-center text-xs text-muted-foreground pt-1">
            <Circle className="h-3 w-3 mr-1 text-muted-foreground/70"/> Login to track.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
            <p className="text-lg text-muted-foreground">Login to track water intake.</p>
        </CardContent>
      </Card>
     );
  }

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="pb-2">
        <div className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold">Today's Water Intake</CardTitle>
            <Droplet className="h-6 w-6 text-primary" />
        </div>
        {waterLoggedToday ? (
            <CardDescription className="flex items-center text-xs text-green-600 pt-1">
                <CheckCircle2 className="h-3 w-3 mr-1"/> Water logged today!
            </CardDescription>
        ) : (
            <CardDescription className="flex items-center text-xs text-muted-foreground pt-1">
                <Circle className="h-3 w-3 mr-1 text-muted-foreground/70"/> No water logged today.
            </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3 pt-2">
        <div className="flex justify-between items-baseline mb-1">
            <span className="text-2xl font-bold text-primary">{consumedWater.toLocaleString()}ml</span>
            {targetWater ? (
                <span className="text-sm text-muted-foreground">/ {targetWater.toLocaleString()}ml target</span>
            ) : (
                <span className="text-xs text-muted-foreground">Set target in profile</span>
            )}
        </div>
        {targetWater && targetWater > 0 ? (
            <Progress value={getProgressValue(consumedWater, targetWater)} className="h-3 [&>div]:bg-blue-500" />
          ) : (
            <div className="h-3 bg-muted rounded-full w-full flex items-center justify-center">
                <p className="text-xs text-muted-foreground">
                    <Link href="/profile" className="underline hover:text-primary">Set water target</Link> to see progress.
                </p>
            </div>
        )}
        <Button variant="default" size="sm" asChild className="w-full mt-4">
            <Link href="/water-tracking"><PlusCircle className="mr-2 h-4 w-4"/>Log Water</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
