
'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import type { WorkoutLog, FoodLog, WaterLog } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { format, startOfMonth, endOfMonth, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { Activity, AlertTriangle, CalendarDays, Droplets, Utensils } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DailyLogStatus {
  meal: boolean;
  water: boolean;
  workout: boolean;
}

export default function DailyActivityCalendar() {
  const { user, loading: authLoading } = useAuth();
  const [loggedDataByDate, setLoggedDataByDate] = useState<Map<string, DailyLogStatus>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDisplayMonth, setCurrentDisplayMonth] = useState<Date>(startOfMonth(new Date()));

  useEffect(() => {
    if (authLoading) {
      setIsLoading(true);
      return;
    }

    if (user) {
      setIsLoading(true);
      setError(null);

      const monthStart = startOfMonth(currentDisplayMonth);
      const monthEnd = endOfMonth(currentDisplayMonth);

      let foodLogsLoaded = false;
      let waterLogsLoaded = false;
      let workoutLogsLoaded = false;

      const fetchedFoodLogs: Map<string, boolean> = new Map();
      const fetchedWaterLogs: Map<string, boolean> = new Map();
      const fetchedWorkoutLogs: Map<string, boolean> = new Map();
      
      const checkAllDataLoaded = () => {
        if (foodLogsLoaded && waterLogsLoaded && workoutLogsLoaded) {
          const newLoggedData = new Map<string, DailyLogStatus>();
          const daysInMonth = Array.from({ length: currentDisplayMonth.getDate() }, (_, i) => new Date(currentDisplayMonth.getFullYear(), currentDisplayMonth.getMonth(), i + 1));
          
          for (const day of daysInMonth) {
             const dateStr = format(day, 'yyyy-MM-dd');
             newLoggedData.set(dateStr, {
                meal: fetchedFoodLogs.has(dateStr) || false,
                water: fetchedWaterLogs.has(dateStr) || false,
                workout: fetchedWorkoutLogs.has(dateStr) || false,
             });
          }
          // Populate for all days in the current view of the calendar
          const tempDate = new Date(monthStart);
          while(tempDate <= monthEnd) {
            const dateStr = format(tempDate, 'yyyy-MM-dd');
            if (!newLoggedData.has(dateStr)) {
                newLoggedData.set(dateStr, {
                    meal: fetchedFoodLogs.has(dateStr) || false,
                    water: fetchedWaterLogs.has(dateStr) || false,
                    workout: fetchedWorkoutLogs.has(dateStr) || false,
                });
            }
            tempDate.setDate(tempDate.getDate() + 1);
          }

          setLoggedDataByDate(newLoggedData);
          setIsLoading(false);
        }
      };

      // Food Logs Listener
      const foodLogsRef = collection(db, 'users', user.uid, 'foodLogs');
      const foodQuery = query(foodLogsRef, where('loggedAt', '>=', Timestamp.fromDate(monthStart)), where('loggedAt', '<=', Timestamp.fromDate(monthEnd)));
      const unsubFood = onSnapshot(foodQuery, (snapshot) => {
        fetchedFoodLogs.clear();
        snapshot.forEach(doc => {
          const log = doc.data() as FoodLog;
          if (log.loggedAt instanceof Timestamp) fetchedFoodLogs.set(format(log.loggedAt.toDate(), 'yyyy-MM-dd'), true);
        });
        foodLogsLoaded = true;
        checkAllDataLoaded();
      }, (err) => { console.error("Error fetching food logs:", err); foodLogsLoaded = true; checkAllDataLoaded(); setError("Failed to load food logs."); });

      // Water Logs Listener
      const waterLogsRef = collection(db, 'users', user.uid, 'waterLogs');
      const waterQuery = query(waterLogsRef, where('loggedAt', '>=', Timestamp.fromDate(monthStart)), where('loggedAt', '<=', Timestamp.fromDate(monthEnd)));
      const unsubWater = onSnapshot(waterQuery, (snapshot) => {
        fetchedWaterLogs.clear();
        snapshot.forEach(doc => {
          const log = doc.data() as WaterLog;
          if (log.loggedAt instanceof Timestamp) fetchedWaterLogs.set(format(log.loggedAt.toDate(), 'yyyy-MM-dd'), true);
        });
        waterLogsLoaded = true;
        checkAllDataLoaded();
      }, (err) => { console.error("Error fetching water logs:", err); waterLogsLoaded = true; checkAllDataLoaded(); setError("Failed to load water logs."); });

      // Workout Logs Listener
      const workoutLogsRef = collection(db, 'users', user.uid, 'workoutLogs');
      const workoutQuery = query(workoutLogsRef, where('completedAt', '>=', Timestamp.fromDate(monthStart)), where('completedAt', '<=', Timestamp.fromDate(monthEnd)));
      const unsubWorkout = onSnapshot(workoutQuery, (snapshot) => {
        fetchedWorkoutLogs.clear();
        snapshot.forEach(doc => {
          const log = doc.data() as WorkoutLog;
          if (log.completedAt instanceof Timestamp) fetchedWorkoutLogs.set(format(log.completedAt.toDate(), 'yyyy-MM-dd'), true);
        });
        workoutLogsLoaded = true;
        checkAllDataLoaded();
      }, (err) => { console.error("Error fetching workout logs:", err); workoutLogsLoaded = true; checkAllDataLoaded(); setError("Failed to load workout logs."); });

      return () => {
        unsubFood();
        unsubWater();
        unsubWorkout();
      };
    } else {
      setLoggedDataByDate(new Map());
      setIsLoading(false);
    }
  }, [user, authLoading, currentDisplayMonth]);

  const handleMonthChange = (month: Date) => {
    setCurrentDisplayMonth(startOfMonth(month));
  };
  
  const DayContentWithDots = ({ date }: { date: Date }): ReactNode => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const status = loggedDataByDate.get(dateStr);
    const dotBaseClass = "h-1.5 w-1.5 rounded-full";

    return (
      <div className="relative flex flex-col items-center justify-center h-full w-full">
        {format(date, "d")}
        {status && (status.meal || status.water || status.workout) && (
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex space-x-0.5">
            {status.meal && <div className={cn(dotBaseClass, "bg-red-500")} title="Meal logged"></div>}
            {status.water && <div className={cn(dotBaseClass, "bg-blue-500")} title="Water logged"></div>}
            {status.workout && <div className={cn(dotBaseClass, "bg-green-500")} title="Workout logged"></div>}
          </div>
        )}
      </div>
    );
  };

  const calendarModifiers = {
    loggedAllThree: (date: Date) => {
      const status = loggedDataByDate.get(format(date, 'yyyy-MM-dd'));
      return !!status && status.meal && status.water && status.workout;
    },
    // Add individual modifiers if specific styling beyond dots is needed for 1 or 2 logs
    // For now, the dots handle the individual category indication.
  };

  const calendarModifiersClassNames = {
    loggedAllThree: 'bg-yellow-100 dark:bg-yellow-800/30 rounded-md',
    // Example for partial logging, if needed. Not used for now with dot approach.
    // loggedOne: 'bg-orange-100 dark:bg-orange-800/30 rounded-md', 
    // loggedTwo: 'bg-teal-100 dark:bg-teal-800/30 rounded-md',
  };


  if (authLoading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <Skeleton className="h-6 w-3/4 mb-1" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent className="flex justify-center items-center py-6">
          <Skeleton className="h-[300px] w-[350px] rounded-md" />
        </CardContent>
        <CardFooter><Skeleton className="h-10 w-full" /></CardFooter>
      </Card>
    );
  }
  
  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-primary flex items-center">
          <CalendarDays className="mr-2 h-6 w-6" /> Daily Logging Consistency
        </CardTitle>
        <CardDescription>
          Track your consistency in logging meals, water, and workouts. Dots indicate logged activities.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center py-4">
        {isLoading ? (
          <Skeleton className="h-[280px] w-[320px] sm:h-[300px] sm:w-[350px] rounded-md" />
        ) : error ? (
          <Alert variant="destructive" className="w-full max-w-md">
            <AlertTriangle className="h-5 w-5" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <Calendar
            mode="single" 
            month={currentDisplayMonth}
            onMonthChange={handleMonthChange}
            className="p-0 [&_button]:text-base sm:[&_button]:text-sm"
            classNames={{
              day: cn("h-10 w-10 sm:h-9 sm:w-9 hover:bg-accent/50 rounded-md"),
              day_today: "bg-accent text-accent-foreground font-bold",
            }}
            modifiers={calendarModifiers}
            modifiersClassNames={calendarModifiersClassNames}
            components={{ DayContent: DayContentWithDots }}
            showOutsideDays={true}
            fixedWeeks
            disabled={isLoading}
          />
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-center items-center gap-x-4 gap-y-2 text-xs text-muted-foreground pt-3 border-t">
        <div className="flex items-center"><span className="h-3 w-3 rounded-full bg-red-500 mr-1.5"></span>Meal</div>
        <div className="flex items-center"><span className="h-3 w-3 rounded-full bg-blue-500 mr-1.5"></span>Water</div>
        <div className="flex items-center"><span className="h-3 w-3 rounded-full bg-green-500 mr-1.5"></span>Workout</div>
        <div className="flex items-center"><span className="h-3 w-3 rounded-md bg-yellow-100 dark:bg-yellow-800/30 border border-yellow-300 dark:border-yellow-600 mr-1.5"></span>All Three</div>
      </CardFooter>
    </Card>
  );
}

