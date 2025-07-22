'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Droplet, Edit3 } from 'lucide-react';

// --- THE FIX: PART 1 ---
// We bring back the necessary client-side Firebase tools for writing data.
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
// We import our new CLIENT-SIDE streak utility.
import { updateUserStreakClientSide } from '@/lib/streakUtils';


const waterLogSchema = z.object({
  amount: z.coerce.number({invalid_type_error: "Please enter a valid number for the amount."})
    .positive({ message: 'Amount must be a positive number (e.g., 1 or more).' })
    .min(1, { message: "Minimum amount is 1ml." }),
});

type WaterLogFormValues = z.infer<typeof waterLogSchema>;

const commonAmounts = [
    { label: 'Glass (250ml)', value: 250 },
    { label: 'Bottle (500ml)', value: 500 },
    { label: 'Large Bottle (750ml)', value: 750 },
    { label: 'Liter (1000ml)', value: 1000 },
];

export default function WaterLogForm() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<WaterLogFormValues>({
    resolver: zodResolver(waterLogSchema),
    defaultValues: {
      amount: undefined,
    },
  });

  // --- THE FIX: PART 2 ---
  // This onSubmit function now runs entirely on the client-side,
  // which means it's authenticated and allowed by our security rules.
  const onSubmit = async (data: WaterLogFormValues) => {
    if (!user) {
      toast({ title: 'Error', description: 'You must be logged in.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create the new water log object.
      const newWaterLog = {
        userId: user.uid,
        amount: data.amount,
        loggedAt: serverTimestamp(),
      };
      
      // 2. Write the data directly from the client. This is authenticated.
      await addDoc(collection(db, 'users', user.uid, 'waterLogs'), newWaterLog);

      // 3. After success, call our client-side streak utility. This is also authenticated.
      await updateUserStreakClientSide(user.uid);

      toast({ title: 'Water Logged!', description: `${data.amount}ml of water recorded.` });
      form.reset({ amount: undefined }); 
    } catch (error: any) {
      console.error("Error logging water:", error);
      toast({ title: 'Logging Failed', description: error.message || "Could not log water intake.", variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handlePresetClick = (amount: number) => {
    form.setValue('amount', amount, { shouldValidate: true });
    setTimeout(() => {
      form.handleSubmit(onSubmit)();
    }, 0);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {commonAmounts.map(item => (
            <Button 
                key={item.value} 
                variant="outline" 
                onClick={() => handlePresetClick(item.value)} 
                disabled={isSubmitting || authLoading}
                className="flex flex-col h-auto py-3 px-2 text-center"
            >
                <Droplet className="h-5 w-5 mb-1 text-primary"/>
                <span className="text-sm">{item.label.split('(')[0].trim()}</span>
                <span className="text-xs text-muted-foreground">({item.value}ml)</span>
            </Button>
        ))}
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="amount" className="flex items-center">
            <Edit3 className="mr-2 h-4 w-4 text-muted-foreground" />
            Or Enter Custom Amount (ml)
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="amount"
              type="number"
              step="any"
              min="1"
              {...form.register('amount')}
              placeholder="e.g., 300"
              disabled={isSubmitting || authLoading}
              className="flex-grow"
            />
             <Button type="submit" disabled={isSubmitting || authLoading} className="whitespace-nowrap">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                Log Custom
            </Button>
          </div>
          {form.formState.errors.amount && <p className="text-sm text-destructive mt-1">{form.formState.errors.amount.message}</p>}
        </div>
      </form>
    </div>
  );
}
