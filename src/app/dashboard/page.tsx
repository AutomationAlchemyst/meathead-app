'use client';

import AppLayout from '@/components/layout/AppLayout';
// --- THE FIX ---
// We now use named imports for ALL dashboard components.
import { GreetingHeader } from '@/components/dashboard/GreetingHeader';
import { TodaysMacrosCard } from '@/components/dashboard/TodaysMacrosCard';
import { TodaysWaterCard } from '@/components/dashboard/TodaysWaterCard';
import { CurrentWeightCard } from '@/components/dashboard/CurrentWeightCard';
import { SmartInsightsCard } from '@/components/dashboard/SmartInsightsCard';
import { WeeklyProgressChart } from '@/components/dashboard/WeeklyProgressChart';
import { DailyActivityCalendar } from '@/components/dashboard/DailyActivityCalendar';
import { StreakCard } from '@/components/dashboard/StreakCard';

export default function DashboardPage() {
  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4">
        <GreetingHeader />
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <StreakCard />
          <CurrentWeightCard />
          <TodaysMacrosCard />
          <TodaysWaterCard />
        </div>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SmartInsightsCard />
          </div>
          <div>
            <WeeklyProgressChart />
          </div>
        </div>

        <div className="grid gap-6 mt-6 grid-cols-1">
           <DailyActivityCalendar />
        </div>
      </div>
    </AppLayout>
  );
}