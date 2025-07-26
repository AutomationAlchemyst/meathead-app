// src/components/dashboard/TodaysWaterCard.tsx

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import type { WaterLog } from '@/types';
import { Loader2, Droplet, Info, PlusCircle, CheckCircle2, Circle, GlassWater } from 'lucide-react';
import Link from 'next/link';
import { Button } from '../ui/button';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { startOfDay, endOfDay } from 'date-fns';

interface AggregatedWater { totalAmount: number; }

export const TodaysWaterCard = () => {
    const { user, userProfile, loading: authLoading } = useAuth();
    const [todaysWater, setTodaysWater] = useState<AggregatedWater | null>(null);
    const [waterLoading, setWaterLoading] = useState(true);
    const [waterLoggedToday, setWaterLoggedToday] = useState(false);
  
    useEffect(() => {
      if (authLoading) return;
      if (user) {
        setWaterLoading(true);
        const todayStart = startOfDay(new Date());
        const todayEnd = endOfDay(new Date());
        const waterLogsRef = collection(db, 'users', user.uid, 'waterLogs');
        const q = query(waterLogsRef, where('loggedAt', '>=', Timestamp.fromDate(todayStart)), where('loggedAt', '<=', Timestamp.fromDate(todayEnd)));
  
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
          const logs: WaterLog[] = [];
          querySnapshot.forEach((doc) => { logs.push({ id: doc.id, ...doc.data() } as WaterLog); });
          setWaterLoggedToday(logs.length > 0);
          const aggregated = logs.reduce((acc, log) => { acc.totalAmount += log.amount; return acc; }, { totalAmount: 0 });
          setTodaysWater(aggregated);
          setWaterLoading(false);
        }, () => { setWaterLoading(false); });
        return () => unsubscribe();
      } else {
        setWaterLoading(false);
      }
    }, [user, authLoading]);
  
    const getProgressValue = (consumed?: number, target?: number) => {
      if (target && target > 0 && consumed && consumed >= 0) { return Math.min((consumed / target) * 100, 100); }
      return 0;
    };
    
    const targetWater = userProfile?.targetWaterIntake;
    const consumedWater = todaysWater?.totalAmount || 0;
  
    if (authLoading || waterLoading) {
        return (
            <Card className="h-full flex flex-col">
                <CardHeader className="pb-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="flex flex-col flex-grow pt-2">
                    <div className="flex-grow space-y-3">
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-3 w-full" />
                    </div>
                    <Skeleton className="h-9 w-full mt-4" />
                </CardContent>
            </Card>
        );
    }
    if (!user) return <p>Please log in</p>;

    return (
        // FIX: Added `h-full` and `flex flex-col` to make the card stretch vertically.
        <Card className="h-full flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300">
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
          {/* FIX: Make CardContent a flex container that grows to push the button to the bottom. */}
          <CardContent className="flex flex-col flex-grow pt-2">
            <div className="flex-grow space-y-3">
                <div className="flex justify-between items-baseline mb-1">
                    <span className="text-2xl font-bold text-primary">{consumedWater.toLocaleString()}ml</span>
                    {targetWater && <span className="text-sm text-muted-foreground">/ {targetWater.toLocaleString()}ml target</span>}
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
            </div>
            <Button variant={waterLoggedToday ? "outline" : "default"} size="sm" asChild className="w-full mt-4">
                <Link href="/water-tracking">
                  {waterLoggedToday ? ( <><PlusCircle className="mr-2 h-4 w-4"/>Log More Water</> ) : ( <><GlassWater className="mr-2 h-4 w-4"/>Log Your First Glass</> )}
                </Link>
            </Button>
          </CardContent>
        </Card>
      );
};
