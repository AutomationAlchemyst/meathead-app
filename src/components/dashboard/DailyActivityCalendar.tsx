'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { startOfMonth, endOfMonth, startOfDay } from 'date-fns';
import { Utensils, Droplet, Loader2 } from 'lucide-react';

interface Log { id: string; loggedAt: Timestamp; }

export const DailyActivityCalendar = () => {
    // This component's internal logic remains the same.
    const { user, loading: authLoading } = useAuth();
    const [foodLogs, setFoodLogs] = useState<Log[]>([]);
    const [waterLogs, setWaterLogs] = useState<Log[]>([]);
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
  
      const foodQuery = query(foodLogsRef, where('loggedAt', '>=', Timestamp.fromDate(monthStart)), where('loggedAt', '<=', Timestamp.fromDate(monthEnd)));
      const waterQuery = query(waterLogsRef, where('loggedAt', '>=', Timestamp.fromDate(monthStart)), where('loggedAt', '<=', Timestamp.fromDate(monthEnd)));
  
      const unsubFood = onSnapshot(foodQuery, (snap) => setFoodLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as Log))));
      const unsubWater = onSnapshot(waterQuery, (snap) => setWaterLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as Log))));
      
      // A simple way to handle loading state for multiple listeners
      Promise.all([new Promise(res => setTimeout(res, 500))]).then(() => setIsLoading(false));

      return () => { unsubFood(); unsubWater(); };
    }, [user, authLoading, currentMonth]);
  
    const loggedFoodDays = foodLogs.map(log => startOfDay(log.loggedAt.toDate()));
    const loggedWaterDays = waterLogs.map(log => startOfDay(log.loggedAt.toDate()));
  
    const dayHasFoodLog = (day: Date) => loggedFoodDays.some(d => d.getTime() === startOfDay(day).getTime());
    const dayHasWaterLog = (day: Date) => loggedWaterDays.some(d => d.getTime() === startOfDay(day).getTime());

    if (authLoading) return <Skeleton className="h-[350px] w-full" />;

    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle>Monthly Logging Consistency</CardTitle>
                <CardDescription>Your food and water logging activity at a glance.</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
            {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="mt-2 text-sm text-muted-foreground">Loading calendar...</p>
                </div>
            ) : (
                <Calendar
                    mode="single"
                    selected={new Date()}
                    onMonthChange={setCurrentMonth}
                    className="p-0"
                    components={{
                        DayContent: ({ date }) => (
                            <div className="relative h-full w-full flex items-center justify-center">
                                <span>{date.getDate()}</span>
                                <div className="absolute bottom-0.5 flex space-x-0.5">
                                    {dayHasFoodLog(date) && <Utensils className="h-2.5 w-2.5 text-green-500" />}
                                    {dayHasWaterLog(date) && <Droplet className="h-2.5 w-2.5 text-blue-500" />}
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
