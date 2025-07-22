'use client';

import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';

export const GreetingHeader = () => {
  const { user, userProfile, loading } = useAuth();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  if (loading) {
    return (
      <div className="mb-8">
        <Skeleton className="h-8 w-1/2 mb-2" />
        <Skeleton className="h-5 w-3/4" />
      </div>
    );
  }

  const displayName = userProfile?.displayName || user?.email?.split('@')[0] || 'Cycle Breaker';

  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-foreground">{getGreeting()}, {displayName}!</h1>
      <p className="text-muted-foreground">Ready to conquer your day? Let's track those macros.</p>
    </div>
  );
};