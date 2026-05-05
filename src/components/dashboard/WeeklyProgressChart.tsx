'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, Timestamp, orderBy } from 'firebase/firestore';
import { subDays, format, startOfDay } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Scale } from 'lucide-react';

interface ChartData {
  name: string;
  weight: number | null;
  carbs: number | null;
}

export const WeeklyProgressChart = () => {
    // This component's internal logic remains the same.
    const { user, loading: authLoading } = useAuth();
    const [chartData, setChartData] = useState<ChartData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
  
    useEffect(() => {
      if (!user || authLoading) {
        setIsLoading(false);
        return;
      }
  
      const sevenDaysAgo = startOfDay(subDays(new Date(), 6));
      const weightLogsRef = collection(db, 'users', user.uid, 'weightLogs');
      const foodLogsRef = collection(db, 'users', user.uid, 'foodLogs');
  
      const weightQuery = query(weightLogsRef, where('loggedAt', '>=', Timestamp.fromDate(sevenDaysAgo)), orderBy('loggedAt', 'asc'));
      const foodQuery = query(foodLogsRef, where('loggedAt', '>=', Timestamp.fromDate(sevenDaysAgo)));
  
      const unsubscribeWeight = onSnapshot(weightQuery, (weightSnapshot) => {
        const unsubscribeFood = onSnapshot(foodQuery, (foodSnapshot) => {
          const data: { [key: string]: { weight: number | null, carbs: number } } = {};
  
          for (let i = 0; i < 7; i++) {
            const date = startOfDay(subDays(new Date(), i));
            const name = format(date, 'EEE');
            data[name] = { weight: null, carbs: 0 };
          }
  
          foodSnapshot.forEach(doc => {
            const log = doc.data();
            const date = (log.loggedAt as Timestamp).toDate();
            const name = format(date, 'EEE');
            if (data[name]) {
              data[name].carbs += log.carbs;
            }
          });
  
          weightSnapshot.forEach(doc => {
            const log = doc.data();
            const date = (log.loggedAt as Timestamp).toDate();
            const name = format(date, 'EEE');
            if (data[name]) {
              data[name].weight = log.weight;
            }
          });
          
          // Fill forward for weight
          const orderedKeys = Object.keys(data).reverse();
          let lastWeight: number | null = null;
          for (const key of orderedKeys) {
            if (data[key].weight !== null) {
              lastWeight = data[key].weight;
            } else if (lastWeight !== null) {
              data[key].weight = lastWeight;
            }
          }
  
          setChartData(Object.entries(data).map(([name, values]) => ({ name, ...values })).reverse());
          setIsLoading(false);
        });
        return () => unsubscribeFood();
      });
      return () => unsubscribeWeight();
    }, [user, authLoading]);
  
    if (authLoading || isLoading) return <Skeleton className="h-[200px] w-full" />;

    // Check if there's any data to show
    const hasWeightData = chartData.some(d => d.weight !== null);
    const hasCarbData = chartData.some(d => d.carbs > 0);

    if (!hasWeightData && !hasCarbData) {
        return (
            <Card className="h-full flex flex-col relative overflow-hidden group bg-card/40 backdrop-blur-xl border-border/50">
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <CardHeader className="relative z-10">
                    <CardTitle className="flex items-center text-sm font-headline tracking-wide uppercase text-muted-foreground"><TrendingUp className="mr-2 h-5 w-5 text-primary drop-shadow-[0_0_8px_rgba(13,242,89,0.5)]"/>Weekly Progress</CardTitle>
                    <CardDescription className="text-xs">Your weight and carb intake over the last 7 days.</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow flex items-center justify-center relative z-10">
                    <EmptyState
                        icon={Scale}
                        title="No data yet"
                        description="Start logging your weight and meals to see your progress here."
                        action={{
                            label: "Log Weight",
                            href: "/weight-tracking"
                        }}
                    />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full flex flex-col relative overflow-hidden group bg-card/40 backdrop-blur-xl border-border/50">
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <CardHeader className="relative z-10">
                <CardTitle className="flex items-center text-sm font-headline tracking-wide uppercase text-muted-foreground"><TrendingUp className="mr-2 h-5 w-5 text-primary drop-shadow-[0_0_8px_rgba(13,242,89,0.5)]"/>Weekly Progress</CardTitle>
                <CardDescription className="text-xs">Your weight and carb intake over the last 7 days.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow relative z-10">
                <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                            itemStyle={{ color: 'hsl(var(--foreground))' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                        <Bar yAxisId="left" dataKey="weight" fill="#22d3ee" name="Weight (kg)" radius={[4, 4, 0, 0]} />
                        <Bar yAxisId="right" dataKey="carbs" fill="#0df259" name="Carbs (g)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
};
