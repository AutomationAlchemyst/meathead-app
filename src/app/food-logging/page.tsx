'use client';

import AppLayout from '@/components/layout/AppLayout';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';

// --- THE FIX ---
// We now use named imports for all components on this page.
import { QuickAddFood } from '@/components/food-logging/QuickAddFood';
import { FoodLogForm } from '@/components/food-logging/FoodLogForm';
import { TodaysFoodLogList } from '@/components/food-logging/TodaysFoodLogList';

export default function FoodLoggingPage() {
  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold font-headline">AI Food Logger</h1>
            <p className="text-lg text-muted-foreground mt-2">
              Describe your meals in plain English, and let Coach Ath handle the macros.
            </p>
          </div>
          
          <div className="mb-8">
            <QuickAddFood />
          </div>

          <Separator className="my-8" />

          <FoodLogForm />
          
          <TodaysFoodLogList />
        </div>
      </div>
    </AppLayout>
  );
}