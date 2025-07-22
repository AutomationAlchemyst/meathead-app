'use client';

import { Suspense, useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { GreetingHeader } from '@/components/dashboard/GreetingHeader';
import { TodaysMacrosCard } from '@/components/dashboard/TodaysMacrosCard';
import { TodaysWaterCard } from '@/components/dashboard/TodaysWaterCard';
import { CurrentWeightCard } from '@/components/dashboard/CurrentWeightCard';
import { SmartInsightsCard } from '@/components/dashboard/SmartInsightsCard';
import { WeeklyProgressChart } from '@/components/dashboard/WeeklyProgressChart';
import { DailyActivityCalendar } from '@/components/dashboard/DailyActivityCalendar';
import { StreakCard } from '@/components/dashboard/StreakCard';
import { useAuth } from '@/contexts/AuthContext';
import { getTodaysFoodLogs } from '@/actions/food';
import type { FoodLog } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const { user } = useAuth();
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([]);
  // We don't need a separate loading state here as Suspense will handle it.

  useEffect(() => {
    if (user?.uid) {
      const fetchTodaysData = async () => {
        // Fetches the food logs needed for the insight card.
        // The AI flow is designed to work even with an empty array if there are no logs.
        const logs = await getTodaysFoodLogs(user.uid);
        setFoodLogs(logs);
      };
      fetchTodaysData();
    }
  }, [user?.uid]);

  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4">
        <GreetingHeader />

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Suspense fallback={<Skeleton className="h-40" />}>
            <StreakCard />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-40" />}>
            <CurrentWeightCard />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-40" />}>
            <TodaysMacrosCard />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-40" />}>
            <TodaysWaterCard />
          </Suspense>
        </div>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Suspense fallback={<Skeleton className="h-full min-h-[150px]" />}>
              {/* The fetched food logs are now passed as a prop */}
              <SmartInsightsCard foodLogs={foodLogs} />
            </Suspense>
          </div>
          <div>
            <Suspense fallback={<Skeleton className="h-full min-h-[300px]" />}>
              <WeeklyProgressChart />
            </Suspense>
          </div>
        </div>

        <div className="grid gap-6 mt-6 grid-cols-1">
          <Suspense fallback={<Skeleton className="h-48" />}>
            <DailyActivityCalendar />
          </Suspense>
        </div>
      </div>
    </AppLayout>
  );
}
