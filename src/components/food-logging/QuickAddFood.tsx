'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { updateUserStreakClientSide } from '@/lib/streakUtils';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { Coffee, Egg, Leaf, Loader2 } from 'lucide-react';
// NEW: Import our haptic feedback utility.
import { triggerHapticFeedback } from '@/lib/haptics';

const quickAddItems = [
  { name: 'Black Coffee (1 cup)', icon: Coffee, macros: { calories: 2, protein: 0.3, carbs: 0, fat: 0 } },
  { name: '2 Scrambled Eggs', icon: Egg, macros: { calories: 182, protein: 12, carbs: 2, fat: 14 } },
  { name: 'Avocado (1 whole)', icon: Leaf, macros: { calories: 240, protein: 3, carbs: 13, fat: 22 } },
];

export const QuickAddFood = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loggingItem, setLoggingItem] = useState<string | null>(null);

  const handleQuickAdd = async (item: typeof quickAddItems[0]) => {
    // NEW: Trigger haptic feedback immediately on tap for a responsive feel.
    triggerHapticFeedback();

    if (!user) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    setLoggingItem(item.name);
    try {
      const newLog = {
        userId: user.uid,
        foodItem: item.name,
        quantity: '1 serving',
        calories: item.macros.calories,
        protein: item.macros.protein,
        carbs: item.macros.carbs,
        fat: item.macros.fat,
        loggedAt: Timestamp.now(),
      };
      await addDoc(collection(db, 'users', user.uid, 'foodLogs'), newLog);
      await updateUserStreakClientSide(user.uid);
      toast({ title: "Item Logged!", description: `${item.name} has been added to your log.` });
    } catch (error: any) {
      toast({ title: "Logging Failed", description: error.message, variant: "destructive" });
    } finally {
      setLoggingItem(null);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Quick Add</CardTitle>
        <CardDescription>Log your common food items with a single click.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {quickAddItems.map((item) => {
          const Icon = item.icon;
          const isLoggingThis = loggingItem === item.name;
          return (
            <Button
              key={item.name}
              variant="outline"
              className="h-auto py-3"
              onClick={() => handleQuickAdd(item)}
              disabled={isLoggingThis || !user}
            >
              {isLoggingThis ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Icon className="h-4 w-4 mr-2 text-primary" />}
              {item.name}
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
};