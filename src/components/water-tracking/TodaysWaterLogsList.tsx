
'use client';

import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { WaterLog } from '@/types';
// getTodaysWaterLogs server action is no longer directly used by this component for fetching.
// updateWaterLog and deleteWaterLog server actions are still used.
import { updateWaterLog, deleteWaterLog } from '@/actions/water';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Edit2, Trash2, Check, X, AlertCircle, Droplet, Save } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns'; // For date calculations
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/firebase'; // Import db for onSnapshot
import { collection, query, where, onSnapshot, Timestamp, orderBy } from 'firebase/firestore'; // Import onSnapshot and other Firestore functions

interface WaterLogItemProps {
  log: WaterLog;
  // onLogUpdated and onLogDeleted callbacks are no longer needed here as the list will be real-time
}

function WaterLogItem({ log }: WaterLogItemProps): ReactElement {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editAmount, setEditAmount] = useState(log.amount.toString());
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSave = async () => {
    if (!user || !log.id) return;
    const amountNum = parseFloat(editAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a positive number.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    // Server action still handles the update. Firestore rules ensure user can only update their own.
    const result = await updateWaterLog(log.id, user.uid, amountNum);
    if (result.success) {
      toast({ title: "Log Updated", description: `Water intake updated to ${amountNum}ml.` });
      setIsEditing(false);
      // No need to call onLogUpdated, onSnapshot will refresh the list
    } else {
      toast({ title: "Update Failed", description: typeof result.error === 'string' ? result.error : "Could not update log.", variant: "destructive" });
    }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!user || !log.id) return;
    setIsDeleting(true);
    // Server action still handles the delete.
    const result = await deleteWaterLog(log.id, user.uid);
    if (result.success) {
      toast({ title: "Log Deleted", description: "Water intake entry removed." });
      // No need to call onLogDeleted, onSnapshot will refresh the list
    } else {
      toast({ title: "Delete Failed", description: result.error || "Could not delete log.", variant: "destructive" });
    }
    setIsDeleting(false);
  };

  return (
    <li className="flex items-center justify-between py-3 px-4 odd:bg-muted/30 even:bg-card rounded-md shadow-sm hover:shadow-md transition-shadow">
      {isEditing ? (
        <div className="flex items-center gap-2 flex-grow">
          <Input
            type="number"
            value={editAmount}
            onChange={(e) => setEditAmount(e.target.value)}
            className="h-8 w-24 text-sm"
            disabled={isSaving}
            min="1"
          />
          <span className="text-sm text-muted-foreground">ml</span>
        </div>
      ) : (
        <div className="flex items-center">
          <Droplet className="h-5 w-5 text-primary mr-2" />
          <span className="font-medium text-foreground">{log.amount}ml</span>
          <span className="text-xs text-muted-foreground ml-2">
            (Logged: {log.loggedAt instanceof Timestamp ? format(log.loggedAt.toDate(), 'p') : 'N/A'})
          </span>
        </div>
      )}
      <div className="flex items-center gap-2">
        {isEditing ? (
          <>
            <Button size="icon" variant="ghost" onClick={handleSave} disabled={isSaving} className="h-8 w-8 text-green-500 hover:text-green-600">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setIsEditing(false)} disabled={isSaving} className="h-8 w-8 text-red-500 hover:text-red-600">
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <Button size="icon" variant="ghost" onClick={() => { setIsEditing(true); setEditAmount(log.amount.toString()); }} className="h-8 w-8 text-primary hover:text-primary/80">
              <Edit2 className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive/80" disabled={isDeleting}>
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete this water log entry.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    </li>
  );
}

export default function TodaysWaterLogsList(): ReactElement {
  const { user, loading: authLoading } = useAuth();
  const [logs, setLogs] = useState<WaterLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) {
      setIsLoading(true); // Keep loading if auth state is not resolved
      return;
    }

    if (!user) {
      setLogs([]);
      setIsLoading(false); // Not loading if no user
      setError(null);
      return;
    }

    setIsLoading(true); // Start loading when user is available
    setError(null);

    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const waterLogsRef = collection(db, 'users', user.uid, 'waterLogs');
    const q = query(
      waterLogsRef,
      where('loggedAt', '>=', Timestamp.fromDate(todayStart)),
      where('loggedAt', '<=', Timestamp.fromDate(todayEnd)),
      orderBy('loggedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedLogs: WaterLog[] = [];
      querySnapshot.forEach((doc) => {
        fetchedLogs.push({ id: doc.id, ...doc.data() } as WaterLog);
      });
      setLogs(fetchedLogs);
      setIsLoading(false);
    }, (err) => {
      console.error("Error fetching today's water logs with onSnapshot:", err);
      setError(err.message || "Failed to load today's water logs.");
      setLogs([]); // Clear logs on error
      setIsLoading(false);
    });

    // Cleanup listener on component unmount or when user/authLoading changes
    return () => unsubscribe();
  }, [user, authLoading]);


  if (authLoading) { // Initial auth loading state
    return (
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Today's Water Intake</CardTitle>
          <CardDescription>Review and manage your logged water for today.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)}
        </CardContent>
      </Card>
    );
  }
  
  if (isLoading && user) { // Loading logs for an authenticated user
     return (
       <Card className="mt-8">
        <CardHeader>
          <CardTitle>Today's Water Intake</CardTitle>
          <CardDescription>Review and manage your logged water for today.</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="mt-2 text-sm text-muted-foreground">Loading logs...</p>
        </CardContent>
       </Card>
    );
  }
  
  if (error) {
    return (
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Today's Water Intake</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <p className="mt-2 text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!user) { // No user logged in
     return (
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Today's Water Intake</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6">
            <Droplet className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Login to see your water logs.</p>
        </CardContent>
      </Card>
    );
  }

  if (logs.length === 0) { // User is logged in, no error, but no logs for today
    return (
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Today's Water Intake</CardTitle>
          <CardDescription>Review and manage your logged water for today.</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-6">
            <Droplet className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No water logged for today yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-8 shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-headline text-primary">Today's Water Log</CardTitle>
        <CardDescription>Review and manage your water intake for today. Most recent entries are shown first.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {logs.map((log) => (
            <WaterLogItem key={log.id} log={log} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
