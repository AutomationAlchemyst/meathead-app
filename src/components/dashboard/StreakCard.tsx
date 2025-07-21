'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { Flame } from 'lucide-react';

// --- THE FIX ---
// We are ensuring this is a "named export".
export const StreakCard = () => {
  const { userProfile, loading: authLoading } = useAuth();

  const currentStreak = userProfile?.currentStreak || 0;

  if (authLoading) {
    return (
      <Card className="shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <Flame className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-1/2 mb-1" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-orange-50 via-card to-amber-50">
      <CardHeader className="pb-2">
        <div className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base font-semibold text-amber-800">Current Logging Streak</CardTitle>
          <Flame className={`h-6 w-6 ${currentStreak > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-bold text-orange-600">
          {currentStreak}
          <span className="text-2xl text-muted-foreground ml-1">day{currentStreak !== 1 ? 's' : ''}</span>
        </div>
        <p className="text-xs text-muted-foreground pt-1">
          {currentStreak > 0 ? "You're on fire! Keep it up." : "Log an item today to start your streak!"}
        </p>
      </CardContent>
    </Card>
  );
};
