
'use client';

import { useEffect, useState } from 'react';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, parseISO } from 'date-fns';
import { Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, ReferenceLine } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { useAuth } from '@/hooks/useAuth';
import type { FoodLog, WeightLog } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart, TrendingUp, Wheat } from 'lucide-react'; // Added LineChart for a generic icon
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';

const chartConfig = {
  actualCarbs: {
    label: "Carbs (g)",
    color: "hsl(var(--chart-1))",
  },
  targetCarbs: { // For the reference line
    label: "Target Max Carbs (20g)",
    color: "hsl(var(--chart-2))",
  },
  weight: {
    label: "Weight (kg)",
    color: "hsl(var(--chart-3))",
  }
} satisfies ChartConfig;

interface DailyProgressData {
  date: string; // Formatted as 'MMM d'
  shortDate: string; // Formatted as 'E' (e.g., Mon)
  fullDate: string; // Formatted as 'yyyy-MM-dd'
  actualCarbs: number;
  targetCarbs: number; // Fixed target
  weight: number | null; // Weight can be null if not logged for that day
}

const MAX_CARBS_TARGET = 20;

export default function WeeklyProgressChart() { 
  const { user, loading: authLoading } = useAuth();
  const [chartData, setChartData] = useState<DailyProgressData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      setIsLoading(true);
      return;
    }

    if (user) {
      setIsLoading(true);
      
      const today = new Date();
      const sevenDaysAgo = startOfDay(subDays(today, 6));
      const dateInterval = eachDayOfInterval({ start: sevenDaysAgo, end: today });

      // Initialize data structure for the chart
      const initialDailyData = dateInterval.map(date => ({
        date: format(date, 'MMM d'),
        shortDate: format(date, 'E'),
        fullDate: format(date, 'yyyy-MM-dd'),
        actualCarbs: 0,
        targetCarbs: MAX_CARBS_TARGET,
        weight: null,
      }));
      
      let foodLogsData: FoodLog[] = [];
      let weightLogsData: WeightLog[] = [];
      let foodLogsLoaded = false;
      let weightLogsLoaded = false;

      const processAndSetChartData = () => {
        if (!foodLogsLoaded || !weightLogsLoaded) return;

        const newChartData = initialDailyData.map(dayData => {
          // Aggregate carbs for the day
          const dailyFoodLogs = foodLogsData.filter(log => {
            if (log.loggedAt instanceof Timestamp) {
              return format(log.loggedAt.toDate(), 'yyyy-MM-dd') === dayData.fullDate;
            }
            return false;
          });
          const totalCarbs = dailyFoodLogs.reduce((sum, log) => sum + log.carbs, 0);

          // Find weight for the day (taking the last entry if multiple)
          const dailyWeightLogs = weightLogsData
            .filter(log => {
              if (log.loggedAt instanceof Timestamp) {
                return format(log.loggedAt.toDate(), 'yyyy-MM-dd') === dayData.fullDate;
              }
              return false;
            })
            .sort((a, b) => (b.loggedAt as Timestamp).toMillis() - (a.loggedAt as Timestamp).toMillis()); // Sort descending by time
          
          return {
            ...dayData,
            actualCarbs: totalCarbs,
            weight: dailyWeightLogs.length > 0 ? dailyWeightLogs[0].weight : null,
          };
        });
        setChartData(newChartData);
        setIsLoading(false);
      };
      
      // Food Logs Listener
      const foodLogsRef = collection(db, 'users', user.uid, 'foodLogs');
      const foodQuery = query(
        foodLogsRef,
        where('loggedAt', '>=', Timestamp.fromDate(sevenDaysAgo)),
        where('loggedAt', '<=', Timestamp.fromDate(endOfDay(today)))
      );
      const unsubscribeFoodLogs = onSnapshot(foodQuery, (querySnapshot) => {
        foodLogsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FoodLog));
        foodLogsLoaded = true;
        processAndSetChartData();
      }, (error) => {
        console.error("Error fetching food logs for progress chart:", error);
        foodLogsLoaded = true; // Mark as loaded to allow processing even if error
        processAndSetChartData();
      });

      // Weight Logs Listener
      const weightLogsRef = collection(db, 'users', user.uid, 'weightLogs');
      const weightQuery = query(
        weightLogsRef,
        where('loggedAt', '>=', Timestamp.fromDate(sevenDaysAgo)),
        where('loggedAt', '<=', Timestamp.fromDate(endOfDay(today)))
      );
      const unsubscribeWeightLogs = onSnapshot(weightQuery, (querySnapshot) => {
        weightLogsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WeightLog));
        weightLogsLoaded = true;
        processAndSetChartData();
      }, (error) => {
        console.error("Error fetching weight logs for progress chart:", error);
        weightLogsLoaded = true; // Mark as loaded to allow processing
        processAndSetChartData();
      });

      return () => {
        unsubscribeFoodLogs();
        unsubscribeWeightLogs();
      };
    } else {
      setChartData([]);
      setIsLoading(false);
    }
  }, [user, authLoading]);

  if (isLoading) {
    return (
      <div className="h-[300px] w-full">
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  if (chartData.length === 0 && !user) {
     return (
      <div className="flex flex-col items-center justify-center h-[300px] text-center">
        <LineChart className="h-12 w-12 text-muted-foreground mb-4" /> {/* Generic icon */}
        <p className="text-lg font-medium text-foreground">Login to see your weekly progress</p>
      </div>
    );
  }
  
  if (chartData.every(d => d.actualCarbs === 0 && d.weight === null) && user) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] text-center">
        <LineChart className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium text-foreground">No Data Logged This Week</p>
        <p className="text-sm text-muted-foreground">Log meals and weight to see your progress.</p>
      </div>
    );
  }
  
  const yMaxCarbs = Math.max(...chartData.map(d => d.actualCarbs), MAX_CARBS_TARGET, 30) * 1.1;
  const weights = chartData.map(d => d.weight).filter(w => w !== null) as number[];
  const yMinWeight = weights.length > 0 ? Math.min(...weights) - 2 : 0;
  const yMaxWeight = weights.length > 0 ? Math.max(...weights) + 2 : 50; // Default max if no weight

  return (
    <div className="h-[300px] w-full">
      <ChartContainer config={chartConfig} className="h-full w-full">
        <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="shortDate"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            fontSize={12}
          />
          <YAxis
            yAxisId="left"
            orientation="left"
            stroke="var(--color-actualCarbs)"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            fontSize={12}
            domain={[0, yMaxCarbs]}
            tickFormatter={(value) => `${value.toFixed(0)}g`}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="var(--color-weight)"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            fontSize={12}
            domain={[yMinWeight, yMaxWeight]}
            tickFormatter={(value) => `${value.toFixed(1)}kg`}
          />
          <Tooltip
            content={<ChartTooltipContent 
                        formatter={(value, name, props) => {
                            if (name === 'actualCarbs' && typeof value === 'number') {
                                return [`${value.toFixed(1)} g`, chartConfig.actualCarbs.label];
                            }
                            if (name === 'weight' && typeof value === 'number') {
                                return [`${value.toFixed(1)} kg`, chartConfig.weight.label];
                            }
                            if (name === 'weight' && value === null) {
                                return ['N/A', chartConfig.weight.label];
                            }
                            return [value, name];
                        }}
                        labelFormatter={(label, payload) => {
                            if(payload && payload.length > 0 && payload[0].payload.fullDate) {
                                return format(parseISO(payload[0].payload.fullDate), 'EEEE, MMM d');
                            }
                            return label;
                        }}
                    />} 
            cursor={{ fill: 'hsl(var(--muted))', radius: 4 }}
          />
          <Legend verticalAlign="top" height={36} content={({ payload }) => {
             if (!payload) return null;
             const filteredPayload = payload.filter(p => p.dataKey !== 'targetCarbs'); // Exclude targetCarbs line from legend items
             return (
                <div className="flex items-center justify-center gap-4 pt-3">
                    {filteredPayload.map((entry, index) => (
                        <div key={`item-${index}`} className="flex items-center gap-1.5">
                            <div className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: entry.color }} />
                            {entry.dataKey === 'actualCarbs' ? chartConfig.actualCarbs.label : chartConfig.weight.label}
                        </div>
                    ))}
                    <div className="flex items-center gap-1.5">
                        <svg width="12" height="2" viewBox="0 0 12 2" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-2 w-3">
                            <line x1="0" y1="1" x2="12" y2="1" stroke={chartConfig.targetCarbs.color} strokeWidth="2" strokeDasharray="3 3"/>
                        </svg>
                        {chartConfig.targetCarbs.label}
                    </div>
                </div>
             )
          }} />
          <ReferenceLine 
              y={MAX_CARBS_TARGET} 
              yAxisId="left"
              stroke={chartConfig.targetCarbs.color} 
              strokeDasharray="3 3" 
              strokeWidth={2}
              ifOverflow="visible" // Ensures line is drawn even if data is outside its range initially
          />
          <Bar dataKey="actualCarbs" yAxisId="left" fill="var(--color-actualCarbs)" radius={4} barSize={20} />
          <Line type="monotone" dataKey="weight" yAxisId="right" strokeWidth={2} stroke="var(--color-weight)" dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls={false} />
        </ComposedChart>
      </ChartContainer>
    </div>
  );
}

