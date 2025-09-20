'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { startOfMonth, endOfMonth, startOfDay } from 'date-fns';
// NEW: Imported Dumbbell for workout logs
import { Utensils, Droplet, Dumbbell, Loader2 } from 'lucide-react';

// A generic interface for any log with a timestamp
interface Log {
  id: string;
  loggedAt: Timestamp;
}

// A specific interface for workout logs which use 'completedAt'
interface WorkoutLog {
    id: string;
    completedAt: Timestamp;
}

export const DailyActivityCalendar = () => {
  const { user, loading: authLoading } = useAuth();
  const [foodLogs, setFoodLogs] = useState<Log[]>([]);
  const [waterLogs, setWaterLogs] = useState<Log[]>([]);
  // NEW: State to hold workout logs
  const [workoutLogs, setWorkoutLogs] = useState<Log[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    if (!user || authLoading) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    const foodLogsRef = collection(db, 'users', user.uid, 'foodLogs');
    const waterLogsRef = collection(db, 'users', user.uid, 'waterLogs');
    // NEW: Reference to the workouts collection
    const workoutLogsRef = collection(db, 'users', user.uid, 'workouts');

    const foodQuery = query(foodLogsRef, where('loggedAt', '>=', Timestamp.fromDate(monthStart)), where('loggedAt', '<=', Timestamp.fromDate(monthEnd)));
    const waterQuery = query(waterLogsRef, where('loggedAt', '>=', Timestamp.fromDate(monthStart)), where('loggedAt', '<=', Timestamp.fromDate(monthEnd)));
    // NEW: Query for completed workouts in the current month
    const workoutQuery = query(workoutLogsRef, where('completedAt', '>=', Timestamp.fromDate(monthStart)), where('completedAt', '<=', Timestamp.fromDate(monthEnd)));

    const unsubFood = onSnapshot(foodQuery, (snap) => setFoodLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as Log))));
    const unsubWater = onSnapshot(waterQuery, (snap) => setWaterLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as Log))));
    // NEW: Listener for workout logs. We map 'completedAt' to 'loggedAt' for consistency.
    const unsubWorkout = onSnapshot(workoutQuery, (snap) => {
        const logs = snap.docs.map(d => {
            const data = d.data() as WorkoutLog;
            return { id: d.id, loggedAt: data.completedAt };
        });
        setWorkoutLogs(logs);
    });
    
    // Set loading to false after a short delay to allow all listeners to fire once.
    const timer = setTimeout(() => setIsLoading(false), 700);

    return () => {
      unsubFood();
      unsubWater();
      // NEW: Unsubscribe from the workout listener on cleanup
      unsubWorkout();
      clearTimeout(timer);
    };
  }, [user, authLoading, currentMonth]);

  const loggedFoodDays = foodLogs.map(log => startOfDay(log.loggedAt.toDate()));
  const loggedWaterDays = waterLogs.map(log => startOfDay(log.loggedAt.toDate()));
  // NEW: Create an array of days with workout logs
  const loggedWorkoutDays = workoutLogs.map(log => startOfDay(log.loggedAt.toDate()));

  const dayHasFoodLog = (day: Date) => loggedFoodDays.some(d => d.getTime() === startOfDay(day).getTime());
  const dayHasWaterLog = (day: Date) => loggedWaterDays.some(d => d.getTime() === startOfDay(day).getTime());
  // NEW: Helper function to check if a day has a workout log
  const dayHasWorkoutLog = (day: Date) => loggedWorkoutDays.some(d => d.getTime() === startOfDay(day).getTime());

  if (authLoading) return <Skeleton className="h-[350px] w-full" />;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Monthly Logging Consistency</CardTitle>
        <CardDescription>Your food, water, and workout activity at a glance.</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-[300px] p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-2 text-sm text-muted-foreground">Loading calendar...</p>
          </div>
        ) : (
          <Calendar
            mode="single"
            selected={new Date()}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            className="p-0"
            components={{
              DayContent: ({ date }) => (
                <div className="relative h-full w-full flex items-center justify-center">
                  <span>{date.getDate()}</span>
                  <div className="absolute bottom-0.5 flex space-x-0.5">
                    {dayHasFoodLog(date) && <Utensils className="h-2.5 w-2.5 text-green-500" title="Food Logged" />}
                    {dayHasWaterLog(date) && <Droplet className="h-2.5 w-2.5 text-blue-500" title="Water Logged" />}
                    {/* NEW: Conditionally render the dumbbell icon if a workout was logged */}
                    {dayHasWorkoutLog(date) && <Dumbbell className="h-2.5 w-2.5 text-red-500" title="Workout Logged" />}
                  </div>
                </div>
              ),
            }}
          />
        )}
      </CardContent>
    </Card>
  );
};
