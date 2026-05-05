'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { Flame } from 'lucide-react';

export const StreakCard = () => {
  const { userProfile, loading: authLoading } = useAuth();
  const currentStreak = userProfile?.currentStreak || 0;

  if (authLoading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-3/4" />
        </CardHeader>
        <CardContent className="flex-grow">
          <Skeleton className="h-10 w-1/2 mb-1" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col relative overflow-hidden group">
      <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <CardHeader className="pb-2 relative z-10">
        <div className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Current Streak</CardTitle>
          <Flame className={`h-5 w-5 ${currentStreak > 0 ? 'text-primary drop-shadow-[0_0_8px_rgba(13,242,89,0.5)]' : 'text-muted-foreground'}`} />
        </div>
      </CardHeader>
      <CardContent className="flex-grow relative z-10">
        <div className="flex items-baseline gap-1">
          <span className="text-5xl font-headline font-bold text-foreground tracking-tighter">
            {currentStreak}
          </span>
          <span className="text-xl font-medium text-muted-foreground/70">
            day{currentStreak !== 1 ? 's' : ''}
          </span>
        </div>
        <p className="text-xs text-muted-foreground pt-3 font-medium">
          {currentStreak > 0 ? (
            <span className="text-primary">You're on fire! Keep it up.</span>
          ) : (
            "Log an item today to start your streak!"
          )}
        </p>
      </CardContent>
    </Card>
  );
};