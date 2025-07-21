
'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Droplet, Edit3 } from 'lucide-react'; // Added Edit3
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

const waterLogSchema = z.object({
  amount: z.coerce.number({invalid_type_error: "Please enter a valid number for the amount."}) // Attempts to convert input to number
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
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<WaterLogFormValues>({
    resolver: zodResolver(waterLogSchema),
    defaultValues: {
      amount: undefined,
    },
  });

  const logWaterAmount = async (amountToLog: number) => {
    if (!user) {
      toast({ title: 'Error', description: 'You must be logged in.', variant: 'destructive' });
      return;
    }
    // This client-side check is now primarily handled by Zod, but can remain as a safeguard.
    if (amountToLog <= 0) {
        toast({ title: 'Invalid Amount', description: 'Please enter a positive amount of at least 1ml.', variant: 'destructive' });
        return;
    }

    setIsSubmitting(true);
    try {
      const newWaterLog = {
        userId: user.uid,
        amount: amountToLog,
        loggedAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'users', user.uid, 'waterLogs'), newWaterLog);
      toast({ title: 'Water Logged!', description: `${amountToLog}ml of water recorded.` });
      form.reset({ amount: undefined }); 
      router.refresh(); 
    } catch (error: any) {
      console.error("Error logging water:", error);
      toast({ title: 'Logging Failed', description: error.message || "Could not log water intake.", variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = (data: WaterLogFormValues) => {
    logWaterAmount(data.amount);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {commonAmounts.map(item => (
            <Button 
                key={item.value} 
                variant="outline" 
                onClick={() => {
                    // Manually set and validate the value if a preset button is clicked.
                    form.setValue('amount', item.value, { shouldValidate: true });
                    // Directly call logWaterAmount if it passes validation, or let form submit handle it.
                    // For simplicity, we can trigger form submission which will validate.
                    form.handleSubmit(onSubmit)();
                }} 
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
              type="number" // Keep type="number" for numeric keyboard on mobile
              step="any" // Allow any decimal for more flexibility if desired, or keep step="50"
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
