
import AppLayout from '@/components/layout/AppLayout';
import WeightLogForm from '@/components/weight-tracking/WeightLogForm';
import WeightHistoryChart from '@/components/weight-tracking/WeightHistoryChart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Weight } from 'lucide-react';

export default function WeightTrackingPage() {
  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="grid gap-8 md:grid-cols-3">
          <Card className="md:col-span-1 shadow-lg">
            <CardHeader className="text-center">
              <Weight className="mx-auto h-12 w-12 text-primary mb-2" />
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
              {/* WeightHistoryChart will be a client component and fetch its own data */}
              <WeightHistoryChart />
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
