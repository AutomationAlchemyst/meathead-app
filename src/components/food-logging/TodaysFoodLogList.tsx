
'use client';

import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { FoodLog } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, AlertCircle, ListChecks, Flame, Beef, Wheat, Droplets as FatIcon, Info, Edit2, Trash2, Save, X } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, Timestamp, orderBy } from 'firebase/firestore';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { useToast } from '@/hooks/use-toast';
import { updateFoodLog, deleteFoodLog } from '@/actions/food'; // Import server actions

interface FoodLogItemProps {
  log: FoodLog;
}

function FoodLogItem({ log }: FoodLogItemProps): ReactElement {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [editValues, setEditValues] = useState({
    foodItem: log.foodItem,
    quantity: log.quantity,
    calories: log.calories.toString(),
    protein: log.protein.toString(),
    carbs: log.carbs.toString(),
    fat: log.fat.toString(),
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditValues(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!user || !log.id) return;
    
    const formData = new FormData();
    formData.append('foodItem', editValues.foodItem);
    formData.append('quantity', editValues.quantity);
    formData.append('calories', editValues.calories);
    formData.append('protein', editValues.protein);
    formData.append('carbs', editValues.carbs);
    formData.append('fat', editValues.fat);

    setIsSaving(true);
    const result = await updateFoodLog(log.id, user.uid, formData);
    setIsSaving(false);

    if (result.success) {
      toast({ title: "Log Updated", description: `${editValues.foodItem} details saved.` });
      setIsEditing(false);
    } else {
      let errorMsg = "Could not update log.";
      if (typeof result.error === 'string') {
        errorMsg = result.error;
      } else if (result.error) {
        // Basic handling for Zod field errors object
        const fieldErrors = Object.values(result.error.fieldErrors || {}).flat().join(' ');
        if (fieldErrors) errorMsg = fieldErrors;
      }
      toast({ title: "Update Failed", description: errorMsg, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!user || !log.id) return;
    setIsDeleting(true);
    const result = await deleteFoodLog(log.id, user.uid);
    setIsDeleting(false); // Set to false regardless of outcome to re-enable button

    if (result.success) {
      toast({ title: "Log Deleted", description: `${log.foodItem} removed from your log.` });
      // onSnapshot will handle UI update
    } else {
      toast({ title: "Delete Failed", description: result.error || "Could not delete log.", variant: "destructive" });
    }
  };


  if (isEditing) {
    return (
      <li className="py-3 px-4 bg-card rounded-md shadow-md border border-primary space-y-3">
        <div className="space-y-1">
          <label htmlFor={`foodItem-${log.id}`} className="text-xs font-medium">Food Item</label>
          <Input id={`foodItem-${log.id}`} name="foodItem" value={editValues.foodItem} onChange={handleInputChange} className="h-8 text-sm" disabled={isSaving} />
        </div>
        <div className="space-y-1">
          <label htmlFor={`quantity-${log.id}`} className="text-xs font-medium">Quantity</label>
          <Input id={`quantity-${log.id}`} name="quantity" value={editValues.quantity} onChange={handleInputChange} className="h-8 text-sm" disabled={isSaving} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(['calories', 'protein', 'carbs', 'fat'] as const).map(macro => (
            <div key={macro} className="space-y-1">
              <label htmlFor={`${macro}-${log.id}`} className="text-xs font-medium capitalize">{macro}</label>
              <Input id={`${macro}-${log.id}`} name={macro} type="number" step="any" value={editValues[macro]} onChange={handleInputChange} className="h-8 text-sm" disabled={isSaving} />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={isSaving}>
            <X className="mr-1 h-4 w-4" />Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
            Save
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center pt-1">Note: Editing item/quantity does not automatically re-estimate macros in this version.</p>
      </li>
    );
  }

  return (
    <li className="py-3 px-4 odd:bg-muted/30 even:bg-card rounded-md shadow-sm hover:shadow-md transition-shadow group">
      <div className="flex justify-between items-start mb-1">
        <div>
          <span className="font-semibold text-foreground text-md">{log.foodItem}</span>
          <p className="text-sm text-muted-foreground">Quantity: {log.quantity}</p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <Button size="icon" variant="ghost" onClick={() => { setEditValues({ foodItem: log.foodItem, quantity: log.quantity, calories: log.calories.toString(), protein: log.protein.toString(), carbs: log.carbs.toString(), fat: log.fat.toString() }); setIsEditing(true);}} className="h-7 w-7">
            <Edit2 className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive/80" disabled={isDeleting}>
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Log: {log.foodItem}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. Are you sure you want to permanently delete this food log entry?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1 text-xs mb-1">
        <div className="flex items-center"><Flame className="h-3.5 w-3.5 mr-1 text-red-500" />Cal: {log.calories.toFixed(0)}</div>
        <div className="flex items-center"><Beef className="h-3.5 w-3.5 mr-1 text-green-500" />Prot: {log.protein.toFixed(1)}g</div>
        <div className="flex items-center"><Wheat className="h-3.5 w-3.5 mr-1 text-yellow-500" />Carb: {log.carbs.toFixed(1)}g</div>
        <div className="flex items-center"><FatIcon className="h-3.5 w-3.5 mr-1 text-blue-500" />Fat: {log.fat.toFixed(1)}g</div>
      </div>
      <p className="text-xs text-muted-foreground text-right">
            Logged: {log.loggedAt instanceof Timestamp ? format(log.loggedAt.toDate(), 'p') : 'N/A'}
      </p>
    </li>
  );
}

export default function TodaysFoodLogList(): ReactElement {
  const { user, loading: authLoading } = useAuth();
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) {
      setIsLoading(true);
      return;
    }

    if (!user) {
      setLogs([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const foodLogsRef = collection(db, 'users', user.uid, 'foodLogs');
    const q = query(
      foodLogsRef,
      where('loggedAt', '>=', Timestamp.fromDate(todayStart)),
      where('loggedAt', '<=', Timestamp.fromDate(todayEnd)),
      orderBy('loggedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedLogs: FoodLog[] = [];
      querySnapshot.forEach((doc) => {
        fetchedLogs.push({ id: doc.id, ...doc.data() } as FoodLog);
      });
      setLogs(fetchedLogs);
      setIsLoading(false);
    }, (err) => {
      console.error("Error fetching today's food logs:", err);
      setError(err.message || "Failed to load today's food logs.");
      setLogs([]);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading]);

  if (authLoading) {
    return (
      <Card className="mt-8">
        <CardHeader>
          <Skeleton className="h-6 w-1/2 mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-3 rounded-md border">
                <Skeleton className="h-5 w-3/5 mb-1" />
                <Skeleton className="h-4 w-2/5 mb-2" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (isLoading && user) {
     return (
       <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center"><ListChecks className="mr-2 h-6 w-6 text-primary" />Today's Logged Meals</CardTitle>
          <CardDescription>Review what you've eaten today.</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="mt-2 text-sm text-muted-foreground">Loading today's meals...</p>
        </CardContent>
       </Card>
    );
  }
  
  if (error) {
    return (
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center"><ListChecks className="mr-2 h-6 w-6 text-primary" />Today's Logged Meals</CardTitle>
        </CardHeader>
        <CardContent>
           <Alert variant="destructive">
            <AlertCircle className="h-5 w-5" />
            <AlertDescription>{error}</AlertDescription>
           </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
     return (
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center"><ListChecks className="mr-2 h-6 w-6 text-primary" />Today's Logged Meals</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6">
            <Info className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Please log in to see your logged meals.</p>
        </CardContent>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center"><ListChecks className="mr-2 h-6 w-6 text-primary" />Today's Logged Meals</CardTitle>
          <CardDescription>Review what you've eaten today.</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
            <ListChecks className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No meals logged for today yet.</p>
            <p className="text-sm text-muted-foreground">Use the form above to add your first meal!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-8 shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-headline text-primary flex items-center">
            <ListChecks className="mr-2 h-6 w-6" />Today's Logged Meals
        </CardTitle>
        <CardDescription>Here's what you've recorded for today. Most recent entries are shown first. Hover over an item to edit or delete.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {logs.map((log) => (
            <FoodLogItem key={log.id} log={log} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

