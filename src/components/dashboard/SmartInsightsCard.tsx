'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getDashboardInsightsAction } from '@/actions/dashboard';
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
  const { user, userProfile, isPremium } = useAuth();
  const [insight, setInsight] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // The insight generation now runs automatically.
    const handleGenerateInsights = async () => {
      if (!userProfile || !user) {
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

        // Call the server action instead of calling Genkit directly.
        const idToken = await user.getIdToken();
        const result = await getDashboardInsightsAction(idToken, plainProfile, plainFoodLogs, timeOfDay);
        if ('error' in result && result.error) {
          throw new Error(result.error);
        }
        if (result.success && result.insights) {
          setInsight(result.insights);
        }
      } catch (e: any) {
        console.error("Error generating smart insight:", e);
        setError("Couldn't get your insight right now. Let's focus on the plan.");
      } finally {
        setIsLoading(false);
      }
    };

    handleGenerateInsights();
  }, [user, userProfile, foodLogs, isPremium]);

  return (
    <Card className="h-auto lg:h-full flex flex-col relative overflow-hidden group bg-card/40 backdrop-blur-xl border-border/50">
      <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <CardHeader className="relative z-10">
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="flex items-center text-sm font-headline tracking-wide uppercase text-muted-foreground">
                    <Sparkles className="h-5 w-5 mr-2 text-primary drop-shadow-[0_0_8px_rgba(13,242,89,0.5)]" />
                    Coach Ath's Smart Insights
                </CardTitle>
                <CardDescription className="text-xs pt-1 text-muted-foreground/80">Your AI-powered daily brief.</CardDescription>
            </div>
            {!isPremium && <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-full uppercase tracking-wider">Premium</span>}
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex items-center justify-center relative z-10">
        {isPremium ? (
            <>
              {isLoading && (
                <div className="space-y-3 w-full">
                  <Skeleton className="h-3 w-full bg-muted/50" />
                  <Skeleton className="h-3 w-5/6 bg-muted/50" />
                  <Skeleton className="h-3 w-3/4 bg-muted/50" />
                </div>
              )}
              {error && <p className="text-sm text-destructive text-center font-medium">{error}</p>}
              {!isLoading && insight && (
                <p className="text-sm text-center text-foreground font-medium leading-relaxed italic">"{insight}"</p>
              )}
            </>
        ) : (
            <UpgradePrompt 
                featureName="Smart Insights"
                message="Unlock personalized AI insights from Coach Ath to analyze your trends, get motivation, and receive actionable advice. Upgrade to Premium to get your daily brief."
                flat={true}
            />
        )}
      </CardContent>
    </Card>
  );
};
