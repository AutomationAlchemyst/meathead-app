
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Weight } from 'lucide-react'; // Added Weight
import { db } from '@/lib/firebase'; 
import { collection, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore'; 
import { useRouter } from 'next/navigation'; 

const weightLogSchema = z.object({
  weight: z.preprocess(
    (val) => Number(val), 
    z.number().positive({ message: 'Weight must be a positive number.' }).min(1, {message: "Weight is required."})
  ),
});

type WeightLogFormValues = z.infer<typeof weightLogSchema>;

export default function WeightLogForm() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter(); 
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<WeightLogFormValues>({
    resolver: zodResolver(weightLogSchema),
    defaultValues: {
      weight: undefined, 
    },
  });

  const onSubmit = async (data: WeightLogFormValues) => {
    if (!user) {
      toast({ title: 'Error', description: 'You must be logged in.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    
    try {
      const newWeightLog = {
        userId: user.uid,
        weight: data.weight,
        loggedAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'users', user.uid, 'weightLogs'), newWeightLog);

      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        currentWeight: data.weight,
        updatedAt: serverTimestamp() 
      }, { merge: true }); 
      
      toast({ title: 'Weight Logged', description: `Your weight of ${data.weight}kg has been recorded.` });
      form.reset({ weight: undefined });
      router.refresh(); 

    } catch (error: any) {
      console.error("Error logging weight (client-side):", error);
      let errorMsg = error.message || "Failed to log weight.";
      if (error.code === 'permission-denied' || error.message?.includes('PERMISSION_DENIED') || error.message?.includes('Missing or insufficient permissions')) {
        errorMsg = "Saving failed: Insufficient permissions. Please check your Firestore security rules in the Firebase Console and ensure they allow writes to user profiles and weightLogs subcollections for authenticated users.";
      } else if (error.message?.includes("No document to update")) {
        errorMsg = "Could not update user profile as it was not found. Your weight has been logged, and a profile entry will be created/updated.";
      }
      toast({ title: 'Logging Issue', description: errorMsg, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="weight" className="flex items-center">
          <Weight className="mr-2 h-4 w-4 text-muted-foreground" />
          Current Weight (kg)
        </Label>
        <Input 
          id="weight" 
          type="number"
          step="0.1" 
          {...form.register('weight')} 
          placeholder="e.g., 70.5" 
          disabled={isSubmitting || authLoading}
        />
        {form.formState.errors.weight && <p className="text-sm text-destructive">{form.formState.errors.weight.message}</p>}
      </div>
      
      <Button type="submit" className="w-full" disabled={isSubmitting || authLoading}>
        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Log Weight
      </Button>
    </form>
  );
}
