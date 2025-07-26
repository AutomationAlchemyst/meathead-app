'use client';

import { Suspense, useEffect, useState } from 'react';
// NEW: Import the 'motion' component from framer-motion
import { motion } from 'framer-motion';
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
import RecentWorkoutsCard from '@/components/dashboard/RecentWorkoutsCard';

// NEW: Define animation variants for a container and its items.
// This allows for a staggered animation effect.
const containerVariants = {
  hidden: { opacity: 1 }, // Start with opacity 1 to prevent a flash of blank content
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1, // Each child will animate 0.1s after the previous one
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 }, // Start 20px below and invisible
  visible: {
    y: 0,
    opacity: 1, // Animate to original position and fully visible
    transition: {
      duration: 0.5,
    },
  },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([]);

  useEffect(() => {
    if (user?.uid) {
      const fetchTodaysData = async () => {
        const logs = await getTodaysFoodLogs(user.uid);
        setFoodLogs(logs);
      };
      fetchTodaysData();
    }
  }, [user?.uid]);

  return (
    <AppLayout>
      <div className="w-full py-6 px-4 md:px-6 lg:px-8 space-y-6">
        <motion.div initial="hidden" animate="visible" variants={itemVariants}>
          <GreetingHeader />
        </motion.div>

        {/* --- Top Cards Section --- */}
        {/* The grid is now a 'motion.div' acting as the animation container */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Each card is wrapped in a 'motion.div' to be animated as an item */}
          <motion.div variants={itemVariants}>
            <Suspense fallback={<Skeleton className="h-40 w-full" />}>
              <StreakCard />
            </Suspense>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Suspense fallback={<Skeleton className="h-40 w-full" />}>
              <CurrentWeightCard />
            </Suspense>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Suspense fallback={<Skeleton className="h-40 w-full" />}>
              <TodaysMacrosCard />
            </Suspense>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Suspense fallback={<Skeleton className="h-40 w-full" />}>
              <TodaysWaterCard />
            </Suspense>
          </motion.div>
        </motion.div>

        {/* --- Main Content Section --- */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* This entire column will animate in as one item */}
          <motion.div className="lg:col-span-2 flex flex-col gap-6" variants={itemVariants}>
            <Suspense fallback={<Skeleton className="h-full min-h-[150px]" />}>
              <SmartInsightsCard foodLogs={foodLogs} />
            </Suspense>
            <Suspense fallback={<Skeleton className="h-full min-h-[200px]" />}>
              <RecentWorkoutsCard />
            </Suspense>
          </motion.div>
          
          {/* The chart will animate in as the next item */}
          <motion.div className="lg:col-span-1" variants={itemVariants}>
            <Suspense fallback={<Skeleton className="h-full min-h-[300px]" />}>
              <WeeklyProgressChart />
            </Suspense>
          </motion.div>
        </motion.div>

        {/* --- Calendar Section --- */}
        <motion.div initial="hidden" animate="visible" variants={itemVariants}>
          <Suspense fallback={<Skeleton className="h-48 w-full" />}>
            <DailyActivityCalendar />
          </Suspense>
        </motion.div>
      </div>
    </AppLayout>
  );
}
