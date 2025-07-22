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

    return (
        <Card className="shadow-lg h-full">
            <CardHeader>
                <CardTitle className="flex items-center"><TrendingUp className="mr-2 h-6 w-6 text-primary"/>Weekly Progress</CardTitle>
                <CardDescription>Your weight and carb intake over the last 7 days.</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis yAxisId="left" stroke="#8884d8" />
                        <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="left" dataKey="weight" fill="#8884d8" name="Weight (kg)" />
                        <Bar yAxisId="right" dataKey="carbs" fill="#82ca9d" name="Carbs (g)" />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
};
