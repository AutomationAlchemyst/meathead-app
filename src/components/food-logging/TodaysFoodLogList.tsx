'use client';

import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { FoodLog } from '@/types';
import { Button } from '@/components/ui/button';
import { Loader2, ListChecks } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, Timestamp, orderBy } from 'firebase/firestore';

// --- THE FIX ---
// We are changing "export default function" to "export const TodaysFoodLogList = () =>"
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
      });
  
      return () => unsubscribe();
    }, [user, authLoading]);

    if (isLoading) return <div className="text-center p-4"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;
    
    if (logs.length === 0) {
        return (
            <div className="text-center p-8 mt-8 border rounded-lg">
                <p className="text-muted-foreground">No meals logged for today yet.</p>
            </div>
        );
    }

    return (
        <Card className="mt-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-headline text-primary flex items-center">
              <ListChecks className="mr-2 h-6 w-6" />Today's Logged Meals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {logs.map((log) => (
                <li key={log.id} className="py-3 px-4 odd:bg-muted/30 even:bg-card rounded-md shadow-sm">
                    <p className="font-semibold">{log.foodItem} ({log.quantity})</p>
                    <p className="text-xs text-muted-foreground">
                        {log.calories.toFixed(0)} kcal &bull; P: {log.protein.toFixed(1)}g &bull; C: {log.carbs.toFixed(1)}g &bull; F: {log.fat.toFixed(1)}g
                    </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      );
};