
'use client';

import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';

export default function GreetingHeader() {
  const { user, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div>
        <Skeleton className="h-10 w-3/4 mb-2" />
        <Skeleton className="h-6 w-1/2" />
      </div>
    );
  }

  const displayName = userProfile?.displayName || user?.email?.split('@')[0] || 'User';
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div>
      <h1 className="text-3xl md:text-4xl font-bold font-headline text-foreground">
        {getGreeting()}, <span className="text-primary">{displayName}!</span>
      </h1>
      <p className="mt-2 text-lg text-muted-foreground">
        Ready to conquer your day? Let&apos;s track those gains!
      </p>
    </div>
  );
}
