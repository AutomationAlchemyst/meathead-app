'use client';

import AppLayout from '@/components/layout/AppLayout';
import GreetingHeader from '@/components/dashboard/GreetingHeader';
import TodaysMacrosCard from '@/components/dashboard/TodaysMacrosCard';
import TodaysWaterCard from '@/components/dashboard/TodaysWaterCard';
import CurrentWeightCard from '@/components/dashboard/CurrentWeightCard';
import SmartInsightsCard from '@/components/dashboard/SmartInsightsCard';
import WeeklyProgressChart from '@/components/dashboard/WeeklyProgressChart';
import DailyActivityCalendar from '@/components/dashboard/DailyActivityCalendar';
// --- THE REAL FIX: PART 1 ---
// We REMOVE the import for the old, empty WorkoutActivityCalendar file.
// The DailyActivityCalendar import already covers the other calendar.

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

        {/* --- THE REAL FIX: PART 2 ---
            The user's comment indicates that the two calendars are now one.
            We will display only the DailyActivityCalendar for now. If the workout
            calendar is a separate component, we will add it back after fixing this error.
        */}
        <div className="grid gap-6 mt-6 grid-cols-1">
           <DailyActivityCalendar />
           {/* <WorkoutActivityCalendar />  <-- We keep this commented out to solve the error. */}
        </div>
      </div>
    </AppLayout>
  );
}
