
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import type { WorkoutLog } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, Timestamp, where } from 'firebase/firestore'; // Added 'where' import
import { formatDistanceToNow, format, startOfDay, endOfDay } from 'date-fns';
import Link from 'next/link';
import { Button } from '../ui/button';
import { Dumbbell, ListChecks, Info, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';

export default function RecentWorkoutsCard() {
  const { user, loading: authLoading } = useAuth();
  const [recentWorkouts, setRecentWorkouts] = useState<WorkoutLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workoutLoggedToday, setWorkoutLoggedToday] = useState(false);

  useEffect(() => {
    if (authLoading) {
      setIsLoading(true);
      return;
    }

    if (user) {
      setIsLoading(true);
      setError(null);
      setWorkoutLoggedToday(false);

      const today = new Date();
      const todayStart = startOfDay(today);
      const todayEnd = endOfDay(today);

      const workoutLogsRef = collection(db, 'users', user.uid, 'workoutLogs');
      
      const recentQuery = query(workoutLogsRef, orderBy('completedAt', 'desc'), limit(5));
      const unsubscribeRecent = onSnapshot(recentQuery, (querySnapshot) => {
        const workouts: WorkoutLog[] = [];
        querySnapshot.forEach((doc) => {
          workouts.push({ id: doc.id, ...doc.data() } as WorkoutLog);
        });
        setRecentWorkouts(workouts);
      }, (err) => {
        console.error("Error fetching recent workouts:", err);
        setError("Could not load recent workouts list.");
        setRecentWorkouts([]);
      });

      const todayQuery = query(
        workoutLogsRef, 
        where('completedAt', '>=', Timestamp.fromDate(todayStart)),
        where('completedAt', '<=', Timestamp.fromDate(todayEnd)),
        limit(1) 
      );
      const unsubscribeToday = onSnapshot(todayQuery, (querySnapshot) => {
        setWorkoutLoggedToday(!querySnapshot.empty);
        setIsLoading(false); 
      }, (err) => {
        console.error("Error checking for today's workout:", err);
        setWorkoutLoggedToday(false);
        setIsLoading(false);
      });


      return () => {
        unsubscribeRecent();
        unsubscribeToday();
      };
    } else {
      setRecentWorkouts([]);
      setWorkoutLoggedToday(false);
      setIsLoading(false);
    }
  }, [user, authLoading]);

  if (authLoading || isLoading) {
    return (
      <Card className="shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold text-primary flex items-center">
              <ListChecks className="mr-2 h-6 w-6" /> Recent Workouts
            </CardTitle>
          </div>
          <CardDescription className="flex items-center text-xs text-muted-foreground pt-1">
            <Loader2 className="h-3 w-3 animate-spin mr-1"/>Loading status...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3 p-2 rounded-md bg-muted/50">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-lg">
        <CardHeader className="pb-2">
           <CardTitle className="text-xl font-semibold text-primary flex items-center">
            <ListChecks className="mr-2 h-6 w-6" /> Recent Workouts
          </CardTitle>
          <CardDescription className="flex items-center text-xs text-destructive pt-1">
            <Info className="h-3 w-3 mr-1"/>Error loading workouts
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
           <Alert variant="destructive">
            <Info className="h-5 w-5" />
            <AlertDescription>{error}</AlertDescription>
           </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold text-primary flex items-center">
            <ListChecks className="mr-2 h-6 w-6" /> Recent Workouts
            </CardTitle>
        </div>
        {workoutLoggedToday ? (
            <CardDescription className="flex items-center text-xs text-green-600 pt-1">
                <CheckCircle2 className="h-3 w-3 mr-1"/> Workout logged today!
            </CardDescription>
        ) : (
            <CardDescription className="flex items-center text-xs text-muted-foreground pt-1">
                <Circle className="h-3 w-3 mr-1 text-muted-foreground/70"/> No workout logged today.
            </CardDescription>
        )}
      </CardHeader>
      <CardContent className="pt-2">
        {recentWorkouts.length > 0 ? (
          <ul className="space-y-3">
            {recentWorkouts.map((workout) => (
              <li key={workout.id} className="flex items-center space-x-3 p-3 rounded-lg bg-card hover:bg-muted/50 transition-colors">
                <Dumbbell className="h-6 w-6 text-secondary flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-sm text-foreground">
                    {workout.planName} - {workout.dayName || `Day ${workout.dayNumber}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Focus: {workout.focus}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Completed: {workout.completedAt instanceof Timestamp ? 
                      format(workout.completedAt.toDate(), 'MMM d, yyyy') + ` (${formatDistanceToNow(workout.completedAt.toDate(), { addSuffix: true })})` 
                      : 'Date unavailable'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-4">
            <Dumbbell className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No workouts logged yet.</p>
            <Button variant="link" asChild className="mt-1 text-primary">
              <Link href="/workout-planner">Plan & Log a Workout!</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
