import AppLayout from '@/components/layout/AppLayout';
import WeightLogForm from '@/components/weight-tracking/WeightLogForm';
import WeightHistoryChart from '@/components/weight-tracking/WeightHistoryChart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// FIX: Imported 'Scale' to replace 'Weight' for consistency.
import { Scale } from 'lucide-react';

export default function WeightTrackingPage() {
  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="grid gap-8 md:grid-cols-3">
          <Card className="md:col-span-1 shadow-lg">
            <CardHeader className="text-center">
              {/* FIX: Replaced the 'Weight' (kettlebell) icon with the 'Scale' icon. */}
              <Scale className="mx-auto h-12 w-12 text-primary mb-2" />
              <CardTitle className="text-2xl font-headline">Log Your Weight</CardTitle>
              <CardDescription>Enter your current weight below.</CardDescription>
            </CardHeader>
            <CardContent>
              <WeightLogForm />
            </CardContent>
          </Card>

          <Card className="md:col-span-2 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl font-headline text-primary">Weight History</CardTitle>
              <CardDescription>Visualize your weight progress over time.</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px] md:h-auto">
              <WeightHistoryChart />
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}