'use client';

import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { FoodLog } from '@/types';
import { Button } from '@/components/ui/button';
import { Loader2, ListChecks, Trash2, Utensils } from 'lucide-react';
import { startOfDay, endOfDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, Timestamp, orderBy } from 'firebase/firestore';
import { EmptyState } from '@/components/ui/empty-state';
import { deleteFoodLog } from '@/actions/food';
import { useToast } from '@/hooks/use-toast';
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

interface FoodLogItemProps {
  log: FoodLog;
  userId: string;
}

function FoodLogItem({ log, userId }: FoodLogItemProps): ReactElement {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!userId || !log.id) return;
    setIsDeleting(true);
    try {
      const result = await deleteFoodLog(userId, log.id);
      if (result.success) {
        toast({ title: "Meal Deleted", description: `"${log.foodItem}" has been removed.` });
      } else {
        throw new Error(result.error || "Could not delete log.");
      }
    } catch (error: any) {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <li className="flex items-center justify-between py-3 px-4 odd:bg-muted/30 even:bg-card rounded-md shadow-sm hover:shadow-md transition-shadow">
      <div className="flex-grow pr-4">
        <p className="font-semibold text-foreground capitalize">{log.foodItem} ({log.quantity})</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {log.calories.toFixed(0)} kcal &bull; P: {log.protein.toFixed(1)}g &bull; C: {log.carbs.toFixed(1)}g &bull; F: {log.fat.toFixed(1)}g
        </p>
      </div>
      <div className="flex items-center">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive/80 hover:bg-destructive/10" disabled={isDeleting}>
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-card/90 backdrop-blur-xl border-border/50">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this meal log?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this entry? This will update your macros and calories for the day.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </li>
  );
}

export const TodaysFoodLogList = (): ReactElement => {
    const { user, loading: authLoading } = useAuth();
    const [logs, setLogs] = useState<FoodLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
  
    useEffect(() => {
      if (authLoading) { setIsLoading(true); return; }
      if (!user) { setLogs([]); setIsLoading(false); return; }
  
      setIsLoading(true);
      const todayStart = startOfDay(new Date());
      const todayEnd = endOfDay(new Date());
      const foodLogsRef = collection(db, 'users', user.uid, 'foodLogs');
      const q = query(foodLogsRef, where('loggedAt', '>=', Timestamp.fromDate(todayStart)), where('loggedAt', '<=', Timestamp.fromDate(todayEnd)), orderBy('loggedAt', 'desc'));
  
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const fetchedLogs: FoodLog[] = [];
        querySnapshot.forEach((doc) => { fetchedLogs.push({ id: doc.id, ...doc.data() } as FoodLog); });
        setLogs(fetchedLogs);
        setIsLoading(false);
      }, (error) => {
        console.error("TodaysFoodLogList onSnapshot error:", error);
        setIsLoading(false);
      });
  
      return () => unsubscribe();
    }, [user, authLoading]);

    if (isLoading) return <div className="text-center p-4"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>;
    
    if (logs.length === 0) {
        return (
            <div className="mt-8">
                <EmptyState
                    icon={Utensils}
                    title="No meals logged yet"
                    description="Start tracking your meals to see your macros and progress here."
                    action={{
                        label: "Log Your First Meal",
                        href: "/food-logging"
                    }}
                />
            </div>
        );
    }

    return (
        <Card className="mt-8 shadow-lg bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden">
          <CardHeader className="bg-primary/5 border-b border-border/30">
            <CardTitle className="text-xl font-headline text-primary flex items-center">
              <ListChecks className="mr-2 h-6 w-6" />Today's Logged Meals
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ul className="space-y-3">
              {logs.map((log) => (
                <FoodLogItem key={log.id} log={log} userId={user!.uid} />
              ))}
            </ul>
          </CardContent>
        </Card>
      );
};