
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { Weight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '../ui/button';

export default function CurrentWeightCard() {
  const { userProfile, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Weight</CardTitle>
          <Weight className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-1/2 mt-1" />
          <Skeleton className="h-4 w-3/4 mt-2" />
          <div className="my-4 flex justify-center items-center h-40">
            <Skeleton className="h-32 w-32 rounded-full" />
          </div>
          <Skeleton className="h-6 w-1/3 mx-auto mt-2" />
        </CardContent>
      </Card>
    );
  }

  const currentWt = userProfile?.currentWeight;
  const startingWeight = userProfile?.startingWeight;
  const targetWeight = userProfile?.targetWeight;

  let progressPercentage: number | null = null;
  let progressText: string | null = null;

  if (currentWt != null && startingWeight != null && targetWeight != null) {
    if (startingWeight === targetWeight) {
      progressPercentage = currentWt === startingWeight ? 100 : 0;
      progressText = currentWt === startingWeight ? "Maintaining" : "Set a different target";
    } else if (targetWeight < startingWeight) { // Weight loss goal
      const totalToLose = startingWeight - targetWeight;
      const amountLost = startingWeight - currentWt;
      progressPercentage = totalToLose > 0 ? (amountLost / totalToLose) * 100 : (amountLost >= 0 ? 100 : 0);
      if (currentWt <= targetWeight) progressText = "Goal Reached!";
    } else { // Weight gain goal
      const totalToGain = targetWeight - startingWeight;
      const amountGained = currentWt - startingWeight;
      progressPercentage = totalToGain > 0 ? (amountGained / totalToGain) * 100 : (amountGained >= 0 ? 100 : 0);
      if (currentWt >= targetWeight) progressText = "Goal Reached!";
    }
    progressPercentage = Math.max(0, Math.min(100, progressPercentage));
    if (!progressText) {
      progressText = `${progressPercentage.toFixed(0)}%`;
    }
  }

  const radius = 52;
  const strokeWidth = 10;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const offset = progressPercentage != null ? circumference - (progressPercentage / 100) * circumference : circumference;

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">Current Weight</CardTitle>
        <Weight className="h-6 w-6 text-primary" />
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        {(currentWt !== null && currentWt !== undefined) ? (
          <div className="text-3xl font-bold text-primary mt-2">{currentWt.toFixed(1)} kg</div>
        ) : (
          <p className="text-lg text-muted-foreground mt-2">Not set</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {(currentWt !== null && currentWt !== undefined) ? 'Last recorded weight.' : 'Log your weight to see it here.'}
        </p>

        <div className="my-4 w-36 h-36 relative">
          {progressPercentage != null && progressText != null ? (
            <>
              <svg
                height="100%"
                width="100%"
                viewBox={`0 0 ${radius * 2} ${radius * 2}`}
                className="transform -rotate-90"
              >
                <circle
                  stroke="hsl(var(--muted))"
                  fill="transparent"
                  strokeWidth={strokeWidth}
                  r={normalizedRadius}
                  cx={radius}
                  cy={radius}
                />
                <circle
                  stroke="hsl(var(--primary))"
                  fill="transparent"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${circumference} ${circumference}`}
                  style={{ strokeDashoffset: offset }}
                  strokeLinecap="round"
                  r={normalizedRadius}
                  cx={radius}
                  cy={radius}
                  className="transition-all duration-500 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-base sm:text-lg xl:text-xl font-bold text-primary text-center leading-tight px-1">
                  {progressText}
                </span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
                 <p className="text-sm text-muted-foreground">
                Set starting & target weight in your <Link href="/profile" className="text-primary underline hover:text-primary/80">profile</Link> to see progress.
              </p>
            </div>
          )}
        </div>
        
        <Button variant="link" asChild className="p-0 text-sm mt-auto">
            <Link href="/weight-tracking">Update Weight</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
