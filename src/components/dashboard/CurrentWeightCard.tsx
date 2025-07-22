'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { Scale, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Link from 'next/link';

export const CurrentWeightCard = () => {
  const { userProfile, loading } = useAuth();

  if (loading) {
    return (
      <Card className="shadow-lg">
        <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Current Weight</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-1/2 mb-1" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  const currentWeight = userProfile?.currentWeight;
  const startingWeight = userProfile?.startingWeight;
  let weightChange = 0;
  if (typeof startingWeight === 'number' && typeof currentWeight === 'number') {
    weightChange = currentWeight - startingWeight;
  }

  const getTrendIcon = () => {
    if (weightChange < 0) return <TrendingDown className="h-4 w-4 text-green-500" />;
    if (weightChange > 0) return <TrendingUp className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="pb-2">
        <div className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base font-semibold">Current Weight</CardTitle>
          <Scale className="h-6 w-6 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        {currentWeight !== null && currentWeight !== undefined ? (
          <>
            <div className="text-4xl font-bold">{currentWeight.toFixed(1)}<span className="text-2xl text-muted-foreground">kg</span></div>
            <div className="text-xs text-muted-foreground pt-1 flex items-center">
              {getTrendIcon()}
              <span className="ml-1">
                {weightChange.toFixed(1)}kg from start ({startingWeight?.toFixed(1) ?? 'N/A'}kg)
              </span>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-muted-foreground">No weight logged yet.</p>
            <Link href="/weight-tracking" className="text-sm text-primary hover:underline">
              Log your weight
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
