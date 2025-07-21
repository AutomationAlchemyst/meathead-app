
'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { useAuth } from '@/hooks/useAuth';
import type { WeightLog } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';

const chartConfig = {
  weight: {
    label: "Weight (kg)",
    color: "hsl(var(--chart-1))", // Use chart-1 for consistency, maps to primary by default
  },
} satisfies ChartConfig;

// Define a type for the data used by the chart
type ChartWeightEntry = {
  id: string;
  date: string; // Formatted date string for XAxis
  weight: number;
  loggedAt: Date; // Original Date object for potential tooltips or other logic
};

export default function WeightHistoryChart() {
  const { user, loading: authLoading } = useAuth();
  const [weightData, setWeightData] = useState<ChartWeightEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      setIsLoading(true);
      return;
    }

    if (user) {
      setIsLoading(true);
      const weightLogsRef = collection(db, 'users', user.uid, 'weightLogs');
      const q = query(weightLogsRef, orderBy('loggedAt', 'asc'), limit(90)); // Order by asc for chronological

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const history: ChartWeightEntry[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data() as Omit<WeightLog, 'id' | 'userId'>;
          const loggedAtTimestamp = data.loggedAt as Timestamp;
          
          if (loggedAtTimestamp) { // Ensure loggedAt exists and is a Timestamp
            const loggedAtDate = loggedAtTimestamp.toDate();
            history.push({
              id: doc.id,
              weight: data.weight,
              loggedAt: loggedAtDate,
              date: format(loggedAtDate, 'MMM d'), // Format date for X-axis
            });
          }
        });
        setWeightData(history); // Data is already chronological due to orderBy 'asc'
        setIsLoading(false);
      }, (error) => {
        console.error("Error fetching weight history with onSnapshot:", error);
        setWeightData([]);
        setIsLoading(false);
      });

      return () => unsubscribe(); // Cleanup listener on component unmount or user change
    } else {
      // No user, clear data and set loading to false
      setWeightData([]);
      setIsLoading(false);
    }
  }, [user, authLoading]);

  if (isLoading) { // Simplified loading check
    return (
      <div className="h-[350px] w-full">
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  if (weightData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[350px] text-center">
        <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium text-foreground">No Weight Data Yet</p>
        <p className="text-sm text-muted-foreground">Start logging your weight to see your progress here.</p>
      </div>
    );
  }
  
  const yDomain: [number, number] = [
    Math.min(...weightData.map(d => d.weight)) - 2, // Adjusted padding slightly
    Math.max(...weightData.map(d => d.weight)) + 2  // Adjusted padding slightly
  ];


  return (
    <div className="h-[350px] w-full">
      <ChartContainer config={chartConfig} className="h-full w-full">
        <AreaChart data={weightData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis 
            dataKey="date" 
            tickLine={false} 
            axisLine={false} 
            tickMargin={8}
            fontSize={12}
          />
          <YAxis 
            tickLine={false} 
            axisLine={false} 
            tickMargin={8} 
            fontSize={12}
            domain={yDomain}
            tickFormatter={(value) => `${value.toFixed(1)}kg`} // Ensure one decimal place for Y-axis
          />
          <Tooltip 
            content={<ChartTooltipContent indicator="dot" />} 
            formatter={(value, name, props) => {
              if (typeof value === 'number') {
                return [`${value.toFixed(1)} kg`, 'Weight'];
              }
              return [value, name];
            }}
          />
          <Legend />
          <defs>
            <linearGradient id="fillWeight" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-weight)" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="var(--color-weight)" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <Area
            dataKey="weight"
            type="monotone"
            fill="url(#fillWeight)"
            stroke="var(--color-weight)"
            strokeWidth={2}
            stackId="a" // Not strictly necessary for single Area, but harmless
            dot={{
              r: 3,
              strokeWidth: 1,
              fill: "var(--color-weight)"
            }}
            activeDot={{
              r: 5,
              strokeWidth: 2,
              stroke: "var(--background)",
              fill: "var(--color-weight)",
            }}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
