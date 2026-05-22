
'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { useAuth } from '@/contexts/AuthContext';
import type { WeightLog } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Trash2, Loader2, Scale } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { deleteWeightLog } from '@/actions/weight';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  const { toast } = useToast();
  const [weightData, setWeightData] = useState<ChartWeightEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const handleDelete = async (logId: string) => {
    if (!user) return;
    setDeletingId(logId);
    try {
      const result = await deleteWeightLog(user.uid, logId);
      if (result.success) {
        toast({ title: "Weight Log Deleted", description: "The weight entry has been successfully removed." });
      } else {
        throw new Error(result.error || "Could not delete weight log.");
      }
    } catch (error: any) {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

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

  const recentLogs = [...weightData].reverse();

  return (
    <div className="flex flex-col space-y-8">
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

      <div className="border-t border-border/50 pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-headline text-primary flex items-center">
            <Scale className="mr-2 h-5 w-5" /> Recent Weight Logs
          </h3>
          <span className="text-xs text-muted-foreground">{recentLogs.length} logs total</span>
        </div>

        <div className="max-h-[250px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
          {recentLogs.map((log) => (
            <div key={log.id} className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-card/40 hover:bg-card/70 transition-colors">
              <div className="flex items-center space-x-4">
                <div className="bg-primary/10 text-primary p-2 rounded-md">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{log.weight.toFixed(1)} kg</p>
                  <p className="text-xs text-muted-foreground">{format(log.loggedAt, 'PPP')}</p>
                </div>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                    disabled={deletingId !== null}
                  >
                    {deletingId === log.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-card/90 backdrop-blur-xl border-border/50">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this weight log?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this weight log of {log.weight.toFixed(1)} kg logged on {format(log.loggedAt, 'PPP')}?
                      This will update your current weight profile.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => handleDelete(log.id)} 
                      disabled={deletingId !== null}
                      className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                    >
                      {deletingId === log.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

