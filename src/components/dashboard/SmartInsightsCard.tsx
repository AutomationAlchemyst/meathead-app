'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { generateDashboardInsights } from '@/ai/flows/generate-dashboard-insights-flow';
import { Sparkles, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import UpgradePrompt from '@/components/premium/UpgradePrompt';
import { Timestamp } from 'firebase/firestore';
import type { UserProfile, FoodLog } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

// Helper to get the current part of the day for contextual insights.
const getTimeOfDay = (): 'morning' | 'afternoon' | 'evening' => {
  const currentHour = new Date().getHours();
  if (currentHour < 12) return 'morning';
  if (currentHour < 18) return 'afternoon';
  return 'evening';
};

// Helper to convert Firestore Timestamps to ISO strings for the AI flow.
const convertTimestamps = (data: any) => {
  if (!data) return data;
  const plainObject: { [key: string]: any } = {};
  for (const key in data) {
    if (data[key] instanceof Timestamp) {
      plainObject[key] = data[key].toDate().toISOString();
    } else {
      plainObject[key] = data[key];
    }
  }
  return plainObject;
};

interface SmartInsightsCardProps {
  foodLogs: FoodLog[]; // We now receive food logs as a prop.
}

export const SmartInsightsCard = ({ foodLogs }: SmartInsightsCardProps) => {
  const { userProfile, isPremium } = useAuth();
  const [insight, setInsight] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // The insight generation now runs automatically.
    const handleGenerateInsights = async () => {
      if (!userProfile) {
        setIsLoading(false);
        return;
      }

      if (!isPremium) {
        // If not premium, we don't need to do anything else.
        setIsLoading(false);
        return;
      }
      
      if (!userProfile.currentWeight || !userProfile.activityLevel) {
        setInsight("Update your profile with your current weight and activity level to unlock personalized insights from Coach Ath.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      
      try {
        // Prepare the data with plain objects (timestamps converted to strings).
        const plainProfile = convertTimestamps(userProfile);
        const plainFoodLogs = foodLogs.map(log => convertTimestamps(log));
        const timeOfDay = getTimeOfDay();

        // Call the new, more intelligent AI flow.
        const result = await generateDashboardInsights(plainProfile, plainFoodLogs, timeOfDay);
        setInsight(result);
      } catch (e: any) {
        console.error("Error generating smart insight:", e);
        setError("Couldn't get your insight right now. Let's focus on the plan.");
      } finally {
        setIsLoading(false);
      }
    };

    handleGenerateInsights();
  }, [userProfile, foodLogs, isPremium]);

  return (
    <Card className="shadow-lg h-full flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="flex items-center text-primary">
                    <Sparkles className="h-6 w-6 mr-2" />
                    Coach Ath's Smart Insights
                </CardTitle>
                <CardDescription>Your AI-powered daily brief.</CardDescription>
            </div>
            {!isPremium && <span className="text-xs font-bold text-amber-500 bg-amber-100 px-2 py-1 rounded-full">Premium</span>}
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex items-center justify-center">
        {isPremium ? (
            <>
              {isLoading && (
                <div className="space-y-2 w-full">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              )}
              {error && <p className="text-sm text-destructive text-center">{error}</p>}
              {!isLoading && insight && (
                <p className="text-sm text-center text-muted-foreground italic">"{insight}"</p>
              )}
            </>
        ) : (
            <UpgradePrompt 
                featureName="Smart Insights"
                message="Unlock personalized AI insights from Coach Ath to analyze your trends, get motivation, and receive actionable advice. Upgrade to Premium to get your daily brief."
            />
        )}
      </CardContent>
    </Card>
  );
};
