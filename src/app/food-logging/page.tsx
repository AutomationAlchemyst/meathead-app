
import AppLayout from '@/components/layout/AppLayout';
import FoodLogForm from '@/components/food-logging/FoodLogForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Utensils } from 'lucide-react';
import TodaysFoodLogList from '@/components/food-logging/TodaysFoodLogList'; // Import the new component

export default function FoodLoggingPage() {
  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4">
        <Card className="max-w-2xl mx-auto shadow-lg mb-8">
          <CardHeader className="text-center">
            <Utensils className="mx-auto h-12 w-12 text-primary mb-2" />
            <CardTitle className="text-2xl font-headline">Log Your Meal</CardTitle>
            <CardDescription>Enter the details of your food item to track its macros.</CardDescription>
          </CardHeader>
          <CardContent>
            <FoodLogForm />
          </CardContent>
        </Card>
        
        {/* Display today's logged food items */}
        <div className="max-w-2xl mx-auto">
          <TodaysFoodLogList />
        </div>
      </div>
    </AppLayout>
  );
}
