'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { Scale, TrendingUp, TrendingDown, Minus, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
// We need the form component to place inside the modal
import WeightLogForm from '@/components/weight-tracking/WeightLogForm';


export const CurrentWeightCard = () => {
  const { userProfile, loading } = useAuth();
  // State to control the modal's visibility
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (loading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-2">
            <Skeleton className="h-5 w-1/2" />
        </CardHeader>
        <CardContent className="flex-grow">
          <Skeleton className="h-10 w-3/4 mb-1" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
        <CardFooter>
            <Skeleton className="h-9 w-full" />
        </CardFooter>
      </Card>
    );
  }

  const currentWeight = userProfile?.currentWeight;
  const startingWeight = userProfile?.startingWeight;
  let weightChange = 0;
  if (typeof startingWeight === 'number' && typeof currentWeight === 'number') {
    weightChange = currentWeight - startingWeight;
  }

  const getTrendIcon = () => {
    if (weightChange < 0) return <TrendingDown className="h-4 w-4 text-green-500" />;
    if (weightChange > 0) return <TrendingUp className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    // The Dialog component wraps the card and controls the modal
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <Card className="h-full flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="pb-2">
                <div className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-base font-semibold">Current Weight</CardTitle>
                    <Scale className="h-6 w-6 text-primary" />
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
                {currentWeight !== null && currentWeight !== undefined ? (
                <>
                    <div className="text-4xl font-bold">{currentWeight.toFixed(1)}<span className="text-2xl text-muted-foreground">kg</span></div>
                    <div className="text-xs text-muted-foreground pt-1 flex items-center">
                        {getTrendIcon()}
                        <span className="ml-1">
                            {weightChange.toFixed(1)}kg from start ({startingWeight?.toFixed(1) ?? 'N/A'}kg)
                        </span>
                    </div>
                </>
                ) : (
                <div className="text-center py-4 flex flex-col justify-center items-center h-full">
                    <p className="text-muted-foreground">No weight logged yet.</p>
                </div>
                )}
            </CardContent>
            <CardFooter>
                {/* This button will trigger the modal to open */}
                <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Log Today's Weight
                    </Button>
                </DialogTrigger>
            </CardFooter>
        </Card>

        {/* This is the content that will appear inside the modal */}
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Log Today's Weight</DialogTitle>
                <DialogDescription>
                    Enter your current weight. This will update the value on your dashboard.
                </DialogDescription>
            </DialogHeader>
            {/* We render the existing form, passing a function to close the modal on success */}
            <WeightLogForm onLogSuccess={() => setIsModalOpen(false)} />
        </DialogContent>
    </Dialog>
  );
};