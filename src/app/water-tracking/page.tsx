
import AppLayout from '@/components/layout/AppLayout';
import WaterLogForm from '@/components/water-tracking/WaterLogForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Droplet } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import TodaysWaterLogsList from '@/components/water-tracking/TodaysWaterLogsList'; // Import the new component

export default function WaterTrackingPage() {
  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4">
        <Card className="max-w-lg mx-auto shadow-lg mb-8">
          <CardHeader className="text-center">
            <Droplet className="mx-auto h-12 w-12 text-primary mb-2" />
            <CardTitle className="text-2xl font-headline">Log Your Water Intake</CardTitle>
            <CardDescription>Stay hydrated! Record how much water you've drunk.</CardDescription>
          </CardHeader>
          <CardContent>
            <WaterLogForm />
          </CardContent>
        </Card>
        
        {/* Display today's logged water entries */}
        <div className="max-w-lg mx-auto">
          <TodaysWaterLogsList />
        </div>
      </div>
    </AppLayout>
  );
}
